# KPI Target API - Hướng dẫn tích hợp cho Frontend

Tài liệu này mô tả phiên bản mới của KPI target backend sau khi bổ sung:

- scope theo `USER | ROLE | PROJECT_ROLE`
- `achievement` đã được tính sẵn ở server
- clone target giữa các kỳ
- snapshot lịch sử khi target kết thúc
- soft delete, notification và audit

## 1. Tổng quan

KPI target không còn chỉ là "gán target cho từng user". Một target hiện tại có thể được tạo theo 3 scope:

- `USER`: target dành riêng cho 1 hoặc nhiều user
- `ROLE`: target mặc định ở cấp organization role
- `PROJECT_ROLE`: target mặc định ở cấp role trong 1 project

Khi backend cần resolve target hữu lực cho một user, thứ tự ưu tiên là:

1. `project USER`
2. `project PROJECT_ROLE`
3. `org USER`
4. `org ROLE`

Nếu cùng một mức ưu tiên thì lấy bản ghi có `updatedAt` mới nhất.

Mục tiêu của frontend:

- trang "Giao KPI" có thể tạo target theo user hoặc theo role
- trang "KPI của tôi" không cần tự tính `achievement`
- trang "Theo dõi team" nhận đủ target hữu lực và `achievement` đã tính sẵn

## 2. Base URL và headers

```txt
BASE: /api/v1
```

Mỗi request cần:

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Authorization: Bearer <accessToken>` | Yes | JWT access token |
| `x-organization-id: <orgId>` | Yes | UUID của organization hiện tại |
| `Content-Type: application/json` | Yes khi có body | JSON payload |

## 3. Permissions

| Permission code | Mô tả |
|---|---|
| `analytics.kpi.target.manage` | CRUD target trong org/project có quyền |
| `analytics.kpi.target.view` | Xem danh sách target trong org |
| `analytics.kpi.project.view` | Fallback để PM xem/manage target trong project họ quản lý |

Lưu ý:

- `GET /v1/kpi-targets/me` không cần quyền đặc biệt
- `GET /v1/kpi-targets/:id` cho phép user xem target áp dụng cho chính mình, kể cả target theo `ROLE` hoặc `PROJECT_ROLE`

## 4. Enums

```ts
enum KpiTargetPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

enum KpiTargetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

enum KpiTargetScopeType {
  USER = 'USER',
  ROLE = 'ROLE',
  PROJECT_ROLE = 'PROJECT_ROLE',
}
```

Lưu ý:

- chỉ target `ACTIVE` được dùng để resolve target hữu lực
- target `ARCHIVED` có thể đi kèm `snapshot` để phục vụ báo cáo lịch sử

## 5. Response wrapper chung

Tất cả endpoint đều theo wrapper sau:

```ts
interface ApiResponse<T> {
  statusCode: number;
  message?: string;
  data?: T;
}
```

## 6. Data model

### 6.1. `KpiTargetResponse`

```ts
interface KpiTargetSnapshotResponse {
  actualScore?: number;
  actualOnTimeRate?: number;
  actualPointCompletionRate?: number;
  actualOtHours?: number;
  actualCompletedTasks?: number;
  actualOverdueTasks?: number;
  actualPayload?: Record<string, unknown>;
  archivedAt: string; // ISO datetime
}

interface KpiTargetResolvedFromResponse {
  targetId: string;
  scopeType: 'USER' | 'ROLE' | 'PROJECT_ROLE';
  projectId?: string | null;
  userId?: string | null;
  roleId?: string | null;
}

interface KpiTargetResponse {
  id: string;
  organizationId: string;
  projectId?: string | null;   // null = org-scoped
  scopeType: 'USER' | 'ROLE' | 'PROJECT_ROLE';
  userId?: string | null;      // có giá trị với scope USER
  roleId?: string | null;      // có giá trị với scope ROLE / PROJECT_ROLE

  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  periodStart: string;         // YYYY-MM-DD
  periodEnd: string;           // YYYY-MM-DD

  targetScore?: number;
  targetPointCompletionRate?: number;
  targetOnTimeRate?: number;
  targetOtHours?: number;
  targetCompletedTasks?: number;
  maxOverdueTasks?: number;
  requireZeroOverdue: boolean;

  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  note?: string;
  assignedBy?: string;

  deletedAt?: string | null;
  deletedBy?: string | null;
  snapshot?: KpiTargetSnapshotResponse;
  resolvedFrom?: KpiTargetResolvedFromResponse; // chỉ có ở GET /me

  createdAt: string;           // ISO datetime
  updatedAt: string;           // ISO datetime
}
```

### 6.2. `achievement` trong KPI response

Project KPI member response hiện tại có thêm:

```ts
interface Achievement {
  score?: number;
  onTimeRate?: number;
  pointCompletionRate?: number;
  otHours?: number;
  completedTasks?: number;
}
```

Nguyên tắc:

- mỗi field là phần trăm đạt được so với target tương ứng
- backend `round()` và không cap 100, nên có thể lớn hơn `100`
- nếu target field không tồn tại hoặc `<= 0` thì field đó không xuất hiện
- `achievementRate` vẫn được giữ để backward compatible và chính là alias của `achievement.score`

## 7. Endpoints

### 7.1. Bulk assign / upsert - `POST /v1/kpi-targets`

Tạo hoặc cập nhật target theo key hữu danh của scope:

- `USER`: `(organizationId, projectId, scopeType, userId, period, periodStart)`
- `ROLE` / `PROJECT_ROLE`: `(organizationId, projectId, scopeType, roleId, period, periodStart)`

#### Request body

```ts
{
  scopeType: 'USER' | 'ROLE' | 'PROJECT_ROLE';

  userIds?: string[];   // bắt buộc khi scopeType = USER
  roleIds?: string[];   // bắt buộc khi scopeType = ROLE | PROJECT_ROLE
  projectId?: string;   // bắt buộc khi PROJECT_ROLE, optional khi USER, không được gửi khi ROLE

  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  periodStart: string;  // YYYY-MM-DD
  periodEnd: string;    // YYYY-MM-DD

  targetScore?: number;               // 0-100
  targetPointCompletionRate?: number; // 0-100
  targetOnTimeRate?: number;          // 0-100
  targetOtHours?: number;             // >= 0
  targetCompletedTasks?: number;      // int >= 0
  maxOverdueTasks?: number;           // int >= 0
  requireZeroOverdue?: boolean;       // default false

  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  note?: string;                      // <= 1000 chars
}
```

#### Validation rules quan trọng

- `periodStart` phải `<= periodEnd`
- `scopeType = USER`:
  - bắt buộc có `userIds`
  - không được gửi `roleIds`
- `scopeType = ROLE`:
  - bắt buộc có `roleIds`
  - không được gửi `projectId`
  - không được gửi `userIds`
- `scopeType = PROJECT_ROLE`:
  - bắt buộc có `roleIds`
  - bắt buộc có `projectId`
  - không được gửi `userIds`

#### Response 201

```json
{
  "statusCode": 201,
  "message": "Assigned KPI targets successfully",
  "data": [
    {
      "id": "target-id",
      "organizationId": "org-id",
      "projectId": "project-id",
      "scopeType": "PROJECT_ROLE",
      "userId": null,
      "roleId": "role-id",
      "period": "MONTHLY",
      "periodStart": "2026-04-01",
      "periodEnd": "2026-04-30",
      "targetScore": 85,
      "targetOnTimeRate": 90,
      "requireZeroOverdue": true,
      "status": "ACTIVE",
      "createdAt": "2026-04-15T08:00:00.000Z",
      "updatedAt": "2026-04-15T08:00:00.000Z"
    }
  ]
}
```

#### Ví dụ 1 - gán cho user

```http
POST /api/v1/kpi-targets
Content-Type: application/json

{
  "scopeType": "USER",
  "userIds": ["11111111-1111-1111-1111-111111111111"],
  "projectId": "22222222-2222-2222-2222-222222222222",
  "period": "MONTHLY",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-30",
  "targetScore": 85,
  "targetOnTimeRate": 90,
  "requireZeroOverdue": true
}
```

#### Ví dụ 2 - gán target mặc định cho role cấp org

```http
POST /api/v1/kpi-targets
Content-Type: application/json

{
  "scopeType": "ROLE",
  "roleIds": ["33333333-3333-3333-3333-333333333333"],
  "period": "MONTHLY",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-30",
  "targetScore": 80,
  "targetCompletedTasks": 12
}
```

### 7.2. Clone từ kỳ trước - `POST /v1/kpi-targets/clone`

Dùng để copy target sang kỳ mới.

#### Request body

```ts
{
  fromPeriodStart: string; // YYYY-MM-DD
  toPeriodStart: string;   // YYYY-MM-DD
  userIds?: string[];      // chỉ filter với source rows có scopeType = USER
  projectId?: string;      // nếu gửi thì chỉ clone trong project đó
}
```

Behavior:

- clone cả `USER`, `ROLE`, `PROJECT_ROLE`
- `userIds` không lọc role-scoped rows
- nếu bản ghi đích đã tồn tại thì backend update/upsert bản ghi đó
- `periodEnd` của bản ghi mới được tính bằng cách giữ nguyên duration của bản ghi nguồn
- sau clone sẽ emit notification và ghi audit log

#### Response 201

```json
{
  "statusCode": 201,
  "message": "Cloned KPI targets successfully",
  "data": [/* KpiTargetResponse[] */]
}
```

### 7.3. List - `GET /v1/kpi-targets`

Danh sách target trong org, mặc định không trả về bản ghi đã soft delete.

#### Query params

| Param | Type | Mô tả |
|---|---|---|
| `userId` | UUID | Filter theo user |
| `roleId` | UUID | Filter theo role |
| `projectId` | UUID | Filter theo project |
| `scopeType` | enum | `USER` / `ROLE` / `PROJECT_ROLE` |
| `period` | enum | `MONTHLY` / `QUARTERLY` / `YEARLY` |
| `status` | enum | `DRAFT` / `ACTIVE` / `ARCHIVED` |
| `activeOn` | `YYYY-MM-DD` | Chỉ lấy target có kỳ chứa ngày này |

#### Response 200

```json
{
  "statusCode": 200,
  "message": "Fetched KPI targets successfully",
  "data": [/* KpiTargetResponse[] */]
}
```

`data` được sắp xếp theo `periodStart DESC`, sau đó `updatedAt DESC`.

### 7.4. Target của tôi - `GET /v1/kpi-targets/me`

Trả về danh sách target `ACTIVE` hữu lực đang áp dụng cho user hiện tại.

Khác với phiên bản cũ:

- không chỉ trả về target `USER`
- có thể trả về target từ `ROLE` hoặc `PROJECT_ROLE`
- chỉ trả về target effective sau khi resolve precedence
- có thêm `resolvedFrom` để UI biết target hiện tại đến từ đâu

#### Response 200

```json
{
  "statusCode": 200,
  "message": "Fetched my KPI targets successfully",
  "data": [
    {
      "id": "target-id",
      "scopeType": "ROLE",
      "projectId": null,
      "userId": null,
      "roleId": "role-id",
      "period": "MONTHLY",
      "periodStart": "2026-04-01",
      "periodEnd": "2026-04-30",
      "resolvedFrom": {
        "targetId": "target-id",
        "scopeType": "ROLE",
        "projectId": null,
        "userId": null,
        "roleId": "role-id"
      }
    }
  ]
}
```

### 7.5. Chi tiết - `GET /v1/kpi-targets/:id`

User có thể xem:

- target đó chính mình được assign theo `USER`
- target `ROLE` / `PROJECT_ROLE` đang áp dụng cho mình
- hoặc target bất kỳ nếu có quyền manage/view phù hợp

Nếu target đã bị soft delete thì endpoint xem như không tồn tại.

#### Response 200

```json
{
  "statusCode": 200,
  "message": "Fetched KPI target successfully",
  "data": {
    "id": "target-id",
    "status": "ARCHIVED",
    "snapshot": {
      "actualScore": 92,
      "actualOnTimeRate": 88,
      "actualPointCompletionRate": 95,
      "actualOtHours": 6,
      "actualCompletedTasks": 14,
      "actualOverdueTasks": 1,
      "archivedAt": "2026-05-01T00:10:00.000Z"
    }
  }
}
```

### 7.6. Update - `PATCH /v1/kpi-targets/:id`

Cập nhật metric và metadata của một target đã tồn tại.

#### Body

```ts
{
  targetScore?: number;
  targetPointCompletionRate?: number;
  targetOnTimeRate?: number;
  targetOtHours?: number;
  targetCompletedTasks?: number;
  maxOverdueTasks?: number;
  requireZeroOverdue?: boolean;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  note?: string;
}
```

#### Response 200

```json
{
  "statusCode": 200,
  "message": "Updated KPI target successfully",
  "data": {/* KpiTargetResponse */}
}
```

Cập nhật thành công sẽ:

- ghi audit log
- emit `kpi-target.assigned` với `changeType = updated`
- gửi in-app + email notification cho người bị ảnh hưởng

### 7.7. Delete - `DELETE /v1/kpi-targets/:id`

Endpoint này là soft delete, không xóa cứng.

Backend sẽ:

- set `deletedAt`, `deletedBy`
- giữ lại lịch sử để audit/tranh chấp
- mặc định không trả về bản ghi này ở list/detail sau khi xóa

#### Response 200

```json
{
  "statusCode": 200,
  "message": "Deleted KPI target successfully"
}
```

## 8. Tích hợp với KPI analytics

### 8.1. Project KPI members

Project KPI hiện có 4 endpoint chính:

| Endpoint | Mục đích | Ai được gọi |
|---|---|---|
| `GET /v1/projects/:projectId/kpi/overview` | KPI overview của project | PM / org admin / user có quyền view all |
| `GET /v1/projects/:projectId/kpi/members` | KPI của toàn bộ member trong project | PM / org admin / user có quyền view all |
| `GET /v1/projects/:projectId/kpi/members/:userId` | KPI chi tiết của 1 member | PM / org admin / user có quyền view all, hoặc chính user đó |
| `GET /v1/projects/:projectId/kpi/me` | KPI chi tiết của current user trong project | active project member |

#### `GET /v1/projects/:projectId/kpi/me`

Đây là endpoint ưu tiên cho employee/member thường.

Query params:

```ts
{
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}
```

Response dùng `ProjectMemberKpiDetailResponse`, bao gồm:

```ts
interface ProjectMemberKpiDetailResponse extends ProjectMemberKpiResponse {
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  pointsByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  recentTasks: Array<{
    taskId: string;
    title: string;
    slug?: string;
    statusName: string;
    priority: string;
    estimatedPoint?: number;
    estimatedHours?: number;
    dueDate?: string;
    dueState: string;
    completedAt?: string;
  }>;
}
```

#### `GET /v1/projects/:projectId/kpi/members`

Endpoint này hiện trả về thêm:

```ts
interface ProjectMemberKpiResponse {
  target?: {
    id: string;
    period: string;
    periodStart: string;
    periodEnd: string;
    targetScore?: number;
    targetPointCompletionRate?: number;
    targetOnTimeRate?: number;
    targetOtHours?: number;
    targetCompletedTasks?: number;
    maxOverdueTasks?: number;
    requireZeroOverdue: boolean;
  };

  achievement?: {
    score?: number;
    onTimeRate?: number;
    pointCompletionRate?: number;
    otHours?: number;
    completedTasks?: number;
  };

  achievementRate?: number; // alias của achievement.score
}
```

Frontend không cần tự tính:

- `achievement.score`
- `achievement.onTimeRate`
- `achievement.pointCompletionRate`
- `achievement.otHours`
- `achievement.completedTasks`

Project member detail response cũng dùng lại cấu trúc này.

#### Authorization rules

- PM / org admin / user có quyền view all:
  - xem được `overview`
  - xem được full `members`
  - xem được `members/:userId` của bất kỳ member nào
- Employee/member thường:
  - xem được `GET /v1/projects/:projectId/kpi/me`
  - xem được `GET /v1/projects/:projectId/kpi/members/:ownUserId`
  - không xem được `GET /v1/projects/:projectId/kpi/members/:otherUserId`
  - không xem được `GET /v1/projects/:projectId/kpi/members`
- Non-member hoặc member không active:
  - không xem được `/kpi/me`
  - không xem được self detail

Lưu ý bảo mật:

- backend không trust `userId` từ client cho self-view
- với `/kpi/me`, `userId` luôn lấy từ token
- với `/kpi/members/:userId`, nếu caller không có quyền view all thì chỉ được phép xem khi `:userId === currentUserId`
- project member phải là active member của project

### 8.2. Period-based actuals

Khi gọi KPI analytics với `dateFrom/dateTo`, backend tính actual theo window đó:

- task completed trong kỳ dựa trên `completed_at`
- backlog / overdue được chốt theo trạng thái tại `periodEnd` và `due_date`
- OT vẫn tính theo window hiện tại

Điều này quan trọng khi frontend muốn hiển thị báo cáo tháng/quý/năm thay vì chỉ số "tại thời điểm hiện tại".

### 8.3. Gợi ý tích hợp frontend cho project KPI

- Nếu user có quyền view all:
  - gọi `GET /v1/projects/:projectId/kpi/members`
  - render full member table như hiện tại
- Nếu user chỉ là project member thường:
  - gọi `GET /v1/projects/:projectId/kpi/me`
  - render KPI card/detail của chính mình
- Nếu frontend đang dùng route detail theo user:
  - có thể gọi `GET /v1/projects/:projectId/kpi/members/:userId`
  - nhưng chỉ nên dùng cho self nếu caller không có quyền view all

## 9. Notification và archive behavior

Không có endpoint riêng, nhưng frontend nên biết:

- khi create/update/clone target, backend emit `kpi-target.assigned`
- listener sẽ gửi in-app notification và email cho user bị ảnh hưởng
- sau khi target hết kỳ, cron archive sẽ chốt `actual*`, lưu vào snapshot và chuyển `status = ARCHIVED`

Nếu frontend cần hiển thị lịch sử target đã kết thúc, hãy đọc các field:

- `status`
- `snapshot`
- `deletedAt`
- `deletedBy`

## 10. Error cần lưu ý

| Tình huống | HTTP | Ghi chú |
|---|---|---|
| `periodStart > periodEnd` | 400 | `KPT001` |
| sai scope validation | 400 | Ví dụ thiếu `roleIds`, gửi `projectId` cho `ROLE`, gửi `userIds` cho `PROJECT_ROLE` |
| không đủ quyền | 403 | Manage/view permission |
| target không tồn tại hoặc đã soft delete | 404 | Detail/update/delete |

## 11. TypeScript client mẫu

```ts
import axios from '@/lib/axios';

export interface ApiResponse<T> {
  statusCode: number;
  message?: string;
  data?: T;
}

export interface UpsertKpiTargetBody {
  scopeType: 'USER' | 'ROLE' | 'PROJECT_ROLE';
  userIds?: string[];
  roleIds?: string[];
  projectId?: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  periodStart: string;
  periodEnd: string;
  targetScore?: number;
  targetPointCompletionRate?: number;
  targetOnTimeRate?: number;
  targetOtHours?: number;
  targetCompletedTasks?: number;
  maxOverdueTasks?: number;
  requireZeroOverdue?: boolean;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  note?: string;
}

export interface CloneKpiTargetBody {
  fromPeriodStart: string;
  toPeriodStart: string;
  userIds?: string[];
  projectId?: string;
}

export const kpiTargetApi = {
  bulkAssign: (body: UpsertKpiTargetBody) =>
    axios.post<ApiResponse<any[]>>('/v1/kpi-targets', body),

  clone: (body: CloneKpiTargetBody) =>
    axios.post<ApiResponse<any[]>>('/v1/kpi-targets/clone', body),

  list: (params?: Record<string, unknown>) =>
    axios.get<ApiResponse<any[]>>('/v1/kpi-targets', { params }),

  mine: () =>
    axios.get<ApiResponse<any[]>>('/v1/kpi-targets/me'),

  detail: (id: string) =>
    axios.get<ApiResponse<any>>(`/v1/kpi-targets/${id}`),

  update: (id: string, body: Partial<UpsertKpiTargetBody>) =>
    axios.patch<ApiResponse<any>>(`/v1/kpi-targets/${id}`, body),

  remove: (id: string) =>
    axios.delete<ApiResponse<void>>(`/v1/kpi-targets/${id}`),
};
```

## 12. Gợi ý UI flow

### Màn "Giao KPI"

1. Chọn scope:
   - `USER`
   - `ROLE`
   - `PROJECT_ROLE`
2. Nếu `USER`: chọn `userIds[]`
3. Nếu `ROLE` / `PROJECT_ROLE`: chọn `roleIds[]`
4. Nếu `PROJECT_ROLE`: bắt buộc chọn `projectId`
5. Điền target metrics
6. Submit và xử lý response thành công như các API chuẩn khác

### Màn "KPI của tôi"

1. Gọi `GET /v1/kpi-targets/me`
2. Hiển thị `resolvedFrom` để user biết target đến từ user override hay role default
3. Nếu cần xem lịch sử target đã kết thúc, dùng `GET /v1/kpi-targets` hoặc `GET /v1/kpi-targets/:id` và đọc thêm `snapshot`

### Màn "Theo dõi team"

- Dùng `GET /v1/projects/:projectId/kpi/members`
- Render trực tiếp `target`, `achievement`, `achievementRate`
- Không cần tính client-side

### Màn "KPI project của tôi"

- Với employee/member thường, dùng `GET /v1/projects/:projectId/kpi/me`
- Có thể truyền `dateFrom` và `dateTo` để xem KPI theo kỳ
- Render trực tiếp `target`, `achievement`, `achievementRate`, `recentTasks`
