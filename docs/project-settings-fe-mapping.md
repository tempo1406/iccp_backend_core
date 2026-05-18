# Project Settings FE Mapping Guide

## Muc dich

Tai lieu nay mo ta dung payload hien tai cua backend cho man `Project Settings`
de frontend map day du cac truong dang hien thi o UI.

Tai lieu nay KHONG gia dinh co cac field gom nhom nhu:

- `kpiWeightsSection`
- `pointScaleSection`
- `bonusSettingsSection`

Vi response hien tai cua backend CHUA tra ve nhung field do.

Frontend can map truc tiep tu cac field phang hien co.

## API hien tai

- `GET /api/v1/projects/:projectId/settings`
- `PUT /api/v1/projects/:projectId/settings`
- Required header: `X-Organization-Id`

## Response hien tai cua backend

Response DTO hien tai nam o:

- [project-settings.response.ts](/C:/Code/ICCP/iccp_backend_core/src/modules/project/settings/dto/response/project-settings.response.ts:3)

Response tra ve cac nhom field sau:

### 1. Meeting settings

- `dailyEnabled: boolean`
- `dailyTime?: string`
- `dailyDays: number[]`
- `dailyReminderMinutes: number`
- `weeklyEnabled: boolean`
- `weeklyDay: number`
- `weeklyTime?: string`
- `weeklyReminderMinutes: number`

### 2. Reminder settings

- `taskDueReminderEnabled: boolean`
- `taskDueReminderHours: number[]`
- `reminderChannels: string[]`
- `overdueEscalationEnabled: boolean`
- `overdueEscalationAfterHours: number`

### 3. Point scale

- `pointScaleType?: string`
- `pointScaleValues?: number[]`
- `maxPointPerTask?: number`

### 4. KPI weights

- `kpiWeightPointCompletion: number`
- `kpiWeightOnTime: number`
- `kpiWeightOtContribution: number`

### 5. Bonus settings

- `bonusEnabled: boolean`
- `bonusOnTimeTask: number`
- `bonusEarlyTaskHours: number`
- `bonusEarlyTask: number`
- `bonusZeroOverdue: number`
- `bonusMaxCap: number`
- `bonusOtPerEffectiveHour: number`

### 6. Meta

- `projectId: string`
- `organizationId: string`
- `updatedAt: Date`

## Example response

```json
{
  "projectId": "uuid",
  "organizationId": "uuid",
  "dailyEnabled": false,
  "dailyTime": "09:00",
  "dailyDays": [1, 2, 3, 4, 5],
  "dailyReminderMinutes": 15,
  "weeklyEnabled": false,
  "weeklyDay": 5,
  "weeklyTime": "10:00",
  "weeklyReminderMinutes": 30,
  "taskDueReminderEnabled": true,
  "taskDueReminderHours": [24, 2],
  "reminderChannels": ["push_notification", "in_app"],
  "overdueEscalationEnabled": false,
  "overdueEscalationAfterHours": 4,
  "pointScaleType": null,
  "pointScaleValues": [],
  "maxPointPerTask": null,
  "kpiWeightPointCompletion": 0.5,
  "kpiWeightOnTime": 0.3,
  "kpiWeightOtContribution": 0.2,
  "bonusEnabled": true,
  "bonusOnTimeTask": 0.5,
  "bonusEarlyTaskHours": 24,
  "bonusEarlyTask": 1,
  "bonusZeroOverdue": 2,
  "bonusMaxCap": 10,
  "bonusOtPerEffectiveHour": 0.2,
  "updatedAt": "2026-04-19T00:00:00.000Z"
}
```

## Mapping cho UI Project Settings

Duoi day la mapping theo dung man FE hien tai.

### KPI Weights

UI dang hien thi:

- `Point Completion`
- `On-Time Rate`
- `OT Contribution`
- `Total weight`
- badge `Organization override`

Map nhu sau:

| FE label | Backend field | FE xu ly hien thi |
|---|---|---|
| Point Completion | `kpiWeightPointCompletion` | nhan `100` de hien thi `%` |
| On-Time Rate | `kpiWeightOnTime` | nhan `100` de hien thi `%` |
| OT Contribution | `kpiWeightOtContribution` | nhan `100` de hien thi `%` |
| Total weight | `kpiWeightPointCompletion + kpiWeightOnTime + kpiWeightOtContribution` | nhan `100` de hien thi `%` |

Vi du:

- `kpiWeightPointCompletion = 0.5` => hien thi `50%`
- `kpiWeightOnTime = 0.3` => hien thi `30%`
- `kpiWeightOtContribution = 0.2` => hien thi `20%`
- tong = `1.0` => hien thi `100%`

Luu y:

- Backend tra ve raw value dang thap phan, FE tu convert sang `%`
- Hien tai backend KHONG tra ve field rieng cho `Organization override`
- Neu FE muon hien badge `Organization override` chinh xac, backend can bo sung mot flag rieng trong response

### Point Scale

UI dang hien thi:

- `Max Points per Task`

Map nhu sau:

| FE label | Backend field | FE xu ly hien thi |
|---|---|---|
| Max Points per Task | `maxPointPerTask` | neu `null` thi hien `Unlimited` |

Neu FE can editor cho point scale, co them:

| FE purpose | Backend field |
|---|---|
| Point scale type | `pointScaleType` |
| Point scale values | `pointScaleValues` |

Luu y:

- Backend hien tai KHONG tra ve `maxPointPerTaskLabel`
- FE can tu render:
  - `null` => `Unlimited`
  - co gia tri => hien thi so do

### Bonus Settings

UI dang hien thi:

- `Enable Bonus`
- `On-Time Task Bonus`
- `Early Completion Threshold`
- `Early Task Bonus`
- `Zero Overdue Bonus`
- `Max Bonus Cap`
- `OT Bonus / Effective Hour`
- badge `Organization override`

Map nhu sau:

| FE label | Backend field | FE xu ly hien thi |
|---|---|---|
| Enable Bonus | `bonusEnabled` | boolean -> badge/text |
| On-Time Task Bonus | `bonusOnTimeTask` | hien thi so |
| Early Completion Threshold | `bonusEarlyTaskHours` | FE them suffix `h` |
| Early Task Bonus | `bonusEarlyTask` | hien thi so |
| Zero Overdue Bonus | `bonusZeroOverdue` | hien thi so |
| Max Bonus Cap | `bonusMaxCap` | hien thi so |
| OT Bonus / Effective Hour | `bonusOtPerEffectiveHour` | hien thi so |

Luu y:

- Backend hien tai KHONG tra ve `earlyCompletionThresholdLabel`
- FE can tu render:
  - `bonusEarlyTaskHours = 24` => `24h`
- Backend hien tai KHONG tra ve field rieng cho `Organization override`
- Neu FE muon hien badge `Organization override` chinh xac, backend can bo sung mot flag rieng trong response

## Cac truong FE hien tai dang bi thieu neu map theo screenshot

Neu FE dang map theo UI screenshot ban gui, hien tai response backend CHUA co san
nhung truong display-ready sau:

- `pointCompletionPercent`
- `onTimeRatePercent`
- `otContributionPercent`
- `totalWeightPercent`
- `maxPointPerTaskLabel`
- `earlyCompletionThresholdLabel`
- `kpiInheritedFromOrganization`
- `bonusInheritedFromOrganization`

Hien tai FE can tu tinh/tu render:

| FE can gi | Cach suy ra tu payload hien tai |
|---|---|
| Point Completion `%` | `kpiWeightPointCompletion * 100` |
| On-Time Rate `%` | `kpiWeightOnTime * 100` |
| OT Contribution `%` | `kpiWeightOtContribution * 100` |
| Total Weight `%` | `(kpiWeightPointCompletion + kpiWeightOnTime + kpiWeightOtContribution) * 100` |
| Max Points label | `maxPointPerTask == null ? 'Unlimited' : maxPointPerTask` |
| Early Completion Threshold label | ``${bonusEarlyTaskHours}h`` |

## Mapping de xuat cho frontend

Neu FE muon map nhanh theo dung UI hien tai:

```ts
const projectSettingsViewModel = {
  kpiWeights: {
    pointCompletionPercent: Number((data.kpiWeightPointCompletion ?? 0) * 100),
    onTimeRatePercent: Number((data.kpiWeightOnTime ?? 0) * 100),
    otContributionPercent: Number((data.kpiWeightOtContribution ?? 0) * 100),
    totalWeightPercent: Number(
      ((data.kpiWeightPointCompletion ?? 0) +
        (data.kpiWeightOnTime ?? 0) +
        (data.kpiWeightOtContribution ?? 0)) * 100
    ),
  },
  pointScale: {
    maxPointPerTask: data.maxPointPerTask,
    maxPointPerTaskLabel:
      data.maxPointPerTask == null ? "Unlimited" : String(data.maxPointPerTask),
  },
  bonusSettings: {
    enabled: data.bonusEnabled,
    onTimeTaskBonus: data.bonusOnTimeTask,
    earlyCompletionThresholdHours: data.bonusEarlyTaskHours,
    earlyCompletionThresholdLabel: `${data.bonusEarlyTaskHours}h`,
    earlyTaskBonus: data.bonusEarlyTask,
    zeroOverdueBonus: data.bonusZeroOverdue,
    maxBonusCap: data.bonusMaxCap,
    otBonusPerEffectiveHour: data.bonusOtPerEffectiveHour,
  },
};
```

## Payload FE nen gui khi update

Request update hien tai dung:

- [upsert-project-settings.request.ts](/C:/Code/ICCP/iccp_backend_core/src/modules/project/settings/dto/request/upsert-project-settings.request.ts:1)

FE nen gui raw field, KHONG gui cac field display-only tu tinh.

Vi du:

```json
{
  "maxPointPerTask": 10,
  "kpiWeightPointCompletion": 0.5,
  "kpiWeightOnTime": 0.3,
  "kpiWeightOtContribution": 0.2,
  "bonusEnabled": true,
  "bonusOnTimeTask": 0.5,
  "bonusEarlyTaskHours": 24,
  "bonusEarlyTask": 1,
  "bonusZeroOverdue": 2,
  "bonusMaxCap": 10,
  "bonusOtPerEffectiveHour": 0.2
}
```

## Ket luan cho team frontend

Trong payload hien tai:

- FE map duoc day du KPI Weights, Point Scale, Bonus Settings
- nhung FE phai TU tinh mot so field display
- FE hien tai KHONG the biet chinh xac `Organization override` chi tu response nay

Neu can UI map thang ma khong phai tu tinh, backend se can bo sung them cac field:

- percent fields cho KPI
- label fields cho Point Scale va Bonus
- inherit flags cho KPI va Bonus

