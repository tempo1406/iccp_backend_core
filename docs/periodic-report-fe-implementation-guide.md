# Periodic Report - FE Implementation Guide

Tai lieu nay la ban FE implementation guide da doi chieu truc tiep voi backend hien tai:
- `src/modules/analytics/periodic-report/periodic-report.controller.ts`
- `src/modules/analytics/periodic-report/application/periodic-report.service.ts`
- `src/modules/analytics/periodic-report/dto/request/*.ts`
- `src/modules/analytics/periodic-report/dto/response/*.ts`
- `src/modules/analytics/periodic-report/domain/constants/periodic-report.constant.ts`
- `src/modules/organization/settings/constants/periodic-report-settings.constant.ts`
- `src/modules/organization/settings/org-settings.controller.ts`
- `src/modules/organization/settings/dto/request/upsert-org-settings.request.ts`
- `src/modules/organization/settings/dto/response/org-settings.response.ts`

Muc tieu: FE co the bat/tat, cau hinh, manual dispatch, xem history/detail cho **periodic report** (monthly | quarterly | yearly) ma khong phai doc source backend.

> Breaking change so voi ban truoc:
> - Module `quarterly-report` da doi thanh `periodic-report`.
> - URL prefix: `/analytics/reports/quarterly/**` → `/analytics/reports/periodic/**`.
> - Settings: 7 field phang `quarterlyReport*` da bi xoa, thay bang 1 array JSONB `periodicReportSchedules[]`. Moi phan tu la 1 schedule cho 1 frequency (`monthly` | `quarterly` | `yearly`). 1 org co the bat nhieu frequency cung luc.
> - `periodKey` gio ho tro 3 format: `YYYY-QN`, `YYYY-MNN`, `YYYY-Y`.
> - `history` list va detail co them field `frequency`.

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

## 2) Permission map theo endpoint

- `GET /org-config/settings`: `org_config.settings.view`
- `PUT /org-config/settings`: `org_config.settings.manage`
- `POST /analytics/reports/periodic/dispatch`: `analytics.reports.send`
- `GET /analytics/reports/periodic/history`: `analytics.reports.view`
- `GET /analytics/reports/periodic/history/:runId`: `analytics.reports.view`

Neu user khong co permission thi FE nen an action tuong ung thay vi de user bam roi nhan `403`.

## 3) Settings API cho periodic report

Periodic report duoc cau hinh chung trong org settings, khong co endpoint settings rieng.

### 3.1 Get settings

- Endpoint: `GET /api/v1/org-config/settings`
- FE doc truong `periodicReportSchedules` tu response:

```json
{
  "organizationId": "uuid",
  "periodicReportSchedules": [
    {
      "frequency": "quarterly",
      "enabled": true,
      "sendDelayDays": 1,
      "sendTime": "08:00",
      "recipientGroups": ["owner", "org_admin"],
      "customEmails": [],
      "channels": ["email"],
      "scopes": ["org_summary", "project_summary", "member_kpi"]
    },
    {
      "frequency": "monthly",
      "enabled": false,
      "sendDelayDays": 1,
      "sendTime": "08:00",
      "recipientGroups": ["owner"],
      "customEmails": [],
      "channels": ["email"],
      "scopes": ["org_summary"]
    }
  ],
  "updatedAt": "2026-04-17T08:00:00.000Z"
}
```

Rule quan trong:
- `periodicReportSchedules` la array. Moi phan tu la cau hinh doc lap cho 1 frequency.
- Neu array khong co schedule cho 1 frequency nao do, coi nhu `enabled = false` cho frequency do.
- Backend chi run auto scheduler cho schedule co `enabled = true`.
- Khong nen co 2 phan tu cung `frequency`. FE nen dedupe trong UI.

### 3.2 Update settings

- Endpoint: `PUT /api/v1/org-config/settings`
- Request body la `partial update`, nhung `periodicReportSchedules` la **full replace**: FE gui nguyen array moi.

Request body example:

```json
{
  "periodicReportSchedules": [
    {
      "frequency": "monthly",
      "enabled": true,
      "sendDelayDays": 2,
      "sendTime": "09:00",
      "recipientGroups": ["owner", "org_admin"],
      "customEmails": ["ceo@example.com"],
      "channels": ["email", "in_app"],
      "scopes": ["org_summary"]
    },
    {
      "frequency": "quarterly",
      "enabled": true,
      "sendDelayDays": 1,
      "sendTime": "08:00",
      "recipientGroups": [
        "owner",
        "org_admin",
        "project_manager",
        "contact_email"
      ],
      "customEmails": ["finance@example.com"],
      "channels": ["email"],
      "scopes": ["org_summary", "project_summary", "member_kpi"]
    },
    {
      "frequency": "yearly",
      "enabled": false,
      "sendDelayDays": 7,
      "sendTime": "08:00",
      "recipientGroups": ["owner"],
      "customEmails": [],
      "channels": ["email"],
      "scopes": ["org_summary", "project_summary"]
    }
  ]
}
```

### 3.3 Field contract cho 1 schedule item

| UI field | API field | Type | Notes |
| --- | --- | --- | --- |
| Frequency | `frequency` | `'monthly' \| 'quarterly' \| 'yearly'` | Discriminator cua schedule |
| Enable | `enabled` | `boolean` | Bat/tat auto cho frequency nay |
| Send after period end | `sendDelayDays` | `number` | So ngay sau khi ket thuc ky (min = `0`, default = `1`) |
| Send time | `sendTime` | `string` | Format `HH:mm`, default = `08:00` |
| Recipient groups | `recipientGroups` | `string[]` | Multi select |
| Custom emails | `customEmails` | `string[]` | Moi item phai la email hop le |
| Channels | `channels` | `string[]` | Allowed: `email`, `in_app` |
| Report scopes | `scopes` | `string[]` | Multi select |

### 3.4 Enum FE bat buoc dung cho settings

Frequency:
- `monthly`
- `quarterly`
- `yearly`

Recipient groups:
- `owner`
- `org_admin`
- `project_manager`
- `contact_email`

Scopes:
- `org_summary`
- `project_summary`
- `member_kpi`

Channels:
- `email`
- `in_app`

Default values backend (1 item `quarterly` disabled):
```json
[
  {
    "frequency": "quarterly",
    "enabled": false,
    "sendDelayDays": 1,
    "sendTime": "08:00",
    "recipientGroups": ["owner", "org_admin"],
    "customEmails": [],
    "channels": ["email"],
    "scopes": ["org_summary", "project_summary", "member_kpi"]
  }
]
```

### 3.5 UX note cho settings screen

- FE nen render `periodicReportSchedules` nhu 3 section/tab theo frequency (Monthly, Quarterly, Yearly), moi section la 1 schedule form doc lap.
- FE nen luon submit du 3 item trong array (them/bo theo user bat-tat) de tranh mat schedule.
- FE nen render `customEmails` theo chip/multi email input.
- FE nen validate `sendTime` theo `HH:mm` truoc submit.
- FE nen de recipient groups, scopes, channels la multi-select checkbox.
- FE khong nen hard-code label business ghi de enum backend.
- `in_app` chi tao notification cho recipient map duoc vao user trong he thong (`userId`). Nhung recipient chi la custom email/contact email van chi nhan duoc email.

## 4) Periodic report APIs

### 4.1 Manual dispatch

- Endpoint: `POST /api/v1/analytics/reports/periodic/dispatch`
- Header bat buoc: `x-organization-id`
- Body:

```json
{
  "periodKey": "2026-Q1",
  "forceResend": false,
  "forceRebuild": false
}
```

Body field meaning:
- `periodKey`: 1 trong 3 format:
  - Quarterly: `YYYY-QN` — vi du `2026-Q1`
  - Monthly: `YYYY-MNN` — vi du `2026-M03` (month 2 chu so)
  - Yearly: `YYYY-Y` — vi du `2026-Y`
- `forceResend`: neu `false` va report da `sent` thi backend tra `409`
- `forceRebuild`: neu `true` thi backend build lai snapshot va artifact CSV

Backend tu suy `frequency` tu format `periodKey`. Schedule config (recipient groups, channels, scopes...) se duoc lay tu schedule co `frequency` tuong ung trong `periodicReportSchedules`. Neu org khong co schedule cho frequency do, backend fallback mac dinh.

Response `data` la history detail:

```json
{
  "runId": "uuid",
  "frequency": "quarterly",
  "periodKey": "2026-Q1",
  "status": "sent",
  "scheduledFor": "2026-04-01T01:00:00.000Z",
  "sentAt": "2026-04-17T02:05:00.000Z",
  "attemptCount": 1,
  "successCount": 3,
  "failedCount": 0,
  "lastError": null,
  "artifacts": [
    {
      "artifactType": "org_summary",
      "fileName": "org-summary.csv",
      "fileUrl": "https://...",
      "mimeType": "text/csv",
      "size": 1024
    }
  ],
  "attempts": [
    {
      "attemptNo": 1,
      "triggerSource": "manual",
      "status": "success",
      "successCount": 3,
      "failedCount": 0,
      "errorSummary": null,
      "startedAt": "2026-04-17T02:04:50.000Z",
      "finishedAt": "2026-04-17T02:05:00.000Z"
    }
  ]
}
```

Rule quan trong:
- Neu run dang `running`, backend tra `409`.
- Neu run da `sent` va `forceResend = false`, backend tra `409`.
- Neu `forceResend = true`, backend resend tren run cu va reset ket qua recipient truoc do.
- Neu `forceRebuild = false`, backend uu tien dung lai snapshot/artifact cu neu da co.
- Neu schedule channels co `in_app`, backend tao them notification in-app cho recipient co `userId`.
- Run doc lap per `(organizationId, reportType, frequency, periodKey)` — monthly `2026-M03` va quarterly `2026-Q1` la 2 run khac nhau.

### 4.2 History list

- Endpoint: `GET /api/v1/analytics/reports/periodic/history`
- Query params:
  - `page`: default `1`
  - `limit`: default `10`, max `100`
  - `sortBy`: `createdAt | scheduledFor | sentAt | updatedAt`
  - `sortOrder`: `ASC | DESC`
  - `periodKey`: optional, 1 trong 3 format
  - `frequency`: optional, `monthly | quarterly | yearly`
  - `status`: optional, xem enum run status ben duoi

Response shape:

```json
{
  "data": [
    {
      "runId": "uuid",
      "frequency": "quarterly",
      "periodKey": "2026-Q1",
      "status": "partial_failed",
      "scheduledFor": "2026-04-01T01:00:00.000Z",
      "sentAt": null,
      "attemptCount": 1,
      "successCount": 2,
      "failedCount": 1,
      "lastError": "finance@example.com: SMTP timeout",
      "artifacts": [
        {
          "artifactType": "org_summary",
          "fileName": "org-summary.csv",
          "fileUrl": "https://...",
          "mimeType": "text/csv",
          "size": 1024
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

FE nen dung endpoint nay cho list page/table. Endpoint nay chua co `attempts`; chi co tong hop run-level.

### 4.3 History detail

- Endpoint: `GET /api/v1/analytics/reports/periodic/history/:runId`
- Response `data` = `history item + attempts[]`

`attempts[]` shape:
- `attemptNo`
- `triggerSource`
- `status`
- `successCount`
- `failedCount`
- `errorSummary`
- `startedAt`
- `finishedAt`

FE nen dung endpoint nay cho drawer/modal detail cua 1 run.

## 5) Enum va state machine FE bat buoc dung

### 5.1 Run status

- `pending`
- `running`
- `sent`
- `partial_failed`
- `failed_retryable`
- `failed_exhausted`

Goi y render:
- `pending`: cho den lich gui
- `running`: dang xu ly build/gui
- `sent`: gui thanh cong het recipient
- `partial_failed`: da gui thanh cong mot phan, backend se retry recipient fail
- `failed_retryable`: gui that bai toan bo lan hien tai, backend se retry
- `failed_exhausted`: da het retry tu dong

### 5.2 Attempt status

- `success`
- `partial_failed`
- `failed`

### 5.3 Trigger source

- `auto`
- `retry`
- `manual`

### 5.4 Artifact type

Artifact type map 1-1 voi scope:
- `org_summary`
- `project_summary`
- `member_kpi`

Ten file CSV:
- `org-summary.csv`
- `project-summary.csv`
- `member-kpi.csv`

### 5.5 periodKey format

| Frequency | Format | Regex | Vi du |
| --- | --- | --- | --- |
| Monthly | `YYYY-MNN` | `^\d{4}-M(0[1-9]\|1[0-2])$` | `2026-M03` |
| Quarterly | `YYYY-QN` | `^\d{4}-Q[1-4]$` | `2026-Q1` |
| Yearly | `YYYY-Y` | `^\d{4}-Y$` | `2026-Y` |

Full regex cho dispatch body:
`^(?:\d{4}-Q[1-4]|\d{4}-M(?:0[1-9]|1[0-2])|\d{4}-Y)$`

## 6) FE flow de xuat

### 6.1 Settings page

FE nen co 1 section `Periodic Reports` trong `Org Settings` voi 3 tab/accordion theo frequency:
- Tab `Monthly`
- Tab `Quarterly`
- Tab `Yearly`

Moi tab render:
- Toggle `Enable`
- Number input `Send after period end (days)`
- Time picker `Send time`
- Multi-select `Recipient groups`
- Multi email input `Custom emails`
- Multi-select `Channels`
- Multi-select `Report scopes`

Action:
- Load bang `GET /org-config/settings` → render 3 tab tu `periodicReportSchedules` (fallback default neu thieu 1 frequency).
- Save bang `PUT /org-config/settings` → gui full `periodicReportSchedules` voi du 3 item.

### 6.2 Manual dispatch action

FE nen co 1 button `Send periodic report now` cho admin co `analytics.reports.send`.

Goi y form:
- Select `Frequency` (monthly | quarterly | yearly)
- Input/dropdown `periodKey` — FE tu build theo frequency da chon:
  - Monthly: year + month picker → `YYYY-MNN`
  - Quarterly: year + quarter dropdown → `YYYY-QN`
  - Yearly: year picker → `YYYY-Y`
- Checkbox `Force resend`
- Checkbox `Force rebuild data`

Sau khi success:
- Refresh history list
- Mo detail drawer cua run vua tra ve

### 6.3 History list

Table columns nen co:
- `frequency`
- `periodKey`
- `status`
- `scheduledFor`
- `sentAt`
- `attemptCount`
- `successCount`
- `failedCount`
- `lastError`
- `artifacts`
- action `View detail`

Filter nen co:
- `frequency`
- `periodKey`
- `status`

### 6.4 History detail

Detail drawer/modal nen co:
- Basic info cua run (frequency + periodKey o dau)
- Danh sach artifact voi nut download mo `fileUrl`
- Timeline/table `attempts`
- `errorSummary` neu co

Neu status la `failed_exhausted` hoac `sent` va user co `analytics.reports.send`, FE co the show action resend:
- resend an toan: `forceResend = true`, `forceRebuild = false`
- resend + rebuild: `forceResend = true`, `forceRebuild = true`

## 7) Rule backend quan trong FE can biet

- Auto scheduler chi tao run cho **ky vua dong gan nhat** cua moi frequency, khong backfill cac ky cu.
- Lich auto tinh theo timezone cua organization. Neu org khong co timezone hop le, backend fallback `UTC`.
- Neu `sendTime` sai format, backend parse fallback ve `08:00`. FE van nen validate `HH:mm` truoc submit.
- Retry policy backend la 3 lan tu dong voi backoff: `15 phut`, `60 phut`, `360 phut`.
- Neu chi fail mot phan recipient, backend chi retry recipient fail, khong gui lai recipient da thanh cong.
- Artifact CSV upload len ImageKit; FE chi can render `fileUrl` de download.
- `history` list co `artifacts[]`, nen FE co the render icon download ngay o list neu muon.
- 1 org co the bat nhieu frequency cung luc — moi frequency sinh run doc lap, ton tai song song.

## 8) Quick contract checklist cho FE

- Dung header `x-organization-id` cho tat ca endpoint cua feature.
- Dung URL path moi: `/analytics/reports/periodic/**` (khong con `/quarterly/**`).
- Dung enum string chuan, khong dat label business vao API value.
- Validate `periodKey` theo regex tuong ung tung frequency (xem 5.5).
- Validate moi item trong `customEmails` la email hop le.
- Validate `sendTime` theo `HH:mm`.
- Gui `periodicReportSchedules` dang full array khi update settings, khong patch rieng tung item.
- Xu ly `409 Conflict` cho manual dispatch voi thong bao than thien:
  - report dang xu ly
  - report da gui va can `forceResend`

## 9) Minimal FE scope de release nhanh

Neu muon ra man hinh nhanh theo MVP UI, chi can lam 3 man:
- `Org Settings > Periodic Reports` (3 tab frequency)
- `Periodic Report History` (co filter frequency)
- `Periodic Report Detail / Dispatch modal` (co select frequency)

Chi voi 3 man nay, frontend da co the:
- Cau hinh auto monthly/quarterly/yearly report doc lap
- Gui tay cho 1 ky bat ky (3 format)
- Xem ket qua, retry, download CSV artifact

## 10) Migration notes so voi ban quarterly cu

FE cu dung shape nao | FE moi phai dung shape nao
--- | ---
`quarterlyReportEnabled` | `periodicReportSchedules[i].enabled` (theo frequency)
`quarterlyReportSendDelayDays` | `periodicReportSchedules[i].sendDelayDays`
`quarterlyReportSendTime` | `periodicReportSchedules[i].sendTime`
`quarterlyReportRecipientGroups` | `periodicReportSchedules[i].recipientGroups`
`quarterlyReportCustomEmails` | `periodicReportSchedules[i].customEmails`
`quarterlyReportChannels` | `periodicReportSchedules[i].channels`
`quarterlyReportScopes` | `periodicReportSchedules[i].scopes`
`/analytics/reports/quarterly/**` | `/analytics/reports/periodic/**`
`periodKey` chi `YYYY-QN` | `YYYY-QN` \| `YYYY-MNN` \| `YYYY-Y`
History khong co frequency | History co `frequency` field

Backend da backfill tu dong: cau hinh `quarterly` cu duoc chuyen thanh 1 item `frequency='quarterly'` trong `periodicReportSchedules` giu nguyen gia tri.
