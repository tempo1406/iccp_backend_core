# Settings Module — Basic Design (Business Logic)

> **Audience**: Product Owner, BA, Tech Lead
> **Updated**: 2026-04-07

---

## 1. Problem Statement

The current system lacks a configuration layer at both the **project level** and **organization level**:

- KPI formula weights are hardcoded — cannot be adjusted per project / per company
- No way to configure meeting schedules (daily, weekly) and send automatic reminders
- OT weights and on-time completion bonus points cannot be customized
- Orgs only have working-time config, no broader overall configuration

The **Settings** module solves this by providing a two-tier config layer:

```
[Org Config]           ← organization-wide defaults
    ↓ (fallback if project has not self-configured)
[Project Config]       ← override for a specific project
    ↓ (used when computing KPI, sending notifications, calculating scores...)
[Runtime logic]
```

---

## 2. Two Config Groups

### 2.1 Project Settings

**Who edits**: Project Manager (PM role) or Org Admin
**Scope**: Applies to one specific project

| Group | Settings |
|---|---|
| **Meeting** | Daily standup schedule, weekly review, time, notification channel |
| **Reminder** | Deadline reminders, delivery channels (push / email / in-app) |
| **Point Scale** | Task point scale (Fibonacci, linear, custom), max points per task |
| **KPI Weights** | Performance score formula weights (overrides org default) |
| **Bonus Rules** | Bonus points for on-time / early completion, zero overdue tasks |

---

### 2.2 Org Settings

**Who edits**: Org Admin
**Scope**: Applies org-wide, especially as default values for projects that haven't self-configured

| Group | Settings |
|---|---|
| **Default KPI Weights** | Default weights used when project hasn't overridden them |
| **OT Multipliers** | OT hour multipliers by day type (weekday, Sat, Sun, holiday) |
| **KPI Digest** | Schedule for weekly KPI report (day, time, recipients) |
| **Bonus Global Rules** | Default bonus points, can be overridden at project level |
| **Notification Channels** | Default channels for entire org (push / email / both) |

---

## 3. Config Group Details

### 3.1 Meeting Config (Project)

| Parameter | Type | Description |
|---|---|---|
| `dailyEnabled` | bool | Enable/disable daily standup |
| `dailyTime` | `HH:MM` | Daily time (e.g. "09:00") |
| `dailyDays` | int[] | Days to hold daily (1=Mon,...,5=Fri) |
| `dailyReminderMinutes` | int | Minutes before daily to send reminder (e.g. 15) |
| `weeklyEnabled` | bool | Enable/disable weekly review |
| `weeklyDay` | int | Day to hold weekly review (1=Mon,...,7=Sun) |
| `weeklyTime` | `HH:MM` | Weekly review time |
| `weeklyReminderMinutes` | int | Minutes before weekly to send reminder |

---

### 3.2 Reminder Config (Project)

Task deadline reminders:

| Parameter | Type | Description |
|---|---|---|
| `taskDueReminderEnabled` | bool | Enable/disable deadline reminder |
| `taskDueReminderHours` | int[] | Remind X hours before deadline (e.g. [24, 2]) — sends twice |
| `reminderChannels` | enum[] | `push_notification`, `email`, `in_app` |
| `overdueEscalationEnabled` | bool | Auto-escalate (notify PM) when task is overdue |
| `overdueEscalationAfterHours` | int | Hours after overdue before escalation |

---

### 3.3 Point Scale Config (Project)

Defines how PM assigns points to tasks:

| Parameter | Type | Description |
|---|---|---|
| `pointScaleType` | enum | `fibonacci` / `linear` / `custom` |
| `pointScaleValues` | int[] | List of valid values |
| `maxPointPerTask` | int | Max points for a single task (e.g. 13 for Fibonacci) |

**Example scales:**

| Type | Valid values |
|---|---|
| `fibonacci` | 1, 2, 3, 5, 8, 13, 21 |
| `linear` | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| `custom` | Self-defined in `pointScaleValues` |

> **Validation**: When PM sets `estimated_point` on a task, the system validates the value is in `pointScaleValues`. If `pointScaleType = null` (not configured), skip validation — PM enters freely.

---

### 3.4 KPI Weights Config (Project & Org)

Weights for the `performanceScore` formula. **Must sum to 1.0**.

| Parameter | Description | Default |
|---|---|---|
| `weightPointCompletion` | Weight for point completion % | 0.50 |
| `weightOnTime` | Weight for on-time rate | 0.30 |
| `weightOtContribution` | Weight for OT contribution | 0.20 |

**Formula:**
```
performanceScore =
  pointCompletionRate × weightPointCompletion +
  onTimeRate          × weightOnTime          +
  otContributionScore × weightOtContribution
```

If `weightOtContribution = 0` (OT not factored in):
```
performanceScore =
  pointCompletionRate × weightPointCompletion/(1 - weightOtContribution) +
  onTimeRate          × weightOnTime/(1 - weightOtContribution)
```
→ Automatically re-normalized so the total remains 1.

**Fallback:**
```
Project has no config → use Org default weights
Org has no config     → use system default (0.5 / 0.3 / 0.2)
```

---

### 3.5 Bonus Rules Config (Project & Org)

Bonus points added on top of `performanceScore` (after the main formula):

| Parameter | Type | Description |
|---|---|---|
| `bonusEnabled` | bool | Enable/disable entire bonus system |
| `bonusOnTimeTask` | decimal | Points added per task done on time (e.g. 0.5) |
| `bonusEarlyTaskHours` | int | Hours before deadline considered "early" completion |
| `bonusEarlyTask` | decimal | Points added for early completion (e.g. 1.0) |
| `bonusZeroOverdue` | decimal | Bonus if member has zero overdue tasks in the period |
| `bonusMaxCap` | decimal | Maximum total bonus that can be added (e.g. 10.0 points) |
| `bonusOtPerEffectiveHour` | decimal | Points added per effective OT hour (e.g. 0.2) |

**Final score formula:**
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

Multipliers for OT hours by day type — used to compute `effectiveOtHours`:

| Parameter | Default | Description |
|---|---|---|
| `otMultiplierWeekday` | 1.0 | Weekday (Mon–Fri, outside standard hours) |
| `otMultiplierSaturday` | 1.5 | Saturday |
| `otMultiplierSunday` | 2.0 | Sunday |
| `otMultiplierHoliday` | 3.0 | Holiday / compensatory day off |

---

### 3.7 KPI Digest (Org)

Automated periodic KPI summary report:

| Parameter | Type | Description |
|---|---|---|
| `digestEnabled` | bool | Enable/disable digest sending |
| `digestDay` | int | Day to send (1=Mon,...,7=Sun) |
| `digestTime` | `HH:MM` | Time to send |
| `digestRecipients` | enum[] | `org_admin`, `project_managers`, `all_members` |
| `digestChannels` | enum[] | `email`, `in_app` |

---

## 4. Workflows

### 4.1 PM configures project

```
1. PM goes to Settings → Project Settings
2. Scrolls to groups: Meeting, Reminder, Point Scale, KPI, Bonus
3. Adjusts each parameter
4. If KPI Weights left empty → system uses Org default values
5. Save → PUT /v1/projects/{id}/settings
```

### 4.2 Org Admin configures organization

```
1. Org Admin goes to Settings → Organization Settings
2. Configures: Default KPI Weights, OT Multipliers, Digest, Bonus defaults
3. Save → PUT /v1/org-config/settings
4. Projects that haven't self-configured automatically use these values
```

### 4.3 System computes performanceScore (at runtime)

```
1. Get project config → if null → get org config → if null → use system default
2. Compute base score: pointRate × W1 + onTimeRate × W2 + otScore × W3
3. If W3 = 0 → re-normalize W1, W2
4. Compute bonus: onTimeTasks × b1 + earlyTasks × b2 + zeroOverdue × b3 + ...
5. Cap bonus by bonusMaxCap
6. finalScore = MIN(100, baseScore + bonus)
```

### 4.4 Send task deadline reminder (Scheduler)

```
Every 15 minutes: scheduler scans tasks approaching deadline
→ For each task: check project.settings.taskDueReminderHours
→ If deadline - now ∈ reminderHours → send notification via reminderChannels
→ If task is overdue > overdueEscalationAfterHours → additionally notify PM
```

### 4.5 Send KPI Digest (Scheduler)

```
Daily: check org.settings.digestDay + digestTime
→ If schedule matches → aggregate KPI for all members in the period
→ Send via digestChannels to digestRecipients
```

---

## 5. Permission Rules

| Action | Condition |
|---|---|
| View project settings | Active member of the project |
| Edit project settings | PM role in project or Org Admin |
| View org settings | Org Admin |
| Edit org settings | Org Admin |
| Reset project settings to org default | PM role or Org Admin |

---

## 6. Business Rules

1. **Weights must sum to 1.0**: `weightPointCompletion + weightOnTime + weightOtContribution` must = 1.0. Server validates, rejects if wrong.
2. **Auto re-normalize**: If `weightOtContribution = 0` (OT factor disabled), system automatically redistributes the remaining 2 weights proportionally.
3. **Project inherits from Org**: If project hasn't set KPI weights or bonus rules → automatically uses org config.
4. **Bonus cannot be negative**: All bonus values ≥ 0.
5. **finalScore capped at 100**: Always `MIN(100, ...)`.
6. **Point scale validation is lazy**: Only validates when `pointScaleType` is set; if `null` → PM enters freely.
7. **Digest sent by Scheduler only**: Not triggered manually via API (prevents spam).
8. **OT multipliers at org level only**: Projects cannot override OT multipliers — this is company-wide labor policy.

---

## 7. API List

### Project Settings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/projects/:id/settings` | Get all project settings (merged with org defaults) |
| PUT | `/v1/projects/:id/settings` | Update project settings (partial update OK) |
| DELETE | `/v1/projects/:id/settings` | Reset to org defaults |

### Org Settings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/org-config/settings` | Get current org settings |
| PUT | `/v1/org-config/settings` | Update org settings |

> Org working-time config (working hours / holidays) keeps its own endpoint `/v1/org-config/working-time` (designed in KPI docs).

---

## 8. Open Questions

| # | Question | Proposed answer |
|---|---|---|
| 1 | Are bonus points computed per task or per period (sprint/month)? | Per period (when viewing KPI) |
| 2 | Does `bonusOtPerEffectiveHour` apply to Project KPI or Org KPI only? | Both |
| 3 | Is the digest email template customizable or fixed? | Fixed template first, customizable later |
| 4 | When PM resets project settings → confirmation required or automatic? | Confirmation required |
| 5 | Point scale validation: task has `estimated_point = 8` but PM changes scale to max=5 → how to handle? | Warn, keep old value — only validate new tasks |
