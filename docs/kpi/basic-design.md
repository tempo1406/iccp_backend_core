# KPI Module — Basic Design (Nghiệp vụ)

> **Người đọc**: Product Owner, BA, Tech Lead  
> **Cập nhật**: 2026-04-07 (v2 — mở rộng point, thời gian làm việc, OT)

---

## 1. Bài toán

Hệ thống đã có đầy đủ dữ liệu về task, dự án, ticket nhưng **không có màn hình nào tổng hợp hiệu suất làm việc thực sự của từng người**. Đánh giá thủ công, không nhất quán.

Module KPI giải quyết bằng cách tự động tính hiệu suất theo **người**, theo **dự án**, theo **toàn org** — dựa trên **story point**, **thời gian làm việc thực tế** và **giờ OT**.

---

## 2. Đối tượng sử dụng

| Người dùng | Nhu cầu |
|---|---|
| **Nhân viên** | Xem KPI bản thân: task, điểm, giờ làm, OT qua các dự án |
| **Project Manager** | Xem KPI từng thành viên trong dự án theo điểm + thời gian |
| **Org Admin / HR** | Xem và xếp hạng toàn nhân sự; cấu hình giờ làm & ngày lễ |

---

## 3. Phạm vi dữ liệu

### 3.1 Dữ liệu đọc từ bảng hiện có

| Nguồn | Dùng để tính |
|---|---|
| **Tasks** | Số task, story point, estimated hours, trạng thái, deadline |
| **Projects** | Tiến độ, trạng thái, ngày kết thúc, tổng điểm |
| **Ticket Requests** (type=overtime, status=approved) | Giờ OT thực tế của từng thành viên |
| **Organization Members** | Danh sách nhân sự |

### 3.2 Thêm mới vào bảng Task (schema `project`)

Hai trường mới cần thêm vào bảng `project.tasks`:

| Trường | Kiểu | Người chỉnh sửa | Mô tả |
|---|---|---|---|
| `estimated_point` | `int` (nullable) | PM / Project Manager role | Điểm ước tính của task — do PM gán khi tạo hoặc chỉnh sửa |
| `estimated_hours` | `decimal(6,2)` (nullable) | PM / Project Manager role | Số giờ ước tính để hoàn thành task |

**Quy tắc chỉnh sửa**: Chỉ thành viên có role **Project Manager** trong dự án (hoặc Org Admin) mới được set/sửa hai trường này. Member thường không chỉnh được dù được assign task.

> Fallback: Task không có `estimated_point` → tính 1 point khi tổng hợp KPI.

### 3.3 Thêm mới vào bảng Project Member (schema `project`)

Một trường mới cần thêm vào bảng `project.project_members`:

| Trường | Kiểu | Người chỉnh sửa | Mô tả |
|---|---|---|---|
| `allocated_hours_per_day` | `decimal(4,2)` (nullable) | PM / Project Manager role | Số giờ mỗi ngày member được RA cho dự án này |

**Lý do**: Giờ làm chuẩn của org (8h/ngày) khác với thực tế RA trong dự án. Một member có thể làm 4h/ngày cho dự án A và 4h/ngày cho dự án B. KPI tính `expectedWorkingHours` trong dự án phải dùng giá trị này thay vì org-level config.

**Quy tắc**:
- **NULL** = không RA cụ thể → fallback về `org_working_time_configs` (giờ làm toàn thời gian)
- Chỉ **Project Manager** hoặc **Org Admin** mới được set/sửa trường này
- Giá trị hợp lệ: `0.5` đến `24.0` giờ/ngày
- Ngày lễ từ `org_holidays` vẫn được áp dụng (ghi đè allocation về 0 nếu `working_hours = 0`)

### 3.3 Bảng mới cần tạo (schema `tenant`)

#### Bảng 1: `tenant.org_working_time_configs`

Cấu hình số giờ làm chuẩn mỗi ngày trong tuần của tổ chức.

| Trường | Kiểu | Mô tả |
|---|---|---|
| `organization_id` | `uuid` (unique) | Mỗi org 1 dòng |
| `monday_hours` | `decimal(4,2)` | Giờ làm thứ Hai (default 8.0) |
| `tuesday_hours` | `decimal(4,2)` | Thứ Ba (default 8.0) |
| `wednesday_hours` | `decimal(4,2)` | Thứ Tư (default 8.0) |
| `thursday_hours` | `decimal(4,2)` | Thứ Năm (default 8.0) |
| `friday_hours` | `decimal(4,2)` | Thứ Sáu (default 8.0) |
| `saturday_hours` | `decimal(4,2)` | Thứ Bảy (default 0.0 — không đi làm) |
| `sunday_hours` | `decimal(4,2)` | Chủ Nhật (default 0.0) |

> Ví dụ: công ty cho phép làm T7 buổi sáng → `saturday_hours = 4.0`.

#### Bảng 2: `tenant.org_holidays`

Override ngày cụ thể (ngày lễ, tết, nghỉ bù...).

| Trường | Kiểu | Mô tả |
|---|---|---|
| `organization_id` | `uuid` | Org chủ sở hữu |
| `date` | `date` | Ngày cụ thể (YYYY-MM-DD), unique per org |
| `name` | `varchar(255)` | Tên: "Tết Nguyên Đán", "Giỗ Tổ Hùng Vương"... |
| `type` | `enum` | `national_holiday` / `company_holiday` / `special_day` |
| `working_hours` | `decimal(4,2)` | Số giờ làm trong ngày đó (0.0 = nghỉ toàn bộ, 4.0 = nghỉ nửa ngày) |

---

## 4. Hai nhóm KPI

### 4.1 KPI trong dự án (Project KPI)

Đánh giá thành viên **trong 1 dự án cụ thể** theo story point + giờ ước tính.

**Ai xem**: Bất kỳ thành viên active của dự án.

```
[Dự án X]
   ├── Tổng quan dự án       → tiến độ, tổng point, point hoàn thành, deadline, OT
   ├── Bảng KPI thành viên   → xếp hạng theo performanceScore
   └── Chi tiết 1 thành viên → point + giờ + OT + task gần nhất
```

---

### 4.2 KPI trong tổ chức (Org KPI)

Đánh giá nhân sự **aggregate qua tất cả dự án** + tính OT dựa trên config giờ làm.

**Ai xem**:
- Org Admin / HR: xem toàn bộ
- Nhân viên: chỉ xem của bản thân

```
[Tổ chức]
   ├── Dashboard tổng quan   → projects, tasks, point, tickets, OT
   ├── Bảng KPI nhân sự      → xếp hạng toàn nhân sự (phân trang)
   └── Chi tiết 1 nhân viên  → aggregate + by project + OT breakdown + tickets
```

### 4.3 Quản lý cấu hình (Working Time Config)

Org Admin cấu hình trước khi dùng KPI time-based:

```
[Cài đặt tổ chức]
   ├── Giờ làm theo tuần     → GET/PUT /v1/org-config/working-time
   └── Quản lý ngày lễ       → GET/POST/DELETE /v1/org-config/holidays
```

---

## 5. Các chỉ số KPI

### 5.1 Chỉ số task (đếm số lượng)

| Chỉ số | Ý nghĩa |
|---|---|
| `totalAssigned` | Tổng task được giao |
| `completedTasks` | Task hoàn thành (status = Done) |
| `openTasks` | Task chưa xong |
| `onTimeTasks` | Task done trước hoặc đúng deadline |
| `lateTasks` | Task done nhưng sau deadline |
| `overdueTasks` | Task chưa done mà đã qua deadline |
| `dueSoonTasks` | Task chưa done, deadline trong 24h tới |

---

### 5.2 Chỉ số point (ở cấp thành viên)

| Chỉ số | Cách tính | Ý nghĩa |
|---|---|---|
| `totalEstimatePoints` | SUM(estimatedPoint) task được giao | Tổng điểm ước tính được giao cho người đó |
| `totalActualPoints` | SUM(estimatedPoint) task **done** | Điểm thực sự đã hoàn thành (actual delivered) |
| `openPoints` | `totalEstimatePoints - totalActualPoints` | Điểm còn tồn đọng |
| `pointCompletionRate` | `totalActualPoints / totalEstimatePoints × 100` | % hoàn thành theo điểm |

> **Ghi chú**: "Actual point" ở đây là điểm ước tính của các task đã done — không phải điểm tracking riêng. Tức là khi task hoàn thành, `estimated_point` của nó được chuyển sang "actual delivered".  
> **Fallback**: Task không có `estimated_point` → tính 1 point.

---

### 5.3 Chỉ số point (ở cấp dự án)

| Chỉ số | Cách tính | Ý nghĩa |
|---|---|---|
| `projectTotalEstimatePoints` | SUM(estimatedPoint) TẤT CẢ task trong dự án | Tổng điểm kế hoạch của dự án |
| `projectTotalActualPoints` | SUM(estimatedPoint) của task **done** | Tổng điểm đã thực sự giao nộp |
| `projectOpenPoints` | `projectTotalEstimatePoints - projectTotalActualPoints` | Điểm còn tồn đọng chưa hoàn thành |
| `pointBasedProgress` | `projectTotalActualPoints / projectTotalEstimatePoints × 100` | Tiến độ thực tế theo điểm |
| `isPointComplete` | `pointBasedProgress >= 100` | Dự án đã hoàn tất toàn bộ khối lượng |

---

### 5.4 Chỉ số thời gian

| Chỉ số | Cách tính | Ý nghĩa |
|---|---|---|
| `totalEstimatedHours` | SUM(estimatedHours) của task được giao | Tổng giờ ước tính |
| `completedEstimatedHours` | SUM(estimatedHours) của task done | Giờ ước tính của việc đã xong |
| `expectedWorkingHours` | Dựa vào `allocatedHoursPerDay` (project member) → fallback `OrgWorkingTimeConfig` → trừ `OrgHoliday` | Giờ làm kỳ vọng trong kỳ |

> `expectedWorkingHours` chỉ tính được khi truyền `dateFrom` / `dateTo`. Nếu không có query param, bỏ qua trường này.
>
> **Ưu tiên tính `expectedWorkingHours` trong Project KPI**:
> 1. Nếu member có `allocatedHoursPerDay` → dùng giá trị đó × số ngày làm việc trong kỳ
> 2. Nếu null → dùng `org_working_time_configs` (giờ theo từng ngày trong tuần)
> 3. Ngày lễ từ `org_holidays` luôn được áp dụng (override về `working_hours` của ngày đó)

---

### 5.5 Chỉ số OT (từ Ticket Requests)

Dữ liệu lấy từ `ticket_requests` có `type = 'overtime'` và `status = 'approved'`, trường `ot_metadata.effortEntries`.

| Chỉ số | Cách tính | Ý nghĩa |
|---|---|---|
| `approvedOtTickets` | Số ticket OT được duyệt | Số lần làm OT |
| `totalOtHours` | SUM của `ot_metadata.totalActualHours` | Tổng giờ OT thực tế |
| `effectiveOtHours` | OT giờ × hệ số ngày | Giờ OT quy đổi theo trọng số ngày |

**Hệ số OT theo ngày** (dựa vào org_holidays + org_working_time_configs):

| Loại ngày | Hệ số |
|---|---|
| Ngày thường (Mon–Fri) | × 1.0 |
| Thứ Bảy | × 1.5 |
| Chủ Nhật | × 2.0 |
| Ngày lễ / nghỉ bù | × 3.0 |

---

### 5.6 Điểm hiệu suất tổng hợp (Performance Score)

**Trọng số là động** — lấy từ Project Settings, fallback về Org Settings, fallback về system default (50/30/20). Xem chi tiết tại [settings/basic-design.md](../settings/basic-design.md).

```
baseScore = ROUND(
  pointCompletionRate × W_point   +   -- W_point: trọng số điểm (default 50%)
  onTimeRate          × W_ontime  +   -- W_ontime: trọng số đúng hạn (default 30%)
  otContributionScore × W_ot          -- W_ot: trọng số OT (default 20%)
)
-- Ràng buộc: W_point + W_ontime + W_ot = 1.0
-- Nếu W_ot = 0: W_point và W_ontime được re-normalize tự động
```

**otContributionScore** = MIN(100, effectiveOtHours / expectedWorkingHours × 100)  
→ Nếu member không có OT hoặc org chưa config working time → `otContributionScore = 0`.

**Bonus points** (nếu bật trong settings):
```
finalScore = MIN(100, baseScore + bonusPoints)

bonusPoints = MIN(bonusMaxCap,
  onTimeTasks  × bonusOnTimeTask  +
  earlyTasks   × bonusEarlyTask   +   -- done trước deadline X giờ
  (zeroOverdue ? bonusZeroOverdue : 0) +
  effectiveOtHours × bonusOtPerEffectiveHour
)
```

> Tất cả giá trị bonus cũng được cấu hình động tại Project/Org Settings.

---

### 5.7 Mức hoàn thành dự án (Project Completion)

Dự án được coi là **hoàn thành thực sự** khi đáp ứng cả hai điều kiện:
1. `status = 'completed'` (PM/Org Admin đặt thủ công), **VÀ**
2. `pointBasedProgress >= 100%` (toàn bộ estimated point đã được deliver)

→ Xem định nghĩa `projectTotalEstimatePoints` và `projectTotalActualPoints` tại mục 5.3.

---

## 6. Luồng hoạt động

### 6.1 Setup (Org Admin — làm 1 lần)

```
1. Org Admin vào Settings → Working Time
2. Điền số giờ làm mỗi ngày trong tuần
   VD: Mon–Fri: 8h, Sat: 4h, Sun: 0h
3. Thêm ngày lễ: "30/04", "01/05", "02/09"...
4. Lưu → API PUT /v1/org-config/working-time
         API POST /v1/org-config/holidays
```

### 6.2 PM tạo task với story point

```
1. PM tạo task hoặc chỉnh sửa task hiện có
2. Điền thêm 2 trường mới:
   - Story Point: 5 (độ phức tạp)
   - Estimated Hours: 4.0 (giờ ước tính)
3. Giao cho member
```

### 6.3 Xem KPI dự án (PM / Member)

```
1. Mở tab KPI trong dự án
2. API GET /v1/projects/{id}/kpi/overview
   → Tiến độ, tổng point, % hoàn thành điểm, deadline
3. API GET /v1/projects/{id}/kpi/members
   → Bảng xếp hạng: performanceScore, points, giờ, OT
4. Click vào 1 thành viên
   → API GET /v1/projects/{id}/kpi/members/{userId}
   → Chi tiết: point + giờ + OT breakdown + 5 task gần nhất
```

### 6.4 Xem KPI toàn org (Org Admin / HR)

```
1. Vào trang Analytics → KPI
2. API GET /v1/kpi/overview
   → Tổng quan: members, projects, points, OT
3. API GET /v1/kpi/members?page=1&limit=20
   → Bảng xếp hạng toàn nhân sự
4. Click vào nhân viên
   → API GET /v1/kpi/members/{userId}
   → Aggregate + breakdown by project + OT + tickets
```

### 6.5 Nhân viên tự xem KPI

```
1. Nhân viên vào trang "KPI của tôi"
2. API GET /v1/kpi/members/{myUserId}
   → Không cần quyền admin, server tự allow khi userId = currentUser
```

---

## 7. Quy tắc phân quyền

### 7.1 Xem KPI

| Hành động | Điều kiện |
|---|---|
| Xem KPI dự án (overview + members list) | Phải có role **Project Manager** trong dự án, **hoặc** Org Admin |
| Xem KPI chi tiết 1 thành viên trong dự án | Phải có role **Project Manager** trong dự án, **hoặc** Org Admin |
| Xem KPI toàn org (overview + members list) | Cần quyền `analytics.kpi.org.view` — chỉ Org Admin |
| Xem KPI chi tiết 1 người (org level) | Org Admin **hoặc** chính người đó |

> **Lý do siết lại**: KPI chứa thông tin nhạy cảm về hiệu suất cá nhân — không phải mọi member đều nên thấy điểm của nhau.

### 7.2 Chỉnh sửa điểm task

| Hành động | Điều kiện |
|---|---|
| Set/sửa `estimated_point` trên task | Role **Project Manager** trong dự án, **hoặc** Org Admin |
| Set/sửa `estimated_hours` trên task | Role **Project Manager** trong dự án, **hoặc** Org Admin |
| Xem `estimated_point` của task | Mọi thành viên active trong dự án (chỉ đọc) |

### 7.4 Cấu hình giờ RA thành viên dự án

| Hành động | Điều kiện |
|---|---|
| Xem `allocatedHoursPerDay` của member trong dự án | Mọi thành viên active của dự án (chỉ đọc) |
| Set/sửa `allocatedHoursPerDay` cho member | Role **Project Manager** trong dự án, **hoặc** Org Admin |

### 7.3 Cấu hình tổ chức

| Hành động | Điều kiện |
|---|---|
| Xem config giờ làm / ngày lễ | Cần quyền `org_config.working_time.view` |
| Sửa config giờ làm / thêm xoá ngày lễ | Cần quyền `org_config.working_time.manage` — chỉ Org Admin |

---

## 8. Quy tắc nghiệp vụ

1. **Leaf task only**: Chỉ tính task không có subtask con — tránh đếm trùng.
2. **Done detection**: Status `ILIKE 'done'` trong cùng dự án.
3. **Point fallback**: Task không có `estimated_point` → coi là 1 point khi tổng hợp KPI.
4. **Point do PM set**: Chỉ Project Manager role hoặc Org Admin mới được set/sửa `estimated_point` và `estimated_hours` trên task.
5. **Actual = delivered estimate**: `totalActualPoints` của 1 người = tổng `estimated_point` của task done được giao cho người đó. Không có field "actual_point" riêng trên task.
6. **Project total estimate/actual**: `projectTotalEstimatePoints` = SUM tất cả task trong project; `projectTotalActualPoints` = SUM task done; `projectOpenPoints` = hiệu của hai giá trị trên.
14. **Allocated hours per day**: PM set `allocatedHoursPerDay` cho từng member trong dự án. Giá trị này được ưu tiên hơn `org_working_time_configs` khi tính `expectedWorkingHours` trong Project KPI. Nếu null → dùng org config. Ngày lễ vẫn override cả hai.
7. **OT chỉ từ approved tickets**: Chỉ lấy `ticket_requests` có `type = 'overtime'` và `status = 'approved'`.
8. **OT hệ số ngày**: Tính từ `ot_metadata.effortEntries[].date` kết hợp `org_holidays` + ngày trong tuần.
9. **Working time fallback**: Org chưa config → dùng mặc định Mon–Fri = 8h, Sat = 0h, Sun = 0h.
10. **Holiday override**: Ngày trong `org_holidays` ghi đè `working_time_config` ngày đó.
11. **Ticket scope**: Chỉ tính ticket mà user là `requester_id`.
12. **Nhân viên rời dự án**: Task đã assign trước vẫn giữ trong lịch sử KPI.
13. **Dữ liệu real-time**: Tính lại mỗi lần xem, không cache.

---

## 9. Danh sách API

### Project KPI

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/v1/projects/:id/kpi/overview` | Tổng quan dự án (point, giờ, OT, tiến độ) |
| GET | `/v1/projects/:id/kpi/members` | KPI tất cả thành viên (xếp hạng) |
| GET | `/v1/projects/:id/kpi/members/:userId` | KPI chi tiết 1 thành viên |

### Org KPI

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/v1/kpi/overview` | Dashboard tổng org |
| GET | `/v1/kpi/members` | KPI toàn nhân sự (phân trang) |
| GET | `/v1/kpi/members/:userId` | KPI chi tiết 1 nhân viên (by project + OT + tickets) |

### Working Time Config (module riêng, dưới Organization)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/v1/org-config/working-time` | Lấy config giờ làm hiện tại của org |
| PUT | `/v1/org-config/working-time` | Cập nhật giờ làm theo ngày trong tuần |
| GET | `/v1/org-config/holidays` | Danh sách ngày lễ của org |
| POST | `/v1/org-config/holidays` | Thêm ngày lễ |
| DELETE | `/v1/org-config/holidays/:id` | Xoá ngày lễ |

---

## 10. Câu hỏi mở (cần xác nhận trước khi implement)

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| 1 | System default weights 50/30/20 có phù hợp chưa, hay cần điều chỉnh lại? | 50/30/20 |
| 2 | Hệ số OT: weekday×1.0, Sat×1.5, Sun×2.0, holiday×3.0 có đúng không? (Cấu hình được qua Org Settings) | Đề xuất trên |
| 3 | Khi org chưa setup working-time config, có hiển thị KPI time-based không? | Dùng default 8h Mon–Fri |
| 4 | `recentTasks` giới hạn mấy task? | 5 |
| 5 | Bonus có bật mặc định không, hay PM phải tự bật? | Tắt mặc định — PM bật khi cần |
| 6 | Project completion: cần cả `status=completed` + `pointBasedProgress=100%` hay chỉ cần 1 trong 2? | Cần cả hai |
| 7 | Task không có `estimated_point` fallback về 1 — ổn không hay skip (không tính vào point metrics)? | Fallback 1 point |
| 8 | Nhân viên tự xem KPI của mình ở org level có cho phép không? | Có |
| 9 | `earlyTasks` (hoàn thành trước deadline) cần bao nhiêu giờ sớm để tính? (cấu hình qua `bonusEarlyTaskHours`) | 24h |
