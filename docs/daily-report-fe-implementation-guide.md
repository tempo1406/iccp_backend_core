# Daily Report - FE Implementation Guide

Tai lieu nay la ban FE implementation guide doi chieu truc tiep voi backend hien tai:

- `src/modules/project/task-management/task-worklog.controller.ts`
- `src/modules/project/task-management/task-worklog.service.ts`
- `src/modules/project/task-management/dto/request/create-task-worklog.request.ts`
- `src/modules/project/task-management/dto/request/update-task-worklog.request.ts`
- `src/modules/project/task-management/dto/response/task-worklog.response.ts`
- `src/modules/project/task-management/dto/response/task.response.ts`
- `src/modules/daily-report/daily-report.controller.ts`
- `src/modules/daily-report/daily-report.service.ts`
- `src/modules/daily-report/dto/request/*.ts`
- `src/modules/daily-report/dto/response/*.ts`

Muc tieu: FE co the cap nhat UI de ho tro luong `worklog + daily report` ma khong can doc source backend.

> Pham vi MVP hien tai:
>
> - `worklog` la du lieu goc de log thoi gian tren task.
> - `daily report` la snapshot theo `project + user + date`, duoc generate tu worklog trong project do.
> - `quarterly/org report` hien tai khong bi anh huong.

## 1) Base config

- Base URL: `/api/v1`
- Auth header: `Authorization: Bearer <access_token>`
- Tenant header bat buoc: `x-organization-id: <organization_uuid>`

Tat ca endpoint tra ve envelope `ApiResponseDto<T>`:

```json
{
  "statusCode": 200,
  "message": "string",
  "data": {}
}
```

## 2) Tong quan thay doi cho FE

Backend da them 3 nhom thay doi:

1. Task response co field moi:

- `actualLoggedMinutes`

2. Them worklog APIs duoi task:

- `POST /projects/:projectId/tasks/:taskId/worklogs`
- `GET /projects/:projectId/tasks/:taskId/worklogs`
- `PUT /projects/:projectId/tasks/:taskId/worklogs/:worklogId`
- `DELETE /projects/:projectId/tasks/:taskId/worklogs/:worklogId`

3. Them daily report APIs:

- `GET /projects/:projectId/daily-reports/me`
- `POST /projects/:projectId/daily-reports/me/generate`
- `PUT /projects/:projectId/daily-reports/:reportId`
- `POST /projects/:projectId/daily-reports/:reportId/submit`
- `GET /projects/:projectId/daily-reports`
- `GET /projects/:projectId/daily-reports/:reportId/comments`
- `POST /projects/:projectId/daily-reports/:reportId/comments`
- `POST /projects/:projectId/daily-reports/:reportId/mark-seen`

4. Cap nhat project daily report list:

- them pagination
- them filter `status`
- them filter `search`

5. Cap nhat daily report notifications:

- submit report se tao in-app notification cho viewer co quyen
- reminder chua submit se gui in-app notification + email
- khi PM comment report, nguoi gui report se nhan in-app notification
- khi PM mark seen report, nguoi gui report se nhan in-app notification

## 3) Domain model cho FE

### 3.1 Task lifecycle vs worklog vs daily report

- `actualStart`: moc bat dau thuc te cua ca task
- `actualEnd`: moc ket thuc thuc te cua ca task
- `actualLoggedMinutes`: tong so phut da log vao task; voi task cha, field nay bao gom ca thoi gian roll-up tu subtask
- `worklog`: tung entry lam viec thuc te theo ngay/task/user
- `daily report`: snapshot report theo ngay cua 1 user trong 1 project, duoc build tu worklog cua project do

Noi ngan gon:

- `Task` tra loi cau hoi: task da bat dau chua, da xong chua, da log tong cong bao nhieu phut
- `Worklog` tra loi cau hoi: hom nay da lam gi tren task nao, mat bao lau
- `Daily report` tra loi cau hoi: trong project nay, hom do da lam gi, blocker gi, mai lam gi

### 3.2 Quy uoc quan trong

- `worklog` la source of truth cho time tracking
- `daily report` khong thay the worklog
- `daily report.items[]` la snapshot copy tu worklog tai thoi diem generate
- Sau khi report da `submitted`, backend khong auto rebuild report nua
- Sau khi report da `submitted`, PM/viewer co the comment va mark report da xem

## 4) Permission map va rule hien tai

### 4.1 Daily report

- `GET /projects/:projectId/daily-reports`: can `projects.daily_reports.view_all`
- `GET /projects/:projectId/daily-reports/:reportId/comments`: report owner hoac user co `projects.daily_reports.view_all`
- `POST /projects/:projectId/daily-reports/:reportId/comments`: can `projects.daily_reports.view_all`
- `POST /projects/:projectId/daily-reports/:reportId/mark-seen`: can `projects.daily_reports.view_all`

Cho cac endpoint `me/*`, backend hien tai khong dat `@RequirePermission`, nhung user phai la active member trong project.

### 4.2 Worklog

Worklog endpoints hien tai khong dat `@RequirePermission`, nhung backend co cac rule sau:

- User phai thuoc project
- User chi co the tao/sua worklog tren task/subtask ma `userId` cua worklog la `assignedTo`
- Neu tao hoac sua worklog cho nguoi khac thi actor can permission `projects.tasks.log_time`, va nguoi duoc log ho van phai la assignee cua task/subtask do
- Neu xem worklog cua nguoi khac thi actor can quyen rong hon trong service (`projects.tasks.log_time` hoac task view du dieu kien)

Khuyen nghi FE:

- Neu user khong co `projects.daily_reports.view_all` thi an man page/xem report cua member khac trong project
- Neu user khong co `projects.tasks.log_time` thi khong hien UI "log for another member"
- Xem chi tiet rule moi trong `docs/task-worklog-assignee-subtask-fe-guide.md`

## 5) Task response thay doi

Task response co them field:

| Field                 | Type     | Meaning                                      |
| --------------------- | -------- | -------------------------------------------- |
| `actualLoggedMinutes` | `number` | Tong thoi gian da log tren task, don vi phut |

Vi du:

```json
{
  "id": "b56bc271-dd9c-47ea-95d6-26ddf2f64fca",
  "title": "Design API contract",
  "status": "In Progress",
  "estimatedHours": 4.5,
  "actualStart": "2026-04-18T01:00:00.000Z",
  "actualEnd": null,
  "actualLoggedMinutes": 135
}
```

FE co the dung field nay de:

- hien total logged time tren task detail
- hien progress phu tro tren task board/list
- hien quick summary truoc khi mo tab worklog

## 6) Worklog APIs

### 6.1 Tao worklog

- Endpoint: `POST /api/v1/projects/:projectId/tasks/:taskId/worklogs`

Request body:

```json
{
  "workDate": "2026-04-18",
  "startedAt": "2026-04-18T01:00:00.000Z",
  "endedAt": "2026-04-18T02:30:00.000Z",
  "description": "Implemented daily report draft generation",
  "progressPercent": 60,
  "isBlocker": false
}
```

Hoac body theo kieu khong gui start/end:

```json
{
  "workDate": "2026-04-18",
  "durationMinutes": 90,
  "description": "API integration and response mapping",
  "progressPercent": 60,
  "isBlocker": false
}
```

Neu actor duoc phep log cho nguoi khac:

```json
{
  "userId": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
  "workDate": "2026-04-18",
  "durationMinutes": 90,
  "description": "Support log for teammate"
}
```

Rule:

- `workDate` bat buoc format `YYYY-MM-DD`
- `startedAt` va `endedAt` phai di cung nhau
- Neu khong gui du cap `startedAt/endedAt` thi phai gui `durationMinutes`
- `progressPercent` trong khoang `0..100`
- `durationMinutes` trong khoang `1..1440`

Response `data`:

```json
{
  "id": "70af8ea3-19d4-466a-a4d3-04d181038833",
  "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
  "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
  "taskId": "b56bc271-dd9c-47ea-95d6-26ddf2f64fca",
  "taskTitle": "Design API contract",
  "taskSlug": "ICCP-23",
  "userId": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
  "userDisplayName": "Nguyen Van A",
  "userEmail": "member@example.com",
  "workDate": "2026-04-18",
  "startedAt": "2026-04-18T01:00:00.000Z",
  "endedAt": "2026-04-18T02:30:00.000Z",
  "durationMinutes": 90,
  "description": "Implemented daily report draft generation",
  "progressPercent": 60,
  "isBlocker": false,
  "source": "manual",
  "reportedDailyReportId": null,
  "isSubmitted": false,
  "createdAt": "2026-04-18T02:30:05.000Z",
  "updatedAt": "2026-04-18T02:30:05.000Z"
}
```

### 6.2 Lay danh sach worklog cua task

- Endpoint: `GET /api/v1/projects/:projectId/tasks/:taskId/worklogs`
- Query optional:
  - `workDate=YYYY-MM-DD`
  - `userId=<uuid>`

Vi du:

- `GET /api/v1/projects/:projectId/tasks/:taskId/worklogs`
- `GET /api/v1/projects/:projectId/tasks/:taskId/worklogs?workDate=2026-04-18`
- `GET /api/v1/projects/:projectId/tasks/:taskId/worklogs?userId=<uuid>`

Response `data` la `TaskWorklogResponse[]`.

### 6.3 Update worklog

- Endpoint: `PUT /api/v1/projects/:projectId/tasks/:taskId/worklogs/:worklogId`
- Body la partial update

Vi du:

```json
{
  "durationMinutes": 120,
  "description": "Adjusted duration after final review",
  "progressPercent": 80
}
```

### 6.4 Delete worklog

- Endpoint: `DELETE /api/v1/projects/:projectId/tasks/:taskId/worklogs/:worklogId`

Response envelope khong co `data`.

### 6.5 Field contract cho FE

| UI field            | API field               | Type           | Notes                        |
| ------------------- | ----------------------- | -------------- | ---------------------------- |
| Work date           | `workDate`              | `string`       | Format `YYYY-MM-DD`          |
| Start time          | `startedAt`             | `string`       | ISO datetime                 |
| End time            | `endedAt`               | `string`       | ISO datetime                 |
| Duration            | `durationMinutes`       | `number`       | Don vi phut                  |
| Description         | `description`           | `string`       | Optional                     |
| Progress            | `progressPercent`       | `number`       | `0..100`                     |
| Blocker flag        | `isBlocker`             | `boolean`      | Optional                     |
| Log for member      | `userId`                | `uuid`         | Chi dung khi actor duoc phep |
| Submitted to report | `isSubmitted`           | `boolean`      | Read-only flag               |
| Linked report       | `reportedDailyReportId` | `uuid \| null` | Read-only flag               |

### 6.6 Worklog UI recommendation

- Nen co 2 mode input:
  - mode 1: nhap `start/end`
  - mode 2: nhap `durationMinutes`
- Chi hien form log work khi `task.assignedTo === currentUserId`, tru truong hop user co UI log ho assignee va co quyen `projects.tasks.log_time`
- Neu task detail da co `actualLoggedMinutes`, co the render tong phut ngay trong header/task meta; voi task cha, day la tong gom ca subtask
- Nen render badge `Submitted` neu `isSubmitted = true`
- Nen co filter theo `workDate` va `user`

## 7) Daily report APIs

## 7.1 Get my report

- Endpoint: `GET /api/v1/projects/:projectId/daily-reports/me`
- Query optional:
  - `date=YYYY-MM-DD`

Rule:

- Neu chua co report cho `project + user + ngay` do, backend se auto generate draft tu worklog cua user trong project roi tra ve draft do
- Neu da co report thi backend tra report hien tai

Response `data`:

```json
{
  "id": "45df565a-3367-4bd4-9f80-a0344d310807",
  "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
  "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
  "projectName": "Project Phoenix",
  "userId": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
  "userDisplayName": "Nguyen Van A",
  "userEmail": "member@example.com",
  "reportDate": "2026-04-18",
  "status": "draft",
  "summary": null,
  "blockers": null,
  "planTomorrow": null,
  "totalLoggedMinutes": 180,
  "submittedAt": null,
  "isSeen": false,
  "seenByUserId": null,
  "seenByDisplayName": null,
  "seenByEmail": null,
  "seenAt": null,
  "items": [
    {
      "id": "64f0b72f-c216-4018-9f55-2be4e063cf25",
      "type": "worklog",
      "worklogId": "70af8ea3-19d4-466a-a4d3-04d181038833",
      "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
      "projectName": "Project Phoenix",
      "taskId": "b56bc271-dd9c-47ea-95d6-26ddf2f64fca",
      "taskTitle": "Design API contract",
      "taskSlug": "ICCP-23",
      "content": "Implemented daily report draft generation",
      "workDate": "2026-04-18",
      "startedAt": "2026-04-18T01:00:00.000Z",
      "endedAt": "2026-04-18T02:30:00.000Z",
      "durationMinutes": 90,
      "progressPercent": 60,
      "isBlocker": false,
      "displayOrder": 1
    }
  ],
  "comments": [],
  "createdAt": "2026-04-18T03:00:00.000Z",
  "updatedAt": "2026-04-18T03:00:00.000Z"
}
```

### 7.2 Generate/rebuild draft

- Endpoint: `POST /api/v1/projects/:projectId/daily-reports/me/generate`
- Query optional:
  - `date=YYYY-MM-DD`

Rule:

- Neu report chua co, backend tao draft moi
- Neu report da co va van la `draft`, backend rebuild `items[]` tu worklog trong project do va giu lai:
  - `summary`
  - `blockers`
  - `planTomorrow`
- Neu report da `submitted` hoac `locked`, backend tra nguyen report hien tai, khong rebuild

FE nen dat action nay thanh:

- `Refresh from worklogs`
- `Regenerate draft`

### 7.3 Update draft

- Endpoint: `PUT /api/v1/projects/:projectId/daily-reports/:reportId`

Body:

```json
{
  "summary": "Completed backend draft generation and worklog CRUD.",
  "blockers": "Still waiting for frontend payload contract.",
  "planTomorrow": "Finalize submit flow and connect manager view."
}
```

Rule:

- Chi sua duoc khi report dang `draft`
- `summary`, `blockers`, `planTomorrow` la partial update

### 7.4 Submit report

- Endpoint: `POST /api/v1/projects/:projectId/daily-reports/:reportId/submit`

Rule:

- Chi submit duoc khi report dang `draft`
- Backend set:
  - `status = submitted`
  - `submittedAt = now`
  - cac worklog linked trong `items[]` se duoc mark:
    - `isSubmitted = true`
    - `reportedDailyReportId = <reportId>`

### 7.5 Project reports

- Endpoint: `GET /api/v1/projects/:projectId/daily-reports`
- Permission: `projects.daily_reports.view_all`
- Query optional:
  - `date=YYYY-MM-DD`
  - `userId=<uuid>`
  - `status=draft|submitted|locked`
  - `search=<string>`
  - `page=<number>` (default `1`)
  - `limit=<number>` (default `10`, max `100`)
  - `sortBy=reportDate|createdAt|submittedAt|totalLoggedMinutes`
  - `sortOrder=ASC|DESC`

Response `data` la `PaginatedResponse<DailyReportResponse>`:

```json
{
  "data": [
    {
      "id": "45df565a-3367-4bd4-9f80-a0344d310807",
      "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
      "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
      "projectName": "Project Phoenix",
      "userId": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
      "userDisplayName": "Nguyen Van A",
      "userEmail": "member@example.com",
      "reportDate": "2026-04-18",
      "status": "submitted",
      "summary": "Completed backend draft generation and worklog CRUD.",
      "blockers": null,
      "planTomorrow": "Finalize submit flow and connect manager view.",
      "totalLoggedMinutes": 180,
      "submittedAt": "2026-04-18T09:15:00.000Z",
      "items": [],
      "createdAt": "2026-04-18T03:00:00.000Z",
      "updatedAt": "2026-04-18T09:15:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Rule:

- Endpoint hien tai tra ca `draft` va `submitted`
- FE co the filter theo `status`
- `search` se match tren:
  - `userDisplayName` (first name + last name)
  - `userEmail`
  - `summary`
  - `blockers`
  - `planTomorrow`
- Pagination duoc apply sau khi filter

### 7.6 Daily report comments

#### 7.6.1 Get comments

- Endpoint: `GET /api/v1/projects/:projectId/daily-reports/:reportId/comments`

Rule:

- report owner co the xem comment thread cua report cua minh
- PM/viewer co `projects.daily_reports.view_all` co the xem comment thread cua report trong project

Response `data` la `DailyReportCommentResponse[]`:

```json
[
  {
    "id": "d4d5f9fd-2900-4f4b-ac67-c92fb7cb0467",
    "dailyReportId": "45df565a-3367-4bd4-9f80-a0344d310807",
    "author": {
      "id": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
      "displayName": "Project Manager",
      "email": "pm@example.com",
      "avatarUrl": null
    },
    "content": "Please clarify blocker number 2 and share the expected fix plan.",
    "createdAt": "2026-04-18T13:00:00.000Z"
  }
]
```

#### 7.6.2 Add comment

- Endpoint: `POST /api/v1/projects/:projectId/daily-reports/:reportId/comments`

Body:

```json
{
  "content": "Please clarify blocker number 2 and share the expected fix plan."
}
```

Rule:

- chi PM/viewer co `projects.daily_reports.view_all` moi duoc comment
- khong duoc comment vao report cua chinh minh
- chi comment duoc khi report da `submitted` hoac `locked`
- backend se trim text; comment rong sau khi trim se bi reject

#### 7.6.3 Mark seen

- Endpoint: `POST /api/v1/projects/:projectId/daily-reports/:reportId/mark-seen`

Rule:

- chi PM/viewer co `projects.daily_reports.view_all` moi duoc mark seen
- khong duoc mark seen report cua chinh minh
- chi mark seen duoc khi report da `submitted` hoac `locked`
- response tra ve `DailyReportResponse` moi nhat sau khi cap nhat `seen`

### 7.7 Review metadata tren report

Sau khi PM/viewer mark seen, backend tra them cac field review state trong `DailyReportResponse`:

| Field               | Type                           | Meaning                                |
| ------------------- | ------------------------------ | -------------------------------------- |
| `isSeen`            | `boolean`                      | Report da duoc PM/viewer mark xem chua |
| `seenByUserId`      | `uuid \| null`                 | User id cua nguoi mark xem gan nhat    |
| `seenByDisplayName` | `string \| null`               | Ten hien thi cua nguoi mark xem        |
| `seenByEmail`       | `string \| null`               | Email cua nguoi mark xem               |
| `seenAt`            | `string \| null`               | Thoi diem mark xem                     |
| `comments`          | `DailyReportCommentResponse[]` | Toan bo review comments cua report     |

### 7.8 Notification update lien quan daily report

Backend da them 4 nhom notification:

1. Khi user submit daily report:

- viewer trong project co permission `projects.daily_reports.view_all` se nhan in-app notification
- notification type: `daily_report_submitted`

2. Khi den moc reminder ma user chua submit:

- member chua submit se nhan in-app notification
- dong thoi se duoc gui email notification
- notification type: `daily_report_reminder`

3. Khi PM/viewer comment vao report:

- owner cua report se nhan in-app notification
- notification type: `daily_report_commented`

4. Khi PM/viewer mark report da xem:

- owner cua report se nhan in-app notification
- notification type: `daily_report_seen`

FE can cap nhat notification center/list de doc 4 `type` moi nay.

#### 7.8.1 Notification list response

Daily report notification di qua endpoint notification hien co:

- `GET /api/v1/notifications`

Response item van dung contract notification chung, nhung `type` va `data` co them value moi.

Vi du `daily_report_submitted`:

```json
{
  "id": "5f1495d5-537a-4e1f-9a42-7f38f9407762",
  "type": "daily_report_submitted",
  "title": "Nguyen Van A submitted a daily report",
  "message": "Nguyen Van A submitted the daily report for 2026-04-18 in project Project Phoenix.",
  "content": null,
  "read": false,
  "campaignId": null,
  "sender": {
    "id": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
    "name": "Nguyen Van A",
    "avatarUrl": null
  },
  "data": {
    "module": "daily_report",
    "action": "daily_report_submitted",
    "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
    "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
    "projectSlug": "PP",
    "reportId": "45df565a-3367-4bd4-9f80-a0344d310807",
    "reportDate": "2026-04-18",
    "submittedBy": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60"
  },
  "createdAt": "2026-04-18T09:15:00.000Z"
}
```

Vi du `daily_report_reminder`:

```json
{
  "id": "caed7746-6fd3-4639-a340-9b347b7d8c4f",
  "type": "daily_report_reminder",
  "title": "Reminder: submit your daily report for Project Phoenix",
  "message": "You have not submitted your daily report for 2026-04-18 in project Project Phoenix.",
  "content": null,
  "read": false,
  "campaignId": null,
  "sender": null,
  "data": {
    "module": "daily_report",
    "action": "daily_report_reminder",
    "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
    "organizationName": "ICCP",
    "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
    "projectSlug": "PP",
    "reportDate": "2026-04-18"
  },
  "createdAt": "2026-04-18T08:45:00.000Z"
}
```

Vi du `daily_report_commented`:

```json
{
  "id": "d51d6b96-2a7c-4b2c-99bb-eab79e8c9f8b",
  "type": "daily_report_commented",
  "title": "Project Manager commented on your daily report",
  "message": "Project Manager commented on your daily report for 2026-04-18 in project Project Phoenix.",
  "content": null,
  "read": false,
  "campaignId": null,
  "sender": {
    "id": "9f8f196c-f204-4bbf-bbd2-9f927f0f9342",
    "name": "Project Manager",
    "avatarUrl": null
  },
  "data": {
    "module": "daily_report",
    "action": "daily_report_commented",
    "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
    "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
    "projectSlug": "PP",
    "reportId": "45df565a-3367-4bd4-9f80-a0344d310807",
    "reportDate": "2026-04-18",
    "commentId": "d4d5f9fd-2900-4f4b-ac67-c92fb7cb0467",
    "commentedBy": "9f8f196c-f204-4bbf-bbd2-9f927f0f9342"
  },
  "createdAt": "2026-04-18T13:00:00.000Z"
}
```

Vi du `daily_report_seen`:

```json
{
  "id": "5cae9d28-e690-4ea7-8639-5a2766c57607",
  "type": "daily_report_seen",
  "title": "Project Manager marked your daily report as seen",
  "message": "Project Manager marked your daily report for 2026-04-18 in project Project Phoenix as seen.",
  "content": null,
  "read": false,
  "campaignId": null,
  "sender": {
    "id": "9f8f196c-f204-4bbf-bbd2-9f927f0f9342",
    "name": "Project Manager",
    "avatarUrl": null
  },
  "data": {
    "module": "daily_report",
    "action": "daily_report_seen",
    "organizationId": "18d17aea-7e8c-4a58-8e56-74c2949dcdd6",
    "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
    "projectSlug": "PP",
    "reportId": "45df565a-3367-4bd4-9f80-a0344d310807",
    "reportDate": "2026-04-18",
    "seenBy": "9f8f196c-f204-4bbf-bbd2-9f927f0f9342"
  },
  "createdAt": "2026-04-18T13:05:00.000Z"
}
```

#### 7.8.2 Websocket payload

Neu FE dang nghe namespace notification realtime, payload moi van theo contract cu:

```json
{
  "id": "5f1495d5-537a-4e1f-9a42-7f38f9407762",
  "type": "daily_report_submitted",
  "title": "Nguyen Van A submitted a daily report",
  "message": "Nguyen Van A submitted the daily report for 2026-04-18 in project Project Phoenix.",
  "senderId": "4b6f223b-2e53-4698-aa8e-6570f6cb2f60",
  "senderName": "Nguyen Van A",
  "senderAvatarUrl": null,
  "data": {
    "module": "daily_report",
    "action": "daily_report_submitted",
    "projectId": "f8f1e2ff-7f9d-4ce2-9301-a497f376facd",
    "reportId": "45df565a-3367-4bd4-9f80-a0344d310807",
    "reportDate": "2026-04-18"
  },
  "createdAt": "2026-04-18T09:15:00.000Z"
}
```

FE khong can mo route moi cho notification. Chi can:

- map them 4 `type` moi
- dua theo `data.projectId`, `data.reportId`, `data.reportDate` de deep-link neu muon
- voi `daily_report_commented`, FE co the goi detail report hoac refetch comment thread bang `data.commentId`
- voi `daily_report_seen`, FE co the refetch report detail de cap nhat `isSeen`, `seenByDisplayName`, `seenAt`

## 8) Daily report enum va field contract

### 8.1 Report status

- `draft`
- `submitted`
- `locked`

Hien tai backend moi su dung thuc te:

- `draft`
- `submitted`

### 8.2 Report item type

- `worklog`
- `manual`

Hien tai backend MVP moi generate:

- `worklog`

### 8.3 Field map

| UI field          | API field                 | Type                           | Notes                          |
| ----------------- | ------------------------- | ------------------------------ | ------------------------------ |
| Project           | `projectId`               | `uuid`                         | Report scope theo project      |
| Project name      | `projectName`             | `string \| undefined`          | Hien tren header/report list   |
| Report date       | `reportDate`              | `string`                       | `YYYY-MM-DD`                   |
| Summary           | `summary`                 | `string \| null`               | User editable khi draft        |
| Blockers          | `blockers`                | `string \| null`               | User editable khi draft        |
| Plan tomorrow     | `planTomorrow`            | `string \| null`               | User editable khi draft        |
| Total logged time | `totalLoggedMinutes`      | `number`                       | Tong phut cua worklog ngay do  |
| Submit time       | `submittedAt`             | `string \| null`               | ISO datetime                   |
| Seen flag         | `isSeen`                  | `boolean`                      | PM/viewer da tick xem hay chua |
| Seen by           | `seenByDisplayName`       | `string \| null`               | Nguoi tick xem gan nhat        |
| Seen at           | `seenAt`                  | `string \| null`               | ISO datetime                   |
| Item content      | `items[].content`         | `string \| null`               | Copy tu worklog.description    |
| Item duration     | `items[].durationMinutes` | `number`                       | Don vi phut                    |
| Item progress     | `items[].progressPercent` | `number \| null`               | Optional                       |
| Item blocker      | `items[].isBlocker`       | `boolean`                      | Optional                       |
| Review comments   | `comments[]`              | `DailyReportCommentResponse[]` | Thread comment cua PM/viewer   |

## 9) FE flow de implement

### 9.1 Task detail page

Nen them tab/panel `Worklog`:

- list worklogs cua task
- form create/update/delete worklog
- tong `actualLoggedMinutes`

Suggested flow:

1. FE goi `GET /projects/:projectId/tasks/:taskId`
2. FE goi `GET /projects/:projectId/tasks/:taskId/worklogs`
3. User tao/sua/xoa worklog
4. Sau khi thanh cong:
   - refetch task detail de lay `actualLoggedMinutes` moi
   - refetch worklog list

### 9.2 Daily report page cua user

Suggested flow:

1. FE mo page daily report trong project, co san `projectId`, chon `date`
2. Goi `GET /projects/:projectId/daily-reports/me?date=YYYY-MM-DD`
3. Render:
   - `projectName`
   - tong logged minutes
   - list `items[]`
   - 3 text area: `summary`, `blockers`, `planTomorrow`
4. Khi user bam `Refresh from worklogs`:
   - goi `POST /projects/:projectId/daily-reports/me/generate?date=YYYY-MM-DD`
5. Khi user bam `Save draft`:
   - goi `PUT /projects/:projectId/daily-reports/:reportId`
6. Khi user bam `Submit`:
   - goi `POST /projects/:projectId/daily-reports/:reportId/submit`
7. Sau submit:
   - disable edit 3 text area
   - an nut regenerate va submit
   - hien badge `Submitted`
8. Sau khi PM/viewer comment hoac mark seen:
   - FE cua user can refetch `GET /projects/:projectId/daily-reports/me`
   - render khu review section:
     - `isSeen`
     - `seenByDisplayName`
     - `seenAt`
     - `comments[]`

### 9.3 Project daily reports page

Suggested flow:

1. Neu user co `projects.daily_reports.view_all`, hien menu/page xem report cua member trong project
2. Goi `GET /projects/:projectId/daily-reports?date=YYYY-MM-DD&page=1&limit=10`
3. Render danh sach report theo user
4. Co the filter bo sung theo:
   - `userId`
   - `status`
   - `search`
5. Dung `meta.total`, `meta.page`, `meta.totalPages` de render pagination
6. Khi mo detail report cua 1 member:
   - FE co the dung ngay `comments` trong `DailyReportResponse`
   - hoac goi rieng `GET /projects/:projectId/daily-reports/:reportId/comments`
7. PM/viewer co the:
   - goi `POST /projects/:projectId/daily-reports/:reportId/comments`
   - goi `POST /projects/:projectId/daily-reports/:reportId/mark-seen`

Khuyen nghi UI:

- group theo `submitted` va `draft`
- show `totalLoggedMinutes`
- show item list collapse/expand theo tung user
- show search box + status tabs/dropdown
- trong report detail/drawer, them review panel:
  - danh sach comments
  - input comment
  - nut `Mark as seen`
  - badge `Seen by <name>`

## 10) MVP caveat FE can biet

### 10.1 Submitted report khong auto sync lai

Sau khi report da `submitted`:

- backend khong rebuild report nua
- `GET /projects/:projectId/daily-reports/me` tra report da submit
- `POST /projects/:projectId/daily-reports/me/generate` cung khong rebuild neu report khong con `draft`

He qua:

- neu user sua worklog sau khi submit, submitted report co the khong con trung voi worklog moi

Khuyen nghi FE:

- sau khi report da submit, disable chinh sua report
- can nhac hien warning khi user sua worklog co `isSubmitted = true`
- khong nen tu dong hieu report se cap nhat theo worklog sau submit

### 10.2 Backend chua khoa hard worklog sau submit

Hien tai backend van cho sua/xoa worklog da duoc mark `isSubmitted = true`.

Do do:

- FE nen coi `isSubmitted` la warning/status badge
- Neu business muon khoa cung, backend se can bo sung o phase sau

### 10.3 Project report endpoint tra ca draft

Hien tai `GET /projects/:projectId/daily-reports` tra ca report `draft` va `submitted`.

Khuyen nghi FE:

- tach section:
  - `Submitted reports`
  - `Draft / not submitted yet`
- hoac dung filter `status`

### 10.4 Reminder notification khong phai email-only

Daily report reminder hien tai duoc gui:

- in-app notification
- email

Y nghia cho FE:

- notification center se thay item `daily_report_reminder`
- khong can cho FE tu trigger email reminder
- neu FE co badge/unread counter, reminder se tinh nhu notification binh thuong

### 10.5 Review notification cho report owner

Khi PM/viewer thuc hien review action:

- comment -> tao `daily_report_commented`
- mark seen -> tao `daily_report_seen`

Y nghia cho FE:

- notification center can map 2 type moi nay
- click notification nen deep-link vao report detail/comment drawer cua dung `projectId + reportId`
- neu user dang mo man hinh `My Daily Report`, co the refetch report detail khi nhan realtime payload nay

### 10.6 Seen state la last reviewer state

Hien tai backend luu:

- `seenByUserId`
- `seenAt`

Y nghia:

- day la trang thai "nguoi mark xem gan nhat", khong phai audit trail day du cua nhieu PM
- audit comment nam o `comments[]`

## 11) Example API calls

### 11.1 Tao worklog

```bash
curl -X POST "/api/v1/projects/<projectId>/tasks/<taskId>/worklogs" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>" \
  -H "Content-Type: application/json" \
  -d '{
    "workDate": "2026-04-18",
    "durationMinutes": 90,
    "description": "Implemented daily report draft generation",
    "progressPercent": 60,
    "isBlocker": false
  }'
```

### 11.2 Lay daily report cua toi

```bash
curl "/api/v1/projects/<projectId>/daily-reports/me?date=2026-04-18" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

### 11.3 Regenerate draft

```bash
curl -X POST "/api/v1/projects/<projectId>/daily-reports/me/generate?date=2026-04-18" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

### 11.4 Save draft

```bash
curl -X PUT "/api/v1/projects/<projectId>/daily-reports/<reportId>" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Completed backend draft generation and worklog CRUD.",
    "blockers": "Still waiting for frontend payload contract.",
    "planTomorrow": "Finalize submit flow and connect manager view."
  }'
```

### 11.5 Submit daily report

```bash
curl -X POST "/api/v1/projects/<projectId>/daily-reports/<reportId>/submit" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

### 11.6 Project daily reports

```bash
curl "/api/v1/projects/<projectId>/daily-reports?date=2026-04-18&page=1&limit=10&status=submitted&search=nguyen&sortBy=submittedAt&sortOrder=DESC" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

### 11.7 Lay comment cua report

```bash
curl "/api/v1/projects/<projectId>/daily-reports/<reportId>/comments" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

### 11.8 PM comment vao report

```bash
curl -X POST "/api/v1/projects/<projectId>/daily-reports/<reportId>/comments" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Please clarify blocker number 2 and share the expected fix plan."
  }'
```

### 11.9 PM mark report da xem

```bash
curl -X POST "/api/v1/projects/<projectId>/daily-reports/<reportId>/mark-seen" \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
```

## 12) Checklist cho FE

- [ ] Update task detail response typing voi `actualLoggedMinutes`
- [ ] Them tab/panel `Worklog` tren task detail
- [ ] Them form create/update/delete worklog
- [ ] Them page `My Daily Report` theo project
- [ ] Them action `Refresh from worklogs`
- [ ] Them action `Save draft`
- [ ] Them action `Submit`
- [ ] Disable report edit khi `status != draft`
- [ ] Them page `Project Daily Reports` cho user co permission `projects.daily_reports.view_all`
- [ ] Dung `PaginatedResponse` cho `GET /projects/:projectId/daily-reports`
- [ ] Them filter `status`
- [ ] Them filter `search`
- [ ] Them pagination UI cho project daily reports
- [ ] Hien warning khi worklog da co `isSubmitted = true`
- [ ] Them review panel tren daily report detail
- [ ] Hien `comments[]` trong report detail
- [ ] Hien `isSeen`, `seenByDisplayName`, `seenAt`
- [ ] Them action `Add comment` cho PM/viewer
- [ ] Them action `Mark as seen` cho PM/viewer
- [ ] Update notification center de map `daily_report_submitted`
- [ ] Update notification center de map `daily_report_reminder`
- [ ] Update notification center de map `daily_report_commented`
- [ ] Update notification center de map `daily_report_seen`
