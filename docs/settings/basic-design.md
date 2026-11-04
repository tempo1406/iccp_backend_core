# Settings Module — Basic Design (Nghiệp vụ)

> **Người đọc**: Product Owner, BA, Tech Lead  
> **Cập nhật**: 2026-04-07

---

## 1. Bài toán

Hệ thống hiện tại thiếu lớp cấu hình ở cả **cấp dự án** lẫn **cấp tổ chức**:

- Công thức tính KPI bị hardcode, không thể điều chỉnh theo đặc thù từng dự án / từng công ty
- Không có cách cấu hình lịch họp (daily, weekly) và gửi nhắc nhở tự động
- Trọng số OT, bonus điểm hoàn thành đúng hạn không thể tuỳ biến
- Org chỉ có cấu hình giờ làm (working-time), không có cấu hình tổng thể hơn

Module **Settings** giải quyết bằng cách cung cấp lớp config 2 tầng:

```
[Org Config]           ← giá trị mặc định của toàn tổ chức
    ↓ (fallback nếu project chưa tự config)
[Project Config]       ← override cho từng dự án cụ thể
    ↓ (dùng khi tính KPI, gửi noti, tính điểm...)
[Runtime logic]
```

---

## 2. Hai nhóm cấu hình

### 2.1 Project Settings (cấu hình cấp dự án)

**Ai chỉnh**: Project Manager (PM role) hoặc Org Admin  
**Phạm vi**: Áp dụng riêng cho 1 dự án

| Nhóm | Cấu hình |
|---|---|
| **Meeting** | Lịch daily standup, weekly review, thời gian, kênh thông báo |
| **Reminder** | Nhắc nhở trước deadline, kênh gửi (push / email / in-app) |
| **Point Scale** | Thang điểm task (Fibonacci, tuyến tính, custom), điểm tối đa/task |
| **KPI Weights** | Trọng số công thức performanceScore (override org default) |
| **Bonus Rules** | Điểm thưởng khi hoàn thành đúng/trước hạn, không có task quá hạn |

---

### 2.2 Org Settings (cấu hình cấp tổ chức)

**Ai chỉnh**: Org Admin  
**Phạm vi**: Áp dụng cho toàn tổ chức, đặc biệt là giá trị mặc định cho các project chưa tự config

| Nhóm | Cấu hình |
|---|---|
| **Default KPI Weights** | Trọng số mặc định dùng khi project chưa override |
| **OT Multipliers** | Hệ số giờ OT theo loại ngày (weekday, Sat, Sun, holiday) |
| **KPI Digest** | Lịch gửi báo cáo KPI hàng tuần (ngày, giờ, đối tượng nhận) |
| **Bonus Global Rules** | Điểm thưởng mặc định, có thể override tại project |
| **Notification Channels** | Kênh mặc định cho toàn org (push / email / cả hai) |

---

## 3. Chi tiết từng nhóm cấu hình

### 3.1 Meeting Config (Project)

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `dailyEnabled` | bool | Bật/tắt daily standup |
| `dailyTime` | `HH:MM` | Giờ daily (VD: "09:00") |
| `dailyDays` | int[] | Các thứ tổ chức daily (1=Mon,...,5=Fri) |
| `dailyReminderMinutes` | int | Nhắc trước daily bao nhiêu phút (VD: 15) |
| `weeklyEnabled` | bool | Bật/tắt weekly review |
| `weeklyDay` | int | Thứ tổ chức weekly (1=Mon,...,7=Sun) |
| `weeklyTime` | `HH:MM` | Giờ weekly |
| `weeklyReminderMinutes` | int | Nhắc trước weekly bao nhiêu phút |

---

### 3.2 Reminder Config (Project)

Nhắc nhở trước deadline của task:

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `taskDueReminderEnabled` | bool | Bật/tắt nhắc deadline |
| `taskDueReminderHours` | int[] | Nhắc trước bao nhiêu giờ (VD: [24, 2]) — gửi 2 lần |
| `reminderChannels` | enum[] | `push_notification`, `email`, `in_app` |
| `overdueEscalationEnabled` | bool | Tự động leo thang (notify PM) khi task quá hạn |
| `overdueEscalationAfterHours` | int | Sau bao nhiêu giờ quá hạn thì leo thang |

---

### 3.3 Point Scale Config (Project)

Quy định cách PM gán điểm cho task:

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `pointScaleType` | enum | `fibonacci` / `linear` / `custom` |
| `pointScaleValues` | int[] | Danh sách giá trị hợp lệ |
| `maxPointPerTask` | int | Điểm tối đa 1 task (VD: 13 theo Fibonacci) |

**Ví dụ mỗi loại scale:**

| Loại | Giá trị hợp lệ |
|---|---|
| `fibonacci` | 1, 2, 3, 5, 8, 13, 21 |
| `linear` | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| `custom` | Tự định nghĩa trong `pointScaleValues` |

> **Validation**: Khi PM set `estimated_point` cho task, hệ thống validate giá trị phải thuộc `pointScaleValues`. Nếu `pointScaleType = null` (chưa config), bỏ qua validate — PM nhập tự do.

---

### 3.4 KPI Weights Config (Project & Org)

Trọng số công thức tính `performanceScore`. **Tổng phải = 1.0**.

| Tham số | Mô tả | Default |
|---|---|---|
| `weightPointCompletion` | Trọng số % điểm hoàn thành | 0.50 |
| `weightOnTime` | Trọng số tỷ lệ đúng hẹn | 0.30 |
| `weightOtContribution` | Trọng số đóng góp OT | 0.20 |

**Công thức:**
```
performanceScore =
  pointCompletionRate × weightPointCompletion +
  onTimeRate          × weightOnTime          +
  otContributionScore × weightOtContribution
```

Nếu `weightOtContribution = 0` (không tính OT):
```
performanceScore =
  pointCompletionRate × weightPointCompletion/(1 - weightOtContribution) +
  onTimeRate          × weightOnTime/(1 - weightOtContribution)
```
→ Tự động re-normalize để tổng vẫn = 1.

**Fallback:**
```
Project không có config → dùng Org default weights
Org không có config     → dùng system default (0.5 / 0.3 / 0.2)
```

---

### 3.5 Bonus Rules Config (Project & Org)

Điểm thưởng cộng thêm vào `performanceScore` (sau khi tính xong công thức chính):

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `bonusEnabled` | bool | Bật/tắt toàn bộ hệ thống bonus |
| `bonusOnTimeTask` | decimal | Điểm cộng mỗi task done đúng hạn (VD: 0.5) |
| `bonusEarlyTaskHours` | int | Hoàn thành trước deadline X giờ → early bonus |
| `bonusEarlyTask` | decimal | Điểm cộng cho early completion (VD: 1.0) |
| `bonusZeroOverdue` | decimal | Bonus nếu member không có task quá hạn trong kỳ |
| `bonusMaxCap` | decimal | Trần tổng điểm bonus được cộng (VD: 10.0 điểm) |
| `bonusOtPerEffectiveHour` | decimal | Điểm cộng mỗi giờ OT effective (VD: 0.2) |

**Công thức tổng cuối:**
```
finalScore = MIN(100, performanceScore + totalBonusPoints)

totalBonusPoints = MIN(bonusMaxCap,
  onTimeTasks × bonusOnTimeTask +
  earlyTasks  × bonusEarlyTask  +
  (zeroOverdue ? bonusZeroOverdue : 0) +
  effectiveOtHours × bonusOtPerEffectiveHour
)
```

---

### 3.6 OT Multipliers (Org)

Hệ số nhân giờ OT theo loại ngày — dùng để tính `effectiveOtHours`:

| Tham số | Default | Mô tả |
|---|---|---|
| `otMultiplierWeekday` | 1.0 | Ngày thường (Mon–Fri, giờ ngoài ca) |
| `otMultiplierSaturday` | 1.5 | Thứ Bảy |
| `otMultiplierSunday` | 2.0 | Chủ Nhật |
| `otMultiplierHoliday` | 3.0 | Ngày lễ / nghỉ bù |

---

### 3.7 KPI Digest (Org)

Báo cáo KPI tổng hợp gửi tự động định kỳ:

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `digestEnabled` | bool | Bật/tắt gửi digest |
| `digestDay` | int | Thứ gửi (1=Mon,...,7=Sun) |
| `digestTime` | `HH:MM` | Giờ gửi |
| `digestRecipients` | enum[] | `org_admin`, `project_managers`, `all_members` |
| `digestChannels` | enum[] | `email`, `in_app` |

---

## 4. Luồng hoạt động

### 4.1 PM cấu hình dự án

```
1. PM vào Settings → Project Settings
2. Kéo xuống các nhóm: Meeting, Reminder, Point Scale, KPI, Bonus
3. Điều chỉnh từng tham số
4. Nếu để trống KPI Weights → hệ thống dùng giá trị Org default
5. Lưu → PUT /v1/projects/{id}/settings
```

### 4.2 Org Admin cấu hình tổ chức

```
1. Org Admin vào Settings → Organization Settings
2. Cấu hình: Default KPI Weights, OT Multipliers, Digest, Bonus defaults
3. Lưu → PUT /v1/org-config/settings
4. Các project chưa tự config sẽ tự động dùng giá trị này
```

### 4.3 Hệ thống tính performanceScore (tại runtime)

```
1. Lấy project config → nếu null → lấy org config → nếu null → dùng system default
2. Tính base score: pointRate × W1 + onTimeRate × W2 + otScore × W3
3. Nếu W3 = 0 → re-normalize W1, W2
4. Tính bonus: onTimeTasks × b1 + earlyTasks × b2 + zeroOverdue × b3 + ...
5. Cap bonus theo bonusMaxCap
6. finalScore = MIN(100, baseScore + bonus)
```

### 4.4 Gửi nhắc deadline task (Scheduler)

```
Mỗi 15 phút: scheduler quét task sắp đến deadline
→ Với mỗi task: check project.settings.taskDueReminderHours
→ Nếu deadline - now ∈ reminderHours → gửi notification theo reminderChannels
→ Nếu task quá hạn > overdueEscalationAfterHours → notify PM thêm
```

### 4.5 Gửi KPI Digest (Scheduler)

```
Mỗi ngày: check org.settings.digestDay + digestTime
→ Nếu đúng lịch → tổng hợp KPI tất cả thành viên trong kỳ
→ Gửi theo digestChannels đến digestRecipients
```

---

## 5. Quy tắc phân quyền

| Hành động | Điều kiện |
|---|---|
| Xem project settings | Thành viên active của project |
| Sửa project settings | PM role trong project hoặc Org Admin |
| Xem org settings | Org Admin |
| Sửa org settings | Org Admin |
| Reset project settings về org default | PM role hoặc Org Admin |

---

## 6. Quy tắc nghiệp vụ

1. **Tổng trọng số = 1.0**: `weightPointCompletion + weightOnTime + weightOtContribution` phải = 1.0. Server validate, reject nếu sai.
2. **Re-normalize tự động**: Nếu `weightOtContribution = 0` (tắt OT factor), hệ thống tự chia lại 2 weight còn lại theo tỷ lệ tương đối.
3. **Project inherits từ Org**: Nếu project chưa set KPI weights hoặc bonus rules → tự động dùng org config.
4. **Bonus không thể âm**: Tất cả giá trị bonus ≥ 0.
5. **finalScore không vượt 100**: Luôn cap `MIN(100, ...)`.
6. **Point scale validation lazy**: Chỉ validate khi `pointScaleType` được set; nếu `null` → PM nhập tự do.
7. **Digest chỉ gửi qua Scheduler**: Không trigger thủ công qua API (tránh spam).
8. **OT multipliers chỉ ở org level**: Project không override được hệ số OT — đây là chính sách lao động toàn công ty.

---

## 7. Danh sách API

### Project Settings

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/v1/projects/:id/settings` | Lấy toàn bộ project settings (merge với org default) |
| PUT | `/v1/projects/:id/settings` | Cập nhật project settings (partial update OK) |
| DELETE | `/v1/projects/:id/settings` | Reset về org default |

### Org Settings

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/v1/org-config/settings` | Lấy org settings hiện tại |
| PUT | `/v1/org-config/settings` | Cập nhật org settings |

> Org working-time config (giờ làm / ngày lễ) vẫn giữ endpoint `/v1/org-config/working-time` riêng (đã thiết kế trong KPI docs).

---

## 8. Câu hỏi mở

| # | Câu hỏi | Đề xuất |
|---|---|---|
| 1 | Điểm bonus tính theo task hay theo kỳ (sprint/tháng)? | Theo kỳ (khi xem KPI) |
| 2 | `bonusOtPerEffectiveHour` có áp dụng cho project KPI không hay chỉ org? | Cả hai |
| 3 | Digest email template có tuỳ biến không hay dùng template cố định? | Template cố định trước, tuỳ biến sau |
| 4 | Khi PM reset project settings → có xác nhận hay tự động? | Cần xác nhận |
| 5 | Point scale validation: task đang có `estimated_point = 8` mà PM đổi scale về max=5 → xử lý thế nào? | Warn, giữ nguyên giá trị cũ — chỉ validate task mới |
