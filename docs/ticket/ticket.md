# Ticket Request Module — Tài liệu kỹ thuật

> Cập nhật: 2026-03-18

---

## 1. Tổng quan

Module `ticket-request` là hệ thống quản lý yêu cầu nội bộ (nghỉ phép, WFH, OT, tạm ứng lương, v.v.) theo quy trình phê duyệt nhiều bước (multi-step approval workflow).

**Vị trí trong codebase:**
```
src/modules/ticket-request/
├── ticket-request.module.ts               ← Barrel module (import 4 sub-modules)
├── ticket-request-workflow-engine.ts      ← Pure functions (không injectable)
│
├── core/                                  ← [Swagger tag: "Ticket Requests"]
│   ├── core.module.ts
│   ├── core.controller.ts
│   ├── core.service.ts
│   ├── constants/
│   │   └── request-type-catalog.constant.ts
│   ├── dto/
│   │   ├── request/
│   │   │   ├── create-ticket-request.request.ts
│   │   │   ├── create-overtime-request.request.ts
│   │   │   └── list-ticket-requests.request.ts
│   │   └── response/
│   │       └── ticket-request.response.ts
│   └── entities/
│       ├── ticket-request.entity.ts
│       ├── ticket-request-activity.entity.ts
│       ├── ticket-request-cc-member.entity.ts
│       └── ticket-request-comment.entity.ts
│
├── workflow/                              ← [Swagger tag: "Ticket Request Workflow"]
│   ├── workflow.module.ts
│   ├── workflow.controller.ts
│   ├── workflow.service.ts
│   └── dto/request/
│       ├── update-ticket-request.request.ts
│       ├── declare-ot-effort.request.ts
│       └── decision-ticket-request.request.ts
│
├── comment/                               ← [Swagger tag: "Ticket Request Comments"]
│   ├── comment.module.ts
│   ├── comment.controller.ts
│   ├── comment.service.ts
│   └── dto/request/
│       └── create-ticket-comment.request.ts
│
└── cc-member/                             ← [Swagger tag: "Ticket Request CC Members"]
    ├── cc-member.module.ts
    ├── cc-member.controller.ts
    ├── cc-member.service.ts
    └── dto/request/
        └── manage-cc-members.request.ts
```

### Module Dependencies

```
TicketRequestModule (barrel)
  ├── TicketRequestCoreModule         ← exports: TicketRequestCoreService, TypeOrmModule
  ├── TicketRequestWorkflowModule     ← imports: TicketRequestCoreModule
  ├── TicketRequestCommentModule      ← imports: TicketRequestCoreModule
  └── TicketRequestCcMemberModule     ← imports: TicketRequestCoreModule
```

`TicketRequestCoreModule` inject: `TypeOrmModule.forFeature([TicketRequest, TicketRequestCcMember, TicketRequestComment, TicketRequestActivity, OrganizationMember, User])` + `OrganizationCoreModule`, `MaillerModule`, `NotificationCoreModule`, `WebsocketModule`.

### Workflow Engine (`ticket-request-workflow-engine.ts`)

File pure functions, **không** có `@Injectable()`. Được import trực tiếp trong `core.service.ts` và `workflow.service.ts`:

| Function | Mô tả |
|----------|--------|
| `resolveWorkflowCode(code, type)` | Lấy workflow code mặc định theo type nếu không truyền |
| `getWorkflowDefinition(code)` | Lấy workflow definition theo code |
| `getWorkflowStep(code, stepCode)` | Lấy step definition cụ thể |
| `getOptionalNextStep(code, step)` | Lấy step tiếp theo (nullable) |
| `getNextStepOrThrow(code, step)` | Lấy step tiếp theo, throw nếu không có |
| `getCurrentStep(ticket)` | Lấy step hiện tại của ticket |
| `getSubmitterIdForStep(ticket, stepCode)` | Lấy userId có quyền submit tại step đó |

---

## 2. Database Schema

### Bảng `ticket_requests` (bảng chính)

| Column | Type | Mô tả |
|--------|------|--------|
| `id` | uuid | PK |
| `code` | varchar | Mã ticket tự sinh (dạng `TR-YYYYMMDD-XXXXXX`) |
| `organization_id` | uuid | FK → organizations |
| `type` | enum | Loại yêu cầu: `leave \| wfh \| overtime \| advance \| general` |
| `workflow_code` | enum | Quy trình áp dụng: `working_time \| overtime_opic \| overtime_standard` |
| `current_step_code` | varchar | Bước đang xử lý hiện tại |
| `current_step_order` | int | Thứ tự bước (dùng để sắp xếp) |
| `status` | enum | Trạng thái: `pending_approval \| changes_requested \| approved \| rejected \| canceled` |
| `title` | varchar(255) | Tiêu đề yêu cầu |
| `content` | text | Nội dung chi tiết |
| `request_type_code` | varchar(120) | Code loại yêu cầu cụ thể (vd: `paid_leave`) |
| `request_type_name` | varchar(255) | Tên hiển thị loại yêu cầu |
| `reason_code` | varchar(255) | Code lý do (vd: `personal_reason`) |
| `reason_detail` | text | Mô tả lý do tự nhập |
| `requester_id` | uuid | Người tạo yêu cầu |
| `approver_id` | uuid | Người đang phụ trách xử lý bước hiện tại |
| `delegate_id` | uuid | Người được uỷ quyền (thường = `approver_id`) |
| `effort_owner_id` | uuid | Người khai báo effort OT |
| `start_at` | timestamp | Thời gian bắt đầu |
| `end_at` | timestamp | Thời gian kết thúc |
| `decision_note` | text | Ghi chú quyết định của approver |
| `decided_by` | uuid | Người ra quyết định cuối |
| `decided_at` | timestamp | Thời điểm ra quyết định |
| `canceled_by` | uuid | Người hủy |
| `canceled_at` | timestamp | Thời điểm hủy |
| `ot_metadata` | jsonb | Dữ liệu OT: `{ projectId, plannedHours, scope, effortEntries[], totalActualHours, effortDetail }` |

### Bảng `ticket_request_activities` (audit log)

Ghi lại mọi hành động xảy ra trên ticket.

| Column | Mô tả |
|--------|--------|
| `id` | uuid PK |
| `ticket_id` | FK → ticket_requests |
| `action` | Loại hành động (enum, xem bên dưới) |
| `from_status` | Trạng thái trước hành động |
| `to_status` | Trạng thái sau hành động |
| `actor_id` | Người thực hiện |
| `payload` | JSONB context: `{ fromStepCode, toStepCode, nextApproverId, note, reason, ... }` |
| `created_at` | Thời điểm ghi log |

**`TicketRequestActivityAction` enum:**
```
created | submitted | updated | approved | rejected | changes_requested | declared_ot_effort | canceled | commented | cc_added | cc_removed
```

### Bảng `ticket_request_cc_members`

| Column | Mô tả |
|--------|--------|
| `id` | uuid PK |
| `ticket_id` | FK → ticket_requests |
| `member_id` | FK → users |
| `added_by` | UUID người thêm |
| `created_at` | Thời điểm thêm vào CC |

### Bảng `ticket_request_comments`

| Column | Mô tả |
|--------|--------|
| `id` | uuid PK |
| `ticket_id` | FK → ticket_requests |
| `author_id` | FK → users |
| `content` | Nội dung comment (max 5000 chars) |
| `created_at` | Thời điểm tạo |
| `updated_at` | Thời điểm sửa |

---

## 3. Enums quan trọng

### `TicketRequestType`
```
leave       — Nghỉ phép
wfh         — Work from home
overtime    — Làm thêm giờ
advance     — Tạm ứng lương
general     — Yêu cầu chung
```

### `TicketRequestWorkflowCode`
```
working_time       — Quy trình cho leave/wfh/advance/general
overtime_opic      — Quy trình OT có OPIC
overtime_standard  — Quy trình OT tiêu chuẩn
```

### `TicketRequestStatus`
```
pending_approval    — Đang chờ approve/submit
changes_requested   — Bị trả về, cần chỉnh sửa hoặc khai báo lại
approved            — Đã được duyệt hoàn toàn
rejected            — Bị từ chối (terminal, không phục hồi)
canceled            — Người tạo đã huỷ
```

### `TicketRequestWorkflowStepCode`
```
emp_create_request          — Nhân viên tạo request (submit step)
supervisor_confirm          — Supervisor phê duyệt (approve step)
org_approve                 — Org admin phê duyệt (approve step)
pm_create_request           — PM tạo OT request (submit step)
org_confirm                 — Org admin xác nhận (approve step)
opic_approve_pre            — OPIC duyệt trước OT (approve step)
project_member_declare_ot   — Thành viên khai báo effort thực tế (submit step)
pm_confirm                  — PM xác nhận effort (approve step)
opic_approve_post           — OPIC duyệt sau OT (approve step)
org_approve_pre             — Org admin duyệt lần 1 (approve step)
org_approve_post            — Org admin duyệt lần 2 (approve step)
hr_baseline                 — HR chốt baseline (approve step)
```

---

## 4. Workflow Definitions

Mỗi ticket gắn với một workflow. Workflow định nghĩa chuỗi các bước (steps) theo thứ tự. Mỗi step có:
- **`actionType`**: `submit` (người dùng submit) hoặc `approve` (approver ra quyết định)
- **`nextStepOnApprove`**: Bước tiếp theo khi approve/submit thành công
- **`rejectMode`**: `terminal` (từ chối vĩnh viễn) hoặc `send_back` (trả về bước trước)
- **`rejectToStep`**: Bước bị trả về khi `rejectMode = send_back`

---

### 4.1 Workflow `WORKING_TIME`

Áp dụng cho: `leave`, `wfh`, `advance`, `general`

```
[Bước 0] EMP_CREATE_REQUEST  (submit)
         └─ submit ──────────────────────────────────▶
[Bước 1] SUPERVISOR_CONFIRM  (approve)  rejectMode: terminal
         ├─ approve ─────────────────────────────────▶
         └─ reject ────────────────────────────────── status: rejected
[Bước 2] ORG_APPROVE         (approve)  rejectMode: terminal
         ├─ approve ─────────────────────────────────▶ status: approved
         └─ reject ────────────────────────────────── status: rejected
```

---

### 4.2 Workflow `OVERTIME_STANDARD`

Áp dụng cho: overtime không có OPIC

```
[Bước 0] PM_CREATE_REQUEST      (submit)
         └─ submit ─────────────────────────────────▶
[Bước 1] ORG_APPROVE_PRE        (approve)  send_back → PM_CREATE_REQUEST
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── status: changes_requested → về bước 0
[Bước 2] PROJECT_MEMBER_DECLARE_OT  (submit)
         └─ declareOtEffort ──────────────────────── status: changes_requested → về bước 2 (tự submit)
[Bước 3] PM_CONFIRM             (approve)  send_back → PROJECT_MEMBER_DECLARE_OT
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── status: changes_requested → về bước 2
[Bước 4] ORG_APPROVE_POST       (approve)  send_back → PROJECT_MEMBER_DECLARE_OT
         ├─ approve ────────────────────────────────▶ status: approved
         └─ reject ───────────────────────────────── status: changes_requested → về bước 2
```

---

### 4.3 Workflow `OVERTIME_OPIC`

Áp dụng cho: overtime có OPIC

```
[Bước 0] PM_CREATE_REQUEST          (submit)
         └─ submit ─────────────────────────────────▶
[Bước 1] ORG_CONFIRM                (approve)  send_back → PM_CREATE_REQUEST
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── về bước 0
[Bước 2] OPIC_APPROVE_PRE           (approve)  send_back → PM_CREATE_REQUEST
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── về bước 0
[Bước 3] PROJECT_MEMBER_DECLARE_OT  (submit)
         └─ declareOtEffort ────────────────────────▶
[Bước 4] PM_CONFIRM                 (approve)  send_back → PROJECT_MEMBER_DECLARE_OT
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── về bước 3
[Bước 5] OPIC_APPROVE_POST          (approve)  send_back → PROJECT_MEMBER_DECLARE_OT
         ├─ approve ────────────────────────────────▶
         └─ reject ───────────────────────────────── về bước 3
[Bước 6] HR_BASELINE                (approve)  send_back → PROJECT_MEMBER_DECLARE_OT
         ├─ approve ────────────────────────────────▶ status: approved
         └─ reject ───────────────────────────────── về bước 3
```

---

## 5. Flow chi tiết theo từng action

### 5.1 Tạo ticket thường (`createTicket`)

```
1. Kiểm tra org tồn tại + requester là active member
2. Resolve request type từ requestTypeCode → lấy type + workflowCode
3. Nếu type = overtime → kiểm tra permission CREATE_OVERTIME
4. Lấy workflow definition → xác định firstApprovalStep (step đầu tiên có actionType='approve')
5. Validate delegateId: phải có permission ticket_requests.delegate, không phải chính mình
   (approverId là field cũ, backend ưu tiên delegateId nếu cả hai được truyền)
6. effortOwnerId: mặc định = requesterId nếu không truyền
7. Tính toán CC members:
   - Merge ccMemberIds từ request + org admin IDs (default CC)
   - Loại trừ: requester, delegate, effortOwner
   - Max 50 members
8. Validate reasonCode (nếu có)
9. Validate dateRange: endAt phải sau startAt
10. Transaction:
    a. Generate ticket code: TR-YYYYMMDD-XXXXXX
    b. Tạo TicketRequest với status = pending_approval, currentStep = firstApprovalStep
    c. Tạo records trong ticket_request_cc_members
    d. Ghi activity: action=CREATED
    e. Ghi activity: action=SUBMITTED (fromStep=createStep, toStep=firstApprovalStep)
11. Notify (async, fire-and-forget): delegate, effortOwner, CC members
```

### 5.2 Tạo OT ticket (`createOvertimeTicket`)

Dành riêng cho PM tạo ticket OT với form riêng:

```
1. Kiểm tra org + PM là active member có permission CREATE_OVERTIME
2. Workflow cố định = OVERTIME_STANDARD
3. Approver tự động = org admin đầu tiên trong danh sách (FE không cần truyền)
4. Lưu vào otMetadata: projectId, plannedHours, scope
5. Tương tự createTicket cho các bước còn lại
```

Khác biệt so với `createTicket`:
- Không cần `requestTypeCode`
- `startAt` và `endAt` là bắt buộc
- `plannedHours`, `scope`, `projectId` lưu vào `otMetadata`
- Workflow không tùy chọn

### 5.3 Approve ticket (`approveTicket`)

```
1. Kiểm tra ticket tồn tại trong org
2. Kiểm tra actor có quyền:
   - Là approverId của ticket, HOẶC
   - Có permission ticket_requests.delegate trong org
3. Kiểm tra ticket.status = pending_approval
4. Kiểm tra currentStep.actionType = 'approve'
5. Lấy nextStep = getOptionalNextStep():

   CASE A — Không có nextStep (bước cuối cùng):
   → status = approved
   → currentStepCode = 'completed', decidedBy = actor, decidedAt = now
   → Ghi activity: action=APPROVED, toStatus=approved
   → Notify: requester, effortOwner, CC members

   CASE B — nextStep.actionType = 'approve':
   → status vẫn = pending_approval
   → currentStep chuyển sang nextStep
   → approverId = nextDelegateId (từ DTO) hoặc delegate hiện tại
   → Ghi activity: action=APPROVED, toStatus=pending_approval
   → Notify: nextApprover, requester, CC members

   CASE C — nextStep.actionType = 'submit' (approve xong → cần someone submit):
   → status = changes_requested
   → currentStep = nextStep (bước submit)
   → approverId = người sẽ submit bước đó (từ getSubmitterIdForStep)
   → Ghi activity: action=APPROVED, toStatus=changes_requested
   → Notify: submitter, requester, CC members
```

> **Lưu ý CASE C:** Xảy ra khi workflow chuyển từ approve step → submit step (vd: `OPIC_APPROVE_PRE` duyệt xong → `PROJECT_MEMBER_DECLARE_OT`). Activity ghi `action=APPROVED` nhưng `toStatus=changes_requested` — đây là thiết kế có chủ ý để phân biệt "bước này approve thành công" vs "ticket cần ai đó submit tiếp".

### 5.4 Reject ticket (`rejectTicket`)

```
1. Kiểm tra tương tự approve
2. Xem rejectMode của currentStep:

   CASE terminal:
   → status = rejected
   → currentStepCode = 'rejected', decidedBy = actor, decidedAt = now
   → Ghi activity: action=REJECTED, toStatus=rejected
   → Notify: requester, effortOwner, CC members

   CASE send_back:
   → Tìm rejectToStep (cấu hình sẵn trong workflow)
   → status = changes_requested
   → currentStep = rejectToStep
   → approverId = người phụ trách submit bước đó
   → Ghi activity: action=REJECTED, toStatus=changes_requested
   → Notify: submitter, requester, CC members
```

### 5.5 Request changes (`requestChangesTicket`)

Approver chủ động yêu cầu chỉnh sửa (khác với `reject` theo workflow):

```
1. Kiểm tra tương tự approve (actor phải là approver hoặc có permission)
2. Kiểm tra status = pending_approval, actionType = 'approve'
3. Tìm targetStep = bước submit gần nhất trước currentStep:
   - Duyệt ngược workflow từ currentStep
   - Lấy step đầu tiên có actionType = 'submit'
4. status = changes_requested
5. currentStep = targetStep
6. Ghi activity: action=CHANGES_REQUESTED
7. Notify: submitter, requester, CC members
```

### 5.6 Update & Resubmit (`updateTicket`)

Dùng khi ticket đang ở `changes_requested` và bước hiện tại là submit step:

```
1. Kiểm tra ticket tồn tại
2. Kiểm tra status = changes_requested
3. Kiểm tra currentStep.actionType = 'submit'
4. Kiểm tra actor là đúng người có quyền submit bước đó (getSubmitterIdForStep)
5. Update các field cho phép:
   - type, requestTypeCode, requestTypeName, title, content
   - reasonCode, reasonDetail
   - ccMemberIds (replace toàn bộ, tính lại default CC)
   - startAt, endAt
6. Lấy nextStep (phải là approve step)
7. approverId = nextDelegateId (từ DTO) hoặc delegate hiện tại
8. status = pending_approval
9. Ghi activity: action=SUBMITTED (fromStep, toStep)
10. Notify: nextApprover, requester, CC members
```

### 5.7 Declare OT Effort (`declareOtEffort`)

Riêng cho bước `PROJECT_MEMBER_DECLARE_OT`:

```
1. Kiểm tra ticket tồn tại trong org
2. Kiểm tra status = changes_requested
3. Kiểm tra currentStep.code = PROJECT_MEMBER_DECLARE_OT
4. Kiểm tra actor là effort_owner_id hoặc có quyền submit bước đó
5. Validate effortEntries: mỗi entry cần date (YYYY-MM-DD), hours (1-24), taskDescription
6. Cập nhật otMetadata:
   otMetadata.effortEntries = dto.effortEntries
   otMetadata.totalActualHours = dto.totalActualHours
   otMetadata.effortDetail = dto.effortDetail
7. Lấy nextStep = PM_CONFIRM
8. approverId = nextDelegateId (từ DTO) hoặc delegate hiện tại
9. status = pending_approval
10. Ghi activity: action=DECLARED_OT_EFFORT
11. Notify: PM (nextApprover), requester
```

### 5.8 Cancel ticket (`cancelTicket`)

```
1. Kiểm tra ticket tồn tại trong org
2. Kiểm tra actor là requester_id
3. Kiểm tra status ∈ {pending_approval, changes_requested}
   (Không thể cancel nếu đã approved/rejected/canceled)
4. status = canceled
5. currentStepCode = 'canceled'
6. canceledBy = actor, canceledAt = now
7. Ghi activity: action=CANCELED
8. Notify: approver hiện tại, effortOwner, CC members
```

---

## 6. Permission & Access Control

### Ai có thể xem ticket?

Ticket visible nếu user là một trong:
- `requester_id`
- `approver_id`
- `delegate_id`
- `effort_owner_id`
- CC member (có record trong `ticket_request_cc_members`)
- Có permission `ticket_requests.list_org` (org admin)

### Ai có thể approve/reject/request-changes?

- User là `approver_id` của ticket, HOẶC
- User có permission `ticket_requests.delegate` trong org

### Ai submit tại từng bước?

| Step | Người submit |
|------|--------------|
| `EMP_CREATE_REQUEST` | `requester_id` |
| `PM_CREATE_REQUEST` | `requester_id` |
| `PROJECT_MEMBER_DECLARE_OT` | `effort_owner_id` (hoặc `requester_id` nếu không có) |

Logic này nằm trong `getSubmitterIdForStep()` trong workflow engine.

### RBAC Permissions

| Permission code | Ý nghĩa |
|----------------|---------|
| `ticket_requests.create` | Tạo ticket thường |
| `ticket_requests.create_overtime` | Tạo ticket OT |
| `ticket_requests.list_own` | Xem danh sách ticket liên quan đến mình |
| `ticket_requests.list_org` | Xem tất cả ticket trong org (admin) |
| `ticket_requests.view` | Xem chi tiết ticket |
| `ticket_requests.update_own` | Cập nhật + resubmit ticket của mình |
| `ticket_requests.cancel_own` | Hủy ticket của mình |
| `ticket_requests.approve` | Phê duyệt ticket (deprecated, dùng `delegate`) |
| `ticket_requests.delegate` | Được chỉ định làm approver, có thể approve/reject |
| `ticket_requests.comment` | Comment trên ticket |
| `ticket_requests.manage_cc` | Thêm/xóa CC member |

---

## 7. API Endpoints

Base URL: `POST /api/v1/ticket-requests`
Header bắt buộc: `X-Organization-Id: <orgId>`
Authorization: `Bearer <access_token>`

---

### 7.1 Swagger Tag: "Ticket Requests"

#### `POST /api/v1/ticket-requests` — Tạo ticket thường

**Permission:** `ticket_requests.create`

**Request body:**
```json
{
  "requestTypeCode": "paid_leave_last_year",     // bắt buộc, string max 120
  "title": "Xin nghỉ phép ngày thứ 6",           // bắt buộc, string max 255
  "content": "Tôi cần nghỉ 1 ngày để giải quyết việc gia đình.", // bắt buộc
  "type": "leave",                                // optional (enum TicketRequestType)
  "workflowCode": "working_time",                 // optional (enum TicketRequestWorkflowCode)
  "requestTypeName": "Paid leave of last year",   // optional, string max 255
  "reasonCode": "annual_leave",                   // optional, string max 255
  "reasonDetail": "Nhập lý do chi tiết...",       // optional
  "delegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",    // optional uuid (ưu tiên hơn approverId)
  "approverId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",    // optional uuid (field cũ)
  "effortOwnerId": "307f0059-51fa-43ea-b1dc-a9629ca1389f", // optional uuid (default = requester)
  "ccMemberIds": ["6fdf6ffc-ed77-94fa-407e-a7b86ed9e59d"], // optional uuid[], max 50
  "startAt": "2026-03-20T08:00:00.000Z",          // optional, ISO 8601
  "endAt": "2026-03-20T17:00:00.000Z"             // optional, ISO 8601
}
```

**Response `201`:**
```json
{
  "statusCode": 201,
  "message": "Ticket request created successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `POST /api/v1/ticket-requests/overtime` — Tạo ticket OT

**Permission:** `ticket_requests.create_overtime`

**Request body:**
```json
{
  "title": "OT tháng 3 — dự án ICCP Portal",      // bắt buộc, string max 255
  "startAt": "2026-03-20T18:00:00.000Z",           // bắt buộc, ISO 8601
  "endAt": "2026-03-20T22:00:00.000Z",             // bắt buộc, ISO 8601
  "projectId": "307f0059-51fa-43ea-b1dc-a9629ca1389f", // optional uuid
  "plannedHours": 4,                               // optional, positive number
  "scope": "Hoàn thiện module ticket request trước deadline sprint", // optional
  "reasonCode": "project_deadline",                // optional, string max 255
  "reasonDetail": "Cần hoàn thành tính năng trước ngày demo.", // optional
  "effortOwnerId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",     // optional uuid
  "ccMemberIds": ["307f0059-51fa-43ea-b1dc-a9629ca1389f"]      // optional uuid[], max 50
}
```

**Response `201`:**
```json
{
  "statusCode": 201,
  "message": "Overtime ticket request created successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `GET /api/v1/ticket-requests/me` — Danh sách ticket liên quan đến tôi

**Permission:** `ticket_requests.list_own`

**Query params:**
```
page          integer (default 1)
limit         integer (default 20)
sortBy        createdAt | updatedAt | status
sortOrder     ASC | DESC
status        pending_approval | changes_requested | approved | rejected | canceled
type          leave | wfh | overtime | advance | general
workflowCode  working_time | overtime_opic | overtime_standard
currentStepCode  string (vd: pm_confirm)
requestTypeCode  string (vd: paid_leave_last_year)
requesterId   uuid
approverId    uuid
search        string (tìm trong code/title/content/requestTypeName/reasonCode)
fromDate      ISO 8601
toDate        ISO 8601
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched my ticket requests successfully",
  "data": {
    "items": [ /* TicketRequestSummaryResponse[] */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

#### `GET /api/v1/ticket-requests/manage` — Danh sách toàn bộ ticket trong org

**Permission:** `ticket_requests.list_org`

**Query params:** Tương tự `/me` (cùng `ListTicketRequestsRequest`)

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched organization ticket requests successfully",
  "data": { /* PaginatedResponse<TicketRequestSummaryResponse> */ }
}
```

---

#### `GET /api/v1/ticket-requests/request-types` — Catalog loại yêu cầu

**Permission:** `ticket_requests.create`

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched request type catalog successfully",
  "data": [
    {
      "code": "paid_leave_last_year",
      "label": "Paid leave of last year",
      "type": "leave",
      "allowedWorkflowCodes": ["working_time"],
      "defaultWorkflowCode": "working_time"
    }
    // ... 32 loại tổng cộng
  ]
}
```

---

#### `GET /api/v1/ticket-requests/reason-options` — Catalog lý do

**Permission:** `ticket_requests.create`

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched reason options successfully",
  "data": [
    { "code": "personal_reason", "label": "Personal reason" },
    { "code": "medical_reason",  "label": "Medical reason" },
    { "code": "family_reason",   "label": "Family reason" },
    { "code": "project_deadline","label": "Project deadline" }
    // ...
  ]
}
```

---

#### `GET /api/v1/ticket-requests/approver-options` — Danh sách approver hợp lệ

**Permission:** `ticket_requests.create`

Trả về tất cả member trong org có permission `ticket_requests.delegate` (loại trừ chính user hiện tại).

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched approver options successfully",
  "data": [
    {
      "id": "307f0059-51fa-43ea-b1dc-a9629ca1389f",
      "email": "manager@company.com",
      "firstName": "Nguyen",
      "lastName": "Manager",
      "isOrgAdmin": true,
      "isDefault": true
    }
  ]
}
```

---

#### `GET /api/v1/ticket-requests/:ticketId` — Chi tiết ticket

**Permission:** `ticket_requests.view`

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched ticket request detail successfully",
  "data": {
    // === TicketRequestSummaryResponse ===
    "id": "3f6f4f6d-1111-4f4c-aa0a-b1d86026f6d9",
    "code": "TR-20260313-930001",
    "type": "leave",
    "workflowCode": "working_time",
    "currentStepCode": "supervisor_confirm",
    "currentStepOrder": 1,
    "requestTypeCode": "paid_leave_last_year",
    "requestTypeName": "Paid leave of last year",
    "reasonCode": "annual_leave",
    "title": "Xin nghỉ phép ngày thứ 6",
    "status": "pending_approval",
    "requester": { "id": "...", "email": "...", "firstName": "...", "lastName": "..." },
    "approver":  { "id": "...", "email": "...", "firstName": "...", "lastName": "..." },
    "delegate":  { "id": "...", "email": "...", "firstName": "...", "lastName": "..." },
    "createdAt": "2026-03-13T09:30:00.000Z",
    "updatedAt": "2026-03-13T09:30:00.000Z",

    // === TicketRequestDetailResponse (extended) ===
    "content": "Tôi cần nghỉ 1 ngày để giải quyết việc gia đình.",
    "reasonDetail": "Nhập lý do chi tiết...",
    "effortOwner": { "id": "...", "email": "..." },
    "startAt": "2026-03-20T08:00:00.000Z",
    "endAt": "2026-03-20T17:00:00.000Z",
    "decisionNote": null,
    "decidedAt": null,
    "decidedBy": null,
    "canceledAt": null,
    "canceledBy": null,
    "otMetadata": null,
    "ccMembers": [
      {
        "member": { "id": "...", "email": "..." },
        "addedAt": "2026-03-13T09:30:00.000Z",
        "addedBy": "307f0059-51fa-43ea-b1dc-a9629ca1389f"
      }
    ],
    "activities": [
      {
        "id": "...",
        "action": "created",
        "fromStatus": null,
        "toStatus": "pending_approval",
        "actorId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",
        "payload": { "fromStepCode": "emp_create_request", "toStepCode": "supervisor_confirm" },
        "createdAt": "2026-03-13T09:30:00.000Z"
      }
    ]
  }
}
```

---

#### `POST /api/v1/ticket-requests/:ticketId/cancel` — Hủy ticket

**Permission:** `ticket_requests.cancel_own`

**Request body:** *(không có body)*

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Ticket request canceled successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

### 7.2 Swagger Tag: "Ticket Request Workflow"

#### `PATCH /api/v1/ticket-requests/:ticketId` — Cập nhật và resubmit

**Permission:** `ticket_requests.update_own`
**Điều kiện:** `status = changes_requested` + `currentStep.actionType = 'submit'`

**Request body:** *(tất cả optional)*
```json
{
  "type": "leave",
  "requestTypeCode": "paid_leave_last_year",
  "requestTypeName": "Paid leave of last year",
  "title": "Cập nhật yêu cầu nghỉ phép",
  "content": "Đã cập nhật nội dung theo yêu cầu.",
  "reasonCode": "annual_leave",
  "reasonDetail": "Nhập lý do chi tiết...",
  "ccMemberIds": ["307f0059-51fa-43ea-b1dc-a9629ca1389f"],  // uuid[], max 50 (replace toàn bộ)
  "nextDelegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f", // optional uuid
  "nextApproverId": "307f0059-51fa-43ea-b1dc-a9629ca1389f", // optional uuid (field cũ)
  "startAt": "2026-03-22T08:00:00.000Z",
  "endAt": "2026-03-22T17:00:00.000Z"
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Ticket request updated successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `PATCH /api/v1/ticket-requests/:ticketId/declare-ot-effort` — Khai báo effort OT

**Permission:** `ticket_requests.update_own`
**Điều kiện:** `status = changes_requested` + `currentStep = PROJECT_MEMBER_DECLARE_OT`
**Actor:** `effort_owner_id` hoặc có quyền submit bước đó

**Request body:**
```json
{
  "effortEntries": [                               // bắt buộc, min 1 item
    {
      "date": "2026-03-20",                        // bắt buộc, YYYY-MM-DD
      "hours": 4,                                  // bắt buộc, positive, max 24
      "taskDescription": "Implement ticket-request workflow service", // bắt buộc
      "workDescription": "Hoàn thiện approveTicket, rejectTicket, requestChanges." // optional
    }
  ],
  "totalActualHours": 8,                           // bắt buộc, positive number
  "effortDetail": "Đã hoàn thành đúng yêu cầu sprint, không phát sinh ngoài scope.", // optional
  "nextDelegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f" // optional uuid
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "OT effort declared successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `POST /api/v1/ticket-requests/:ticketId/approve` — Approve bước hiện tại

**Permission:** `ticket_requests.delegate`
**Điều kiện:** Là `approver_id` HOẶC có permission `delegate`; `status = pending_approval`; `currentStep.actionType = 'approve'`

**Request body:** *(tất cả optional)*
```json
{
  "note": "Đồng ý yêu cầu nghỉ phép.",            // optional, string max 2000
  "nextDelegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f", // optional uuid
  "nextApproverId": "307f0059-51fa-43ea-b1dc-a9629ca1389f"  // optional uuid (field cũ)
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Ticket request approved successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `POST /api/v1/ticket-requests/:ticketId/reject` — Reject bước hiện tại

**Permission:** `ticket_requests.delegate`

**Request body:**
```json
{
  "reason": "Thời gian nghỉ không phù hợp với kế hoạch dự án.", // bắt buộc, string max 2000
  "nextDelegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",     // optional uuid
  "nextApproverId": "307f0059-51fa-43ea-b1dc-a9629ca1389f"      // optional uuid (field cũ)
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Ticket request rejected successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `POST /api/v1/ticket-requests/:ticketId/request-changes` — Yêu cầu chỉnh sửa

**Permission:** `ticket_requests.delegate`

**Request body:**
```json
{
  "reason": "Vui lòng bổ sung lý do và bàn giao công việc.", // bắt buộc, string max 2000
  "nextDelegateId": "307f0059-51fa-43ea-b1dc-a9629ca1389f",  // optional uuid
  "nextApproverId": "307f0059-51fa-43ea-b1dc-a9629ca1389f"   // optional uuid (field cũ)
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Requested changes successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

### 7.3 Swagger Tag: "Ticket Request Comments"

#### `GET /api/v1/ticket-requests/:ticketId/comments` — Lấy danh sách comments

**Permission:** `ticket_requests.view`

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "Fetched ticket comments successfully",
  "data": [
    {
      "id": "3f6f4f6d-1111-4f4c-aa0a-b1d86026f6d9",
      "content": "Đã cập nhật thông tin bàn giao.",
      "author": { "id": "...", "email": "...", "firstName": "...", "lastName": "..." },
      "createdAt": "2026-03-13T09:30:00.000Z",
      "updatedAt": "2026-03-13T09:30:00.000Z"
    }
  ]
}
```

---

#### `POST /api/v1/ticket-requests/:ticketId/comments` — Thêm comment

**Permission:** `ticket_requests.comment`
**Actor hợp lệ:** Requester, approver, CC member, org admin

**Request body:**
```json
{
  "content": "Nội dung comment tại đây." // bắt buộc, string max 5000
}
```

**Response `201`:**
```json
{
  "statusCode": 201,
  "message": "Comment added successfully",
  "data": { /* TicketRequestCommentResponse */ }
}
```

---

### 7.4 Swagger Tag: "Ticket Request CC Members"

#### `POST /api/v1/ticket-requests/:ticketId/cc-members` — Thêm CC members

**Permission:** `ticket_requests.view`
*(Logic kiểm tra quyền manage CC nằm trong service)*

**Request body:**
```json
{
  "memberIds": [                                   // bắt buộc, uuid[], max 50
    "307f0059-51fa-43ea-b1dc-a9629ca1389f",
    "6fdf6ffc-ed77-94fa-407e-a7b86ed9e59d"
  ]
}
```

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "CC members added successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

#### `DELETE /api/v1/ticket-requests/:ticketId/cc-members/:memberId` — Xóa CC member

**Permission:** `ticket_requests.view`

**Path params:**
- `ticketId`: uuid
- `memberId`: uuid (ID của member cần xóa)

**Response `200`:**
```json
{
  "statusCode": 200,
  "message": "CC member removed successfully",
  "data": { /* TicketRequestDetailResponse */ }
}
```

---

## 8. Response Schemas

### `TicketRequestSummaryResponse`

```typescript
{
  id: string;                      // uuid
  code: string;                    // TR-YYYYMMDD-XXXXXX
  type: TicketRequestType;         // leave | wfh | overtime | advance | general
  workflowCode: TicketRequestWorkflowCode;
  currentStepCode: string;
  currentStepOrder: number;
  requestTypeCode?: string;
  requestTypeName?: string;
  reasonCode?: string;
  title: string;
  status: TicketRequestStatus;
  requester: TicketRequestUserResponse;
  approver: TicketRequestUserResponse;
  delegate: TicketRequestUserResponse;
  createdAt: Date;
  updatedAt: Date;
}
```

### `TicketRequestDetailResponse` (extends Summary)

```typescript
{
  // ... tất cả fields của Summary +
  content: string;
  reasonDetail?: string;
  effortOwner?: TicketRequestUserResponse | null;
  startAt?: Date;
  endAt?: Date;
  decisionNote?: string;
  decidedAt?: Date;
  decidedBy?: string;              // uuid
  canceledAt?: Date;
  canceledBy?: string;             // uuid
  otMetadata?: {
    projectId?: string;
    plannedHours?: number;
    scope?: string;
    effortEntries?: Array<{
      date: string;                // YYYY-MM-DD
      hours: number;
      taskDescription: string;
      workDescription?: string;
    }>;
    totalActualHours?: number;
    effortDetail?: string;
  };
  ccMembers: Array<{
    member: TicketRequestUserResponse;
    addedAt: Date;
    addedBy: string;               // uuid
  }>;
  activities: Array<{
    id: string;
    action: TicketRequestActivityAction;
    fromStatus?: TicketRequestStatus;
    toStatus?: TicketRequestStatus;
    actorId: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }>;
}
```

### `TicketRequestUserResponse`

```typescript
{
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
```

### `TicketRequestApproverOptionResponse` (extends User)

```typescript
{
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isOrgAdmin: boolean;             // có phải org admin không
  isDefault: boolean;              // có phải default approver không
}
```

---

## 9. Notification System

Mỗi action đều trigger notify tới các bên liên quan qua 3 kênh **song song, fire-and-forget** (không block response):

1. **Email** (`MaillerService`)
2. **In-app notification** (`NotificationCoreService`)
3. **WebSocket real-time** (`WebsocketService` — event `TICKET_REQUEST_UPDATED`)

**Nguyên tắc:**
- Không bao giờ notify chính người thực hiện action
- Danh sách người nhận phụ thuộc vào từng action

| Action | Người được notify |
|--------|------------------|
| `created` / `submitted` | delegate, effortOwner, CC members |
| `approved` (→ next approve step) | nextApprover, requester, CC members |
| `approved` (→ submit step) | submitter, requester, CC members |
| `approved` (→ completed) | requester, effortOwner, CC members |
| `rejected` (terminal) | requester, effortOwner, CC members |
| `rejected` (send_back) | submitter, requester, CC members |
| `changes_requested` | submitter, requester, CC members |
| `updated` / `resubmitted` | nextApprover, requester, CC members |
| `declared_ot_effort` | PM (nextApprover), requester |
| `canceled` | approver, effortOwner, CC members |
| `commented` | requester, approver, CC members |
| `cc_added` / `cc_removed` | ticket watcher IDs |

**WebSocket event payload:**
```json
{
  "event": "TICKET_REQUEST_UPDATED",
  "data": {
    "ticketId": "3f6f4f6d-...",
    "action": "approved",
    "actorId": "307f0059-..."
  }
}
```

---

## 10. Catalog — Loại yêu cầu

32 loại yêu cầu được định nghĩa trong `core/constants/request-type-catalog.constant.ts`.

| Code | Label | Type | Workflow |
|------|-------|------|----------|
| `work_from_home` | Work from home | wfh | working_time |
| `paid_leave` | Paid leave | leave | working_time |
| `paid_leave_last_year` | Paid leave of last year | leave | working_time |
| `sick_leave` | Sick leave | leave | working_time |
| `late_coming` | Late coming | leave | working_time |
| `early_leave` | Early leave | leave | working_time |
| `compensation_leave` | Compensation leave | leave | working_time |
| `overtime_request` | Overtime request | overtime | overtime_standard |
| `advance_salary` | Advance salary | advance | working_time |
| `general_request` | General request | general | working_time |
| *(+22 loại khác)* | ... | ... | ... |

---

## 11. State Machine tóm tắt

```
         ┌───────────────────────────────────────────────────────┐
         │                    PENDING_APPROVAL                    │
         │           (approve step: chờ approver ra quyết định)  │
         └──────────────────────┬────────────────────────────────┘
                                │
           ┌────────────────────┼──────────────────────────────────┐
           │                    │                                  │
    [approve → last step] [reject terminal]          [approve → next submit step]
    [approve → next         │                        [request_changes]
     approve step]    ┌────▼────┐                        │
           │          │REJECTED │              ┌──────────▼──────────────┐
           │          └─────────┘              │    CHANGES_REQUESTED     │
           │                                   │  (submit step: chờ user  │
           │                                   │   update / declare OT)   │
           │                                   └──────────┬──────────────┘
           │                                              │
           │                                [updateTicket / declareOtEffort]
           │                                              │
           │                              ┌───────────────▼──────────────┐
           │                              │        PENDING_APPROVAL       │
           │                              └──────────────────────────────┘
           │
    [approve cuối cùng]
           │
     ┌─────▼──────┐
     │  APPROVED  │
     └────────────┘

Từ PENDING_APPROVAL hoặc CHANGES_REQUESTED:
  [cancel by requester] → CANCELED
```

---

## 12. Các điểm cần lưu ý

1. **`delegateId` vs `approverId`**: `delegateId` là field mới, `approverId` là field cũ còn giữ để backward-compatible. Backend ưu tiên `delegateId` khi cả hai được truyền. Trong DB, cả hai field `approver_id` và `delegate_id` luôn có giá trị như nhau.

2. **`send_back` vs `request_changes`**:
   - `reject` với `send_back`: đi theo route cố định trong workflow (`rejectToStep`)
   - `request_changes`: approver chủ động chọn — hệ thống tìm bước submit gần nhất trước currentStep

3. **Approve → submit step (CASE C)**: Khi approve một bước mà nextStep là `submit`, hệ thống ghi activity `action=APPROVED` nhưng `toStatus=changes_requested`. Đây là thiết kế có chủ ý: "approve step này thành công" + "ticket cần ai đó submit tiếp theo".

4. **Default CC members**: Khi tạo ticket, hệ thống tự động thêm org admin vào CC (trừ khi họ là requester/delegate/effortOwner).

5. **`otMetadata`**: JSONB field, chỉ có ở ticket type `overtime`. Được tạo khi `createOvertimeTicket` và cập nhật khi `declareOtEffort`. Cấu trúc: `{ projectId?, plannedHours?, scope?, effortEntries[]?, totalActualHours?, effortDetail? }`.

6. **Workflow engine là pure functions**: `ticket-request-workflow-engine.ts` không có decorator NestJS, không injectable. Chứa toàn bộ logic tính toán workflow — có thể import trực tiếp và unit test độc lập mà không cần mock DI container.

7. **Phân tách Swagger tags**: 4 controllers riêng → 4 Swagger groups:
   - `Ticket Requests` — core CRUD
   - `Ticket Request Workflow` — approve/reject/update/declareOt
   - `Ticket Request Comments` — comment thread
   - `Ticket Request CC Members` — quản lý CC list

8. **Header bắt buộc**: Tất cả endpoint đều yêu cầu header `X-Organization-Id`. Thiếu header này → `400 Bad Request`.
