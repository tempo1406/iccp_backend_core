# KPI Module — Basic Design (Business Logic)

> **Audience**: Product Owner, BA, Tech Lead
> **Updated**: 2026-04-07 (v2 — extended with story points, working time, OT)

---

## 1. Problem Statement

The system already holds complete data about tasks, projects, and tickets, but **has no screen that aggregates each person's actual work performance**. Evaluations are manual and inconsistent.

The KPI module solves this by automatically computing performance by **person**, by **project**, and by **entire org** — based on **story points**, **actual working hours**, and **overtime hours**.

---

## 2. Actors

| User | Need |
|---|---|
| **Employee** | View own KPI: tasks, points, working hours, OT across projects |
| **Project Manager** | View each member's KPI within a project by points + hours |
| **Org Admin / HR** | View and rank all personnel; configure working hours & holidays |

---

## 3. Data Scope

### 3.1 Data read from existing tables

| Source | Used to compute |
|---|---|
| **Tasks** | Task count, story points, estimated hours, status, deadline |
| **Projects** | Progress, status, end date, total points |
| **Ticket Requests** (type=overtime, status=approved) | Actual OT hours per member |
| **Organization Members** | Personnel list |

### 3.2 New columns added to Task table (schema `project`)

Two new fields to add to `project.tasks`:

| Field | Type | Who edits | Description |
|---|---|---|---|
| `estimated_point` | `int` (nullable) | PM / Project Manager role | Story point estimate — PM assigns when creating or editing |
| `estimated_hours` | `decimal(6,2)` (nullable) | PM / Project Manager role | Estimated hours to complete the task |

**Edit rule**: Only members with the **Project Manager** role in the project (or Org Admin) may set/edit these two fields. Regular members cannot edit them even if assigned the task.

> Fallback: Task with no `estimated_point` → counts as 1 point in KPI aggregation.

### 3.3 New column added to Project Member table (schema `project`)

One new field to add to `project.project_members`:

| Field | Type | Who edits | Description |
|---|---|---|---|
| `allocated_hours_per_day` | `decimal(4,2)` (nullable) | PM / Project Manager role | Hours per day the member is allocated to this project |

**Reason**: The org-level standard hours (e.g. 8h/day) differ from actual project allocation. A member may work 4h/day on project A and 4h/day on project B. KPI's `expectedWorkingHours` within a project must use this value instead of the org-level config.

**Rules**:
- **NULL** = no specific allocation → falls back to `org_working_time_configs` (full-time on project)
- Only **Project Manager** or **Org Admin** may set/edit this field
- Valid values: `0.5` to `24.0` hours/day
- Holidays from `org_holidays` still apply (overrides allocation to 0 when `working_hours = 0`)

### 3.4 New tables to create (schema `tenant`)

#### Table 1: `tenant.org_working_time_configs`

Configures the organization's standard working hours per day of the week.

| Field | Type | Description |
|---|---|---|
| `organization_id` | `uuid` (unique) | One row per org |
| `monday_hours` | `decimal(4,2)` | Monday hours (default 8.0) |
| `tuesday_hours` | `decimal(4,2)` | Tuesday (default 8.0) |
| `wednesday_hours` | `decimal(4,2)` | Wednesday (default 8.0) |
| `thursday_hours` | `decimal(4,2)` | Thursday (default 8.0) |
| `friday_hours` | `decimal(4,2)` | Friday (default 8.0) |
| `saturday_hours` | `decimal(4,2)` | Saturday (default 0.0 — no work) |
| `sunday_hours` | `decimal(4,2)` | Sunday (default 0.0) |

> Example: company allows Saturday morning work → `saturday_hours = 4.0`.

#### Table 2: `tenant.org_holidays`

Override specific dates (national holidays, company holidays, compensatory days off...).

| Field | Type | Description |
|---|---|---|
| `organization_id` | `uuid` | Owning org |
| `date` | `date` | Specific date (YYYY-MM-DD), unique per org |
| `name` | `varchar(255)` | Name: "Lunar New Year", "National Day"... |
| `type` | `enum` | `national_holiday` / `company_holiday` / `special_day` |
| `working_hours` | `decimal(4,2)` | Working hours that day (0.0 = full day off, 4.0 = half day off) |

---

## 4. Two KPI Groups

### 4.1 Project KPI

Evaluates members **within one specific project** by story points + estimated hours.

**Who can view**: Any active member of the project.

```
[Project X]
   ├── Project overview       → progress, total points, point completion %, deadline, OT
   ├── Member KPI table       → ranked by performanceScore
   └── Single member detail   → points + hours + OT breakdown + recent tasks
```

---

### 4.2 Org KPI

Evaluates personnel **aggregated across all projects** + OT computed from working time config.

**Who can view**:
- Org Admin / HR: view everyone
- Employee: view own data only

```
[Organization]
   ├── Overview dashboard     → projects, tasks, points, tickets, OT
   ├── Personnel KPI table    → rank all staff (paginated)
   └── Single employee detail → aggregate + by project + OT breakdown + tickets
```

### 4.3 Config Management (Working Time Config)

Org Admin configures before using time-based KPI:

```
[Organization Settings]
   ├── Weekly working hours   → GET/PUT /v1/org-config/working-time
   └── Holiday management     → GET/POST/DELETE /v1/org-config/holidays
```

---

## 5. KPI Metrics

### 5.1 Task metrics (count-based)

| Metric | Meaning |
|---|---|
| `totalAssigned` | Total tasks assigned |
| `completedTasks` | Tasks completed (status = Done) |
| `openTasks` | Tasks not yet done |
| `onTimeTasks` | Tasks done on or before deadline |
| `lateTasks` | Tasks done but after deadline |
| `overdueTasks` | Tasks not done and past deadline |
| `dueSoonTasks` | Tasks not done, deadline within 24h |

---

### 5.2 Point metrics (member level)

| Metric | Calculation | Meaning |
|---|---|---|
| `totalEstimatePoints` | SUM(estimatedPoint) of tasks assigned | Total estimated points assigned to the person |
| `totalActualPoints` | SUM(estimatedPoint) of **done** tasks | Points actually delivered |
| `openPoints` | `totalEstimatePoints - totalActualPoints` | Points still outstanding |
| `pointCompletionRate` | `totalActualPoints / totalEstimatePoints × 100` | % completion by points |

> **Note**: "Actual points" here are the estimated points of completed tasks — not a separate tracking field. When a task is done, its `estimated_point` moves into "actual delivered".
> **Fallback**: Task with no `estimated_point` → counts as 1 point.

---

### 5.3 Point metrics (project level)

| Metric | Calculation | Meaning |
|---|---|---|
| `projectTotalEstimatePoints` | SUM(estimatedPoint) ALL tasks in project | Total planned points for the project |
| `projectTotalActualPoints` | SUM(estimatedPoint) of **done** tasks | Total points actually delivered |
| `projectOpenPoints` | `projectTotalEstimatePoints - projectTotalActualPoints` | Points still outstanding |
| `pointBasedProgress` | `projectTotalActualPoints / projectTotalEstimatePoints × 100` | Actual progress by points |
| `isPointComplete` | `pointBasedProgress >= 100` | Project has delivered all planned work |

---

### 5.4 Time metrics

| Metric | Calculation | Meaning |
|---|---|---|
| `totalEstimatedHours` | SUM(estimatedHours) of assigned tasks | Total estimated hours |
| `completedEstimatedHours` | SUM(estimatedHours) of done tasks | Estimated hours of completed work |
| `expectedWorkingHours` | Based on `allocatedHoursPerDay` (project member) → fallback `OrgWorkingTimeConfig` → minus `OrgHoliday` | Expected working hours in the period |

> `expectedWorkingHours` can only be computed when `dateFrom` / `dateTo` are provided. If no query params, omit this field.
>
> **Priority for `expectedWorkingHours` in Project KPI**:
> 1. If member has `allocatedHoursPerDay` → use that value × working days in the period
> 2. If null → use `org_working_time_configs` (hours per day of the week)
> 3. Holidays from `org_holidays` always apply (override to `working_hours` of that day)

---

### 5.5 OT metrics (from Ticket Requests)

Data sourced from `ticket_requests` with `type = 'overtime'` and `status = 'approved'`, field `ot_metadata.effortEntries`.

| Metric | Calculation | Meaning |
|---|---|---|
| `approvedOtTickets` | Count of approved OT tickets | Number of OT occurrences |
| `totalOtHours` | SUM of `ot_metadata.totalActualHours` | Total actual OT hours |
| `effectiveOtHours` | OT hours × day multiplier | OT hours weighted by day type |

**OT multiplier by day type** (based on org_holidays + org_working_time_configs):

| Day type | Multiplier |
|---|---|
| Weekday (Mon–Fri) | × 1.0 |
| Saturday | × 1.5 |
| Sunday | × 2.0 |
| Holiday / compensatory day off | × 3.0 |

---

### 5.6 Composite performance score

**Weights are dynamic** — sourced from Project Settings, fallback to Org Settings, fallback to system default (50/30/20). See [settings/basic-design.md](../settings_en/basic-design.md).

```
baseScore = ROUND(
  pointCompletionRate × W_point   +   -- W_point: point weight (default 50%)
  onTimeRate          × W_ontime  +   -- W_ontime: on-time weight (default 30%)
  otContributionScore × W_ot          -- W_ot: OT contribution weight (default 20%)
)
-- Constraint: W_point + W_ontime + W_ot = 1.0
-- If W_ot = 0: W_point and W_ontime are re-normalized automatically
```

**otContributionScore** = MIN(100, effectiveOtHours / expectedWorkingHours × 100)
→ If member has no OT or org hasn't configured working time → `otContributionScore = 0`.

**Bonus points** (if enabled in settings):
```
finalScore = MIN(100, baseScore + bonusPoints)

bonusPoints = MIN(bonusMaxCap,
  onTimeTasks  × bonusOnTimeTask  +
  earlyTasks   × bonusEarlyTask   +   -- done before deadline by X hours
  (zeroOverdue ? bonusZeroOverdue : 0) +
  effectiveOtHours × bonusOtPerEffectiveHour
)
```

> All bonus values are also dynamically configured at Project/Org Settings.

---

### 5.7 Project completion

A project is considered **truly complete** when both conditions are met:
1. `status = 'completed'` (manually set by PM/Org Admin), **AND**
2. `pointBasedProgress >= 100%` (all estimated points have been delivered)

→ See definitions of `projectTotalEstimatePoints` and `projectTotalActualPoints` in section 5.3.

---

## 6. Workflows

### 6.1 Setup (Org Admin — done once)

```
1. Org Admin goes to Settings → Working Time
2. Fills in working hours per day of the week
   e.g. Mon–Fri: 8h, Sat: 4h, Sun: 0h
3. Adds holidays: "30/04", "01/05", "02/09"...
4. Save → PUT /v1/org-config/working-time
          POST /v1/org-config/holidays
```

### 6.2 PM creates tasks with story points

```
1. PM creates or edits an existing task
2. Fills in 2 new fields:
   - Story Point: 5 (complexity)
   - Estimated Hours: 4.0 (hours estimate)
3. Assigns to member
```

### 6.3 View Project KPI (PM / Member)

```
1. Open KPI tab in the project
2. GET /v1/projects/{id}/kpi/overview
   → Progress, total points, point completion %, deadline
3. GET /v1/projects/{id}/kpi/members
   → Ranking table: performanceScore, points, hours, OT
4. Click on a member
   → GET /v1/projects/{id}/kpi/members/{userId}
   → Detail: points + hours + OT breakdown + 5 recent tasks
```

### 6.4 View Org KPI (Org Admin / HR)

```
1. Go to Analytics → KPI
2. GET /v1/kpi/overview
   → Summary: members, projects, points, OT
3. GET /v1/kpi/members?page=1&limit=20
   → Full personnel ranking
4. Click on an employee
   → GET /v1/kpi/members/{userId}
   → Aggregate + breakdown by project + OT + tickets
```

### 6.5 Employee views own KPI

```
1. Employee goes to "My KPI" page
2. GET /v1/kpi/members/{myUserId}
   → No admin permission needed; server auto-allows when userId = currentUser
```

---

## 7. Permission Rules

### 7.1 Viewing KPI

| Action | Condition |
|---|---|
| View project KPI (overview + member list) | Must have **Project Manager** role in the project, **or** be Org Admin |
| View single member detail within project | Must have **Project Manager** role in the project, **or** be Org Admin |
| View org-level KPI (overview + member list) | Requires `analytics.kpi.org.view` — Org Admin only |
| View single person detail (org level) | Org Admin **or** the person themselves |

> **Reason for restriction**: KPI contains sensitive individual performance data — not every member should see each other's scores.

### 7.2 Editing task points

| Action | Condition |
|---|---|
| Set/edit `estimated_point` on a task | **Project Manager** role in project, **or** Org Admin |
| Set/edit `estimated_hours` on a task | **Project Manager** role in project, **or** Org Admin |
| View `estimated_point` on a task | All active project members (read-only) |

### 7.3 Organization configuration

| Action | Condition |
|---|---|
| View working time config / holidays | Requires `org_config.working_time.view` |
| Edit working time config / add or remove holidays | Requires `org_config.working_time.manage` — Org Admin only |

### 7.4 Member allocation config

| Action | Condition |
|---|---|
| View `allocatedHoursPerDay` for a member | All active project members (read-only) |
| Set/edit `allocatedHoursPerDay` for a member | **Project Manager** role in project, **or** Org Admin |

---

## 8. Business Rules

1. **Leaf tasks only**: Only tasks with no child subtasks are counted — avoids double-counting.
2. **Done detection**: Status `ILIKE 'done'` within the same project.
3. **Point fallback**: Task with no `estimated_point` → treated as 1 point in KPI aggregation.
4. **PM sets points**: Only Project Manager role or Org Admin may set/edit `estimated_point` and `estimated_hours` on tasks.
5. **Actual = delivered estimate**: `totalActualPoints` for a person = sum of `estimated_point` of done tasks assigned to them. No separate "actual_point" field on task.
6. **Project total estimate/actual**: `projectTotalEstimatePoints` = SUM of all tasks in project; `projectTotalActualPoints` = SUM of done tasks; `projectOpenPoints` = difference of the two.
7. **OT from approved tickets only**: Only `ticket_requests` with `type = 'overtime'` and `status = 'approved'`.
8. **OT day multiplier**: Computed from `ot_metadata.effortEntries[].date` combined with `org_holidays` + day of week.
9. **Working time fallback**: Org not yet configured → use default Mon–Fri = 8h, Sat = 0h, Sun = 0h.
10. **Holiday override**: Dates in `org_holidays` override `working_time_config` for that day.
11. **Ticket scope**: Only tickets where the user is `requester_id`.
12. **Member left project**: Tasks already assigned before leaving are kept in KPI history.
13. **Real-time data**: Recomputed on every view, no caching.
14. **Allocated hours per day**: PM sets `allocatedHoursPerDay` per member per project. Takes priority over `org_working_time_configs` when computing `expectedWorkingHours` in Project KPI. If null → use org config. Holidays still override both.

---

## 9. API List

### Project KPI

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/projects/:id/kpi/overview` | Project overview (points, hours, OT, progress) |
| GET | `/v1/projects/:id/kpi/members` | KPI for all members (ranked) |
| GET | `/v1/projects/:id/kpi/members/:userId` | KPI detail for one member |

### Org KPI

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/kpi/overview` | Org-level dashboard |
| GET | `/v1/kpi/members` | Full personnel KPI (paginated) |
| GET | `/v1/kpi/members/:userId` | Single employee KPI detail (by project + OT + tickets) |

### Working Time Config (separate module, under Organization)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/org-config/working-time` | Get current org working time config |
| PUT | `/v1/org-config/working-time` | Update working hours per day of week |
| GET | `/v1/org-config/holidays` | List org holidays |
| POST | `/v1/org-config/holidays` | Add a holiday |
| DELETE | `/v1/org-config/holidays/:id` | Remove a holiday |

---

## 10. Open Questions (confirm before implementing)

| # | Question | Proposed default |
|---|---|---|
| 1 | Are system default weights 50/30/20 appropriate, or need adjustment? | 50/30/20 |
| 2 | OT multipliers: weekday×1.0, Sat×1.5, Sun×2.0, holiday×3.0 — correct? (configurable via Org Settings) | As proposed |
| 3 | When org hasn't set up working-time config, show time-based KPI? | Use default 8h Mon–Fri |
| 4 | How many tasks to show in `recentTasks`? | 5 |
| 5 | Is bonus enabled by default, or must PM turn it on? | Off by default — PM enables when needed |
| 6 | Project completion: requires both `status=completed` + `pointBasedProgress=100%` or just one? | Requires both |
| 7 | Tasks without `estimated_point` fallback to 1 — acceptable, or skip them (exclude from point metrics)? | Fallback to 1 point |
| 8 | Can employees view their own KPI at org level? | Yes |
| 9 | How many hours early counts as `earlyTasks` completion? (configurable via `bonusEarlyTaskHours`) | 24h |
