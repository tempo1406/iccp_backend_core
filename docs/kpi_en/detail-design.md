# KPI Module — Detail Design (Technical Design)

> **Audience**: Backend Developer
> **Updated**: 2026-04-07 (v2 — added story points, working time config, OT integration)

---

## 1. DB Changes Overview

### 1.1 Existing Tables to ALTER

#### `project.tasks` — add 2 columns

```sql
ALTER TABLE project.tasks
  ADD COLUMN estimated_point    INT           DEFAULT NULL,  -- set by PM, nullable
  ADD COLUMN estimated_hours    DECIMAL(6,2)  DEFAULT NULL;  -- set by PM, nullable
```

#### `project.project_members` — add 1 column

```sql
ALTER TABLE project.project_members
  ADD COLUMN allocated_hours_per_day DECIMAL(4,2) DEFAULT NULL;
  -- NULL = no specific allocation → fallback to org_working_time_configs
  -- Valid range: 0.5 .. 24.0
  -- Only PM / Org Admin can set
```

### 1.2 New Tables to Create

#### `tenant.org_working_time_configs`

```sql
CREATE TABLE tenant.org_working_time_configs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID         NOT NULL UNIQUE,  -- 1 org = 1 row
  monday_hours     DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  tuesday_hours    DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  wednesday_hours  DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  thursday_hours   DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  friday_hours     DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  saturday_hours   DECIMAL(4,2) NOT NULL DEFAULT 0.0,
  sunday_hours     DECIMAL(4,2) NOT NULL DEFAULT 0.0,
  created_at       TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT now()
);
```

#### `tenant.org_holidays`

```sql
CREATE TYPE tenant.org_holiday_type AS ENUM (
  'national_holiday',
  'company_holiday',
  'special_day'
);

CREATE TABLE tenant.org_holidays (
  id               UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID                    NOT NULL,
  date             DATE                    NOT NULL,
  name             VARCHAR(255)            NOT NULL,
  type             tenant.org_holiday_type NOT NULL DEFAULT 'national_holiday',
  working_hours    DECIMAL(4,2)            NOT NULL DEFAULT 0.0,
  created_at       TIMESTAMP               NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP               NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMP               DEFAULT NULL,
  UNIQUE(organization_id, date)
);
```

---

## 2. New / Modified TypeORM Entities

### 2.1 Task entity — add 2 fields

```typescript
// src/modules/project/task-management/entities/task.entity.ts

/** Estimated points — only PM/Org Admin can set, other members read-only */
@Column({ name: 'estimated_point', type: 'int', nullable: true })
estimatedPoint?: number;

/** Estimated hours — only PM/Org Admin can set */
@Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
estimatedHours?: number;
```

### 2.2 ProjectMember entity — add 1 field

```typescript
// src/modules/project/core/entities/project-member.entity.ts

/** Hours/day allocated to this project — only PM/Org Admin can set
 *  NULL = no specific allocation → fallback to org_working_time_configs when computing KPI
 */
@Column({ name: 'allocated_hours_per_day', type: 'decimal', precision: 4, scale: 2, nullable: true })
allocatedHoursPerDay?: number;
```

### 2.3 OrgWorkingTimeConfig entity (new)

```typescript
// src/modules/organization/working-time/entities/org-working-time-config.entity.ts
@Entity({ schema: 'tenant', name: 'org_working_time_configs' })
export class OrgWorkingTimeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  @Column({ name: 'monday_hours',    type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  mondayHours: number;
  @Column({ name: 'tuesday_hours',   type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  tuesdayHours: number;
  @Column({ name: 'wednesday_hours', type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  wednesdayHours: number;
  @Column({ name: 'thursday_hours',  type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  thursdayHours: number;
  @Column({ name: 'friday_hours',    type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  fridayHours: number;
  @Column({ name: 'saturday_hours',  type: 'decimal', precision: 4, scale: 2, default: 0.0 })
  saturdayHours: number;
  @Column({ name: 'sunday_hours',    type: 'decimal', precision: 4, scale: 2, default: 0.0 })
  sundayHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 2.4 OrgHoliday entity (new)

```typescript
// src/modules/organization/working-time/entities/org-holiday.entity.ts
export enum OrgHolidayType {
  NATIONAL_HOLIDAY = 'national_holiday',
  COMPANY_HOLIDAY  = 'company_holiday',
  SPECIAL_DAY      = 'special_day',
}

@Entity({ schema: 'tenant', name: 'org_holidays' })
@Unique(['organizationId', 'date'])
export class OrgHoliday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'date' })
  date: string;  // YYYY-MM-DD string

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: OrgHolidayType, default: OrgHolidayType.NATIONAL_HOLIDAY })
  type: OrgHolidayType;

  @Column({ name: 'working_hours', type: 'decimal', precision: 4, scale: 2, default: 0.0 })
  workingHours: number;  // 0 = full day off, 4 = half day

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

---

## 3. Module Structure

```
src/modules/
│
├── analytics/
│   ├── analytics.module.ts
│   ├── project-kpi/
│   │   ├── project-kpi.module.ts
│   │   ├── project-kpi.controller.ts
│   │   ├── project-kpi.service.ts
│   │   └── dto/
│   │       ├── request/
│   │       │   └── project-kpi-query.request.ts
│   │       └── response/
│   │           ├── project-kpi-overview.response.ts
│   │           ├── project-member-kpi.response.ts
│   │           └── project-member-kpi-detail.response.ts
│   └── org-kpi/
│       ├── org-kpi.module.ts
│       ├── org-kpi.controller.ts
│       ├── org-kpi.service.ts
│       └── dto/
│           ├── request/
│           │   └── org-kpi-query.request.ts
│           └── response/
│               ├── org-kpi-overview.response.ts
│               ├── org-member-kpi.response.ts
│               └── org-member-kpi-detail.response.ts
│
└── organization/
    └── working-time/               ← NEW MODULE
        ├── working-time.module.ts
        ├── working-time.controller.ts
        ├── working-time.service.ts
        ├── entities/
        │   ├── org-working-time-config.entity.ts
        │   └── org-holiday.entity.ts
        └── dto/
            ├── request/
            │   ├── upsert-working-time.request.ts
            │   └── create-holiday.request.ts
            └── response/
                ├── working-time-config.response.ts
                └── holiday.response.ts
```

### Existing Files to Modify

| File | Change |
|---|---|
| `src/modules/project/task-management/entities/task.entity.ts` | Add `estimatedPoint`, `estimatedHours` |
| `src/modules/project/task-management/dto/update-task.request.ts` | Add `estimatedPoint`, `estimatedHours` — validate PM role in service |
| `src/modules/project/task-management/task.service.ts` | Guard: only PM role / Org Admin can set the 2 new fields |
| `src/modules/project/core/entities/project-member.entity.ts` | Add `allocatedHoursPerDay` |
| `src/modules/project/project-member/dto/request/update-project-member.request.ts` | Add `allocatedHoursPerDay` (optional, PM only) |
| `src/modules/project/project-member/project-member.service.ts` | Guard: only PM role / Org Admin can set `allocatedHoursPerDay` |
| `src/modules/rbac/constant/permission.constant.ts` | Add `ANALYTICS.KPI` and `ORG_CONFIG.WORKING_TIME` |
| `src/modules/organization/organization.module.ts` | Import `WorkingTimeModule` |
| `src/app.module.ts` | Import `AnalyticsModule` |

---

## 4. New Permissions

```typescript
// permission.constant.ts

// Add to ANALYTICS:
KPI: {
  VIEW_PROJECT: 'analytics.kpi.project.view',
  VIEW_ORG:     'analytics.kpi.org.view',
},

// Add new ORG_CONFIG block:
ORG_CONFIG: {
  WORKING_TIME: {
    VIEW:   'org_config.working_time.view',
    MANAGE: 'org_config.working_time.manage',
  },
},
```

```typescript
// USER_PERMISSIONS — do NOT add kpi.project.view here (PM-only, checked via project role)
// Only add:
'org_config.working_time.view',
```

```typescript
// ORG_ADMIN_MODULES — add 'org_config':
export const ORG_ADMIN_MODULES = [
  'tenant', 'documents', 'chatbot', 'projects', 'analytics',
  'rbac', 'ticket_requests', 'notifications',
  'org_config',  // ← new
];
```

> **Important note about Project KPI access**:
> Project KPI does not use RBAC permissions — access is checked via **project role** in the service:
> `member.role === ProjectMemberRole.MANAGER` or user is Org Admin.
> This follows the same pattern used by other sensitive project module endpoints.

---

## 5. Working Time Service — Core Logic

### 5.1 Get config (create if not exists)

```typescript
async getOrCreateConfig(orgId: string): Promise<OrgWorkingTimeConfig> {
  let config = await this.configRepo.findOne({ where: { organizationId: orgId } });
  if (!config) {
    config = this.configRepo.create({
      organizationId: orgId,
      // defaults: Mon-Fri=8, Sat=0, Sun=0
    });
    await this.configRepo.save(config);
  }
  return config;
}
```

### 5.2 Get standard working hours for a single day

```typescript
const DAY_HOURS_KEY = [
  'sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours',
  'thursdayHours', 'fridayHours', 'saturdayHours',
];

function getStandardHoursForDate(
  date: Date,
  config: OrgWorkingTimeConfig,
  holidayMap: Map<string, OrgHoliday>,  // key = 'YYYY-MM-DD'
): number {
  const dateStr = date.toISOString().slice(0, 10);
  const holiday = holidayMap.get(dateStr);
  if (holiday) return Number(holiday.workingHours); // holiday overrides
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  return Number(config[DAY_HOURS_KEY[dayOfWeek]]);
}
```

### 5.3 Calculate total expected working hours for a period

```typescript
/**
 * Calculates expectedWorkingHours for a member within a period.
 *
 * @param allocatedHoursPerDay — taken from project_members.allocated_hours_per_day.
 *   If null → use org_working_time_configs (hours by weekday).
 *   Holidays always override both (holiday.working_hours takes precedence).
 */
async calcExpectedWorkingHours(
  orgId: string,
  dateFrom: Date,
  dateTo: Date,
  allocatedHoursPerDay?: number | null,
): Promise<number> {
  const config = await this.getOrCreateConfig(orgId);
  const holidays = await this.holidayRepo.find({
    where: { organizationId: orgId },
  });
  const holidayMap = new Map(holidays.map(h => [h.date, h]));

  let total = 0;
  const cur = new Date(dateFrom);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    const holiday = holidayMap.get(dateStr);

    if (holiday) {
      // Holiday: use holiday's working_hours (may be 0)
      total += Number(holiday.workingHours);
    } else if (allocatedHoursPerDay != null) {
      // Member has specific allocation — but only count normal working days
      // (check org config to determine whether this day is a working day)
      const orgHours = getStandardHoursForDate(cur, config, holidayMap);
      if (orgHours > 0) {
        total += allocatedHoursPerDay;  // working day → use allocation
      }
      // if org = 0 (Sat/Sun not configured) → skip
    } else {
      // Fallback: use org config
      total += getStandardHoursForDate(cur, config, holidayMap);
    }

    cur.setDate(cur.getDate() + 1);
  }
  return total;
}
```

### 5.4 Calculate OT multiplier per day (dynamic from OrgSettings)

> **Important**: OT multipliers are configured at org level via `OrgSettings`
> (see [settings/detail-design.md](../settings_en/detail-design.md#2-typeorm-entities)).
> **Do not hardcode** — always fetch from `KpiSettingsResolver.resolveOtMultipliers(orgId)`.

```typescript
interface OtMultipliers {
  weekday: number;
  saturday: number;
  sunday: number;
  holiday: number;
}

function getOtMultiplier(
  dateStr: string,          // 'YYYY-MM-DD'
  holidayMap: Map<string, OrgHoliday>,
  multipliers: OtMultipliers,
): number {
  if (holidayMap.has(dateStr)) return multipliers.holiday;
  const dayOfWeek = new Date(dateStr).getDay();
  if (dayOfWeek === 0) return multipliers.sunday;
  if (dayOfWeek === 6) return multipliers.saturday;
  return multipliers.weekday;
}
```

### 5.5 Calculate effective OT hours from approved OT tickets

> **Note**: `totalOtHours` = SUM(`effortEntries[].hours`) — taken from detail entries,
> **not** from `ot_metadata.totalActualHours` (that field is for UI display only).

```typescript
async calcMemberOtHours(
  userId: string,
  orgId: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<{ totalOtHours: number; effectiveOtHours: number; approvedOtTickets: number }> {
  const tickets = await this.ticketRepo.find({
    where: {
      requesterId: userId,
      organizationId: orgId,
      type: TicketRequestType.OVERTIME,
      status: TicketRequestStatus.APPROVED,
    },
  });

  const config     = await this.getOrCreateConfig(orgId);
  const holidays   = await this.holidayRepo.find({ where: { organizationId: orgId } });
  const holidayMap = new Map(holidays.map(h => [h.date, h]));
  // Dynamic multipliers from OrgSettings (not hardcoded)
  const multipliers = await this.kpiSettingsResolver.resolveOtMultipliers(orgId);

  let totalOtHours    = 0;
  let effectiveOtHours = 0;

  for (const ticket of tickets) {
    const entries = ticket.otMetadata?.effortEntries ?? [];
    for (const entry of entries) {
      // optional date range filter
      if (dateFrom && new Date(entry.date) < dateFrom) continue;
      if (dateTo   && new Date(entry.date) > dateTo)   continue;

      const hours = Number(entry.hours);
      const mult  = getOtMultiplier(entry.date, holidayMap, multipliers);
      totalOtHours     += hours;
      effectiveOtHours += hours * mult;
    }
  }

  return {
    totalOtHours: Math.round(totalOtHours * 100) / 100,
    effectiveOtHours: Math.round(effectiveOtHours * 100) / 100,
    approvedOtTickets: tickets.length,
  };
}
```

---

## 6. KPI Calculation Helpers

> **Important**: All weights and bonus rules are fetched from `KpiSettingsResolver` (see [settings/detail-design.md](../settings_en/detail-design.md#4-resolved-kpi-weights-core-helper)).
> Do not hardcode any weights in the KPI service.

### 6.1 calcRates

```typescript
interface TaskStatsRaw {
  totalAssigned: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  earlyTasks: number;           // done before deadline >= bonusEarlyTaskHours
  totalEstimatePoints: number;  // SUM(COALESCE(estimated_point, 1)) assigned tasks
  totalActualPoints: number;    // SUM(COALESCE(estimated_point, 1)) done tasks
}

function calcRates(stats: TaskStatsRaw) {
  const estimatePoints = stats.totalEstimatePoints || 1;

  const completionRate      = stats.totalAssigned
    ? Math.round((stats.completedTasks / stats.totalAssigned) * 100) : 0;
  const onTimeRate          = stats.completedTasks
    ? Math.round((stats.onTimeTasks / stats.completedTasks) * 100) : 0;
  const overdueRate         = stats.totalAssigned
    ? Math.round((stats.overdueTasks / stats.totalAssigned) * 100) : 0;
  const pointCompletionRate = Math.round((stats.totalActualPoints / estimatePoints) * 100);

  return { completionRate, onTimeRate, overdueRate, pointCompletionRate };
}
```

### 6.2 calcOtContributionScore

```typescript
function calcOtContributionScore(
  effectiveOtHours: number,
  expectedWorkingHours: number,
): number {
  if (!expectedWorkingHours || !effectiveOtHours) return 0;
  return Math.min(100, Math.round((effectiveOtHours / expectedWorkingHours) * 100));
}
```

### 6.3 calcFinalScore (dynamic weights + bonus)

```typescript
// Called from ProjectKpiService / OrgKpiService
async function buildMemberScore(
  stats: TaskStatsRaw,
  otData: { effectiveOtHours: number; expectedWorkingHours: number },
  projectId: string | null,
  orgId: string,
  kpiSettingsResolver: KpiSettingsResolver,
): Promise<{ baseScore: number; bonusPoints: number; finalScore: number }> {

  const rates  = calcRates(stats);
  const weights = await kpiSettingsResolver.resolveWeights(projectId, orgId);
  const rules   = await kpiSettingsResolver.resolveBonusRules(projectId, orgId);

  const otScore  = calcOtContributionScore(
    otData.effectiveOtHours,
    otData.expectedWorkingHours,
  );

  // Base score with dynamic weights
  const baseScore = Math.min(100,
    Math.round(
      rates.pointCompletionRate * weights.weightPointCompletion +
      rates.onTimeRate          * weights.weightOnTime          +
      otScore                   * weights.weightOtContribution,
    ),
  );

  // Bonus
  const bonusPoints = calcBonusPoints(
    {
      onTimeTasks:      stats.onTimeTasks,
      earlyTasks:       stats.earlyTasks,
      hasZeroOverdue:   stats.overdueTasks === 0,
      effectiveOtHours: otData.effectiveOtHours,
    },
    rules,
  );

  const finalScore = Math.min(100,
    Math.round((baseScore + bonusPoints) * 10) / 10,
  );

  return { baseScore, bonusPoints, finalScore };
}
```

### 6.4 earlyTasks SQL snippet

`bonusEarlyTaskHours` must be fetched from settings before running the query:

```sql
-- Add to task stats query:
SUM(CASE
  WHEN task.status_id = ANY(:doneIds)
    AND task.due_date IS NOT NULL
    AND task.completed_at IS NOT NULL
    AND task.completed_at <= (task.due_date - INTERVAL ':earlyHours hours')
  THEN 1 ELSE 0
END) AS "earlyTasks"
-- :earlyHours = bonusEarlyTaskHours from settings (default 24)
```

---

## 7. Core SQL Queries

### 7.1 Done status IDs (per project)

```sql
SELECT id FROM project.status_tasks
WHERE project_id     = :projectId
  AND organization_id = :orgId
  AND deleted_at IS NULL
  AND LOWER(name) = 'done'
```

### 7.2 Leaf task condition

```sql
LEFT JOIN project.tasks AS child
  ON  child.parent_task_id = task.id
  AND child.organization_id = task.organization_id
  AND child.deleted_at IS NULL
-- then: AND child.id IS NULL
```

### 7.3 Task stats per member (project scope) — with story points

```sql
SELECT
  task.assigned_to                                   AS "userId",
  COUNT(task.id)                                     AS "totalAssigned",

  -- estimated points (fallback: 1 if PM has not set)
  SUM(COALESCE(task.estimated_point, 1))              AS "totalEstimatePoints",
  SUM(task.estimated_hours)                           AS "totalEstimatedHours",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN 1 ELSE 0 END)                            AS "completedTasks",

  -- actualPoints = estimated_point of done tasks
  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalActualPoints",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN COALESCE(task.estimated_hours, 0) ELSE 0 END) AS "completedEstimatedHours",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
        AND task.due_date IS NOT NULL
        AND task.completed_at IS NOT NULL
        AND task.completed_at <= task.due_date
       THEN 1 ELSE 0 END)                           AS "onTimeTasks",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
        AND task.due_date IS NOT NULL
        AND task.completed_at IS NOT NULL
        AND task.completed_at > task.due_date
       THEN 1 ELSE 0 END)                           AS "lateTasks",

  SUM(CASE WHEN task.status_id != ALL(:doneIds)
        AND task.due_date IS NOT NULL
        AND task.due_date < :now
       THEN 1 ELSE 0 END)                           AS "overdueTasks",

  SUM(CASE WHEN task.status_id != ALL(:doneIds)
        AND task.due_date IS NOT NULL
        AND task.due_date >= :now
        AND task.due_date <= :dueSoonAt
       THEN 1 ELSE 0 END)                           AS "dueSoonTasks"

FROM project.tasks AS task
LEFT JOIN project.tasks AS child
  ON  child.parent_task_id = task.id
  AND child.organization_id = task.organization_id
  AND child.deleted_at IS NULL
WHERE task.project_id     = :projectId
  AND task.organization_id = :orgId
  AND task.assigned_to   IN (:...memberIds)
  AND task.deleted_at    IS NULL
  AND child.id           IS NULL
GROUP BY task.assigned_to
```

### 7.4 Project overview stats (entire project)

```sql
SELECT
  COUNT(task.id)                                AS "totalTasks",
  -- projectTotalEstimatePoints = entire project plan
  SUM(COALESCE(task.estimated_point, 1))         AS "projectTotalEstimatePoints",
  SUM(task.estimated_hours)                      AS "totalEstimatedHours",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN 1 ELSE 0 END)                       AS "completedTasks",
  -- projectTotalActualPoints = delivered points
  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "projectTotalActualPoints",

  SUM(CASE WHEN task.status_id != ALL(:doneIds)
        AND task.due_date IS NOT NULL
        AND task.due_date < :now
       THEN 1 ELSE 0 END)                      AS "overdueTasks",

  SUM(CASE WHEN task.status_id != ALL(:doneIds)
        AND task.due_date >= :now
        AND task.due_date <= :dueSoonAt
       THEN 1 ELSE 0 END)                      AS "dueSoonTasks",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
        AND task.completed_at IS NOT NULL
        AND task.due_date IS NOT NULL
        AND task.completed_at <= task.due_date
       THEN 1 ELSE 0 END)                      AS "doneOnTimeTasks"

FROM project.tasks AS task
LEFT JOIN project.tasks AS child
  ON  child.parent_task_id = task.id
  AND child.organization_id = task.organization_id
  AND child.deleted_at IS NULL
WHERE task.project_id     = :projectId
  AND task.organization_id = :orgId
  AND task.deleted_at    IS NULL
  AND child.id           IS NULL
```

### 7.5 Org-scope task stats (all projects, JOIN with status_tasks to detect done)

```sql
SELECT
  task.assigned_to                                    AS "userId",
  task.project_id                                     AS "projectId",
  COUNT(task.id)                                      AS "totalAssigned",
  SUM(COALESCE(task.estimated_point, 1))              AS "totalEstimatePoints",
  SUM(task.estimated_hours)                           AS "totalEstimatedHours",

  SUM(CASE WHEN LOWER(st.name) = 'done' THEN 1 ELSE 0 END)
                                                      AS "completedTasks",
  -- totalActualPoints = estimated_point of done tasks
  SUM(CASE WHEN LOWER(st.name) = 'done'
       THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalActualPoints",

  SUM(CASE WHEN LOWER(st.name) = 'done'
        AND task.due_date IS NOT NULL
        AND task.completed_at IS NOT NULL
        AND task.completed_at <= task.due_date
       THEN 1 ELSE 0 END)                             AS "onTimeTasks",

  SUM(CASE WHEN LOWER(st.name) = 'done'
        AND task.due_date IS NOT NULL
        AND task.completed_at IS NOT NULL
        AND task.completed_at > task.due_date
       THEN 1 ELSE 0 END)                             AS "lateTasks",

  SUM(CASE WHEN (st.id IS NULL OR LOWER(st.name) != 'done')
        AND task.due_date IS NOT NULL
        AND task.due_date < :now
       THEN 1 ELSE 0 END)                             AS "overdueTasks",

  SUM(CASE WHEN (st.id IS NULL OR LOWER(st.name) != 'done')
        AND task.due_date IS NOT NULL
        AND task.due_date >= :now
        AND task.due_date <= :dueSoonAt
       THEN 1 ELSE 0 END)                             AS "dueSoonTasks"

FROM project.tasks AS task
LEFT JOIN project.tasks AS child
  ON  child.parent_task_id = task.id
  AND child.organization_id = task.organization_id
  AND child.deleted_at IS NULL
LEFT JOIN project.status_tasks AS st
  ON  st.id = task.status_id
  AND st.project_id = task.project_id
  AND st.deleted_at IS NULL
WHERE task.organization_id = :orgId
  AND task.assigned_to    IN (:...memberIds)
  AND task.deleted_at     IS NULL
  AND child.id            IS NULL
GROUP BY task.assigned_to, task.project_id
```

---

## 8. DTOs

### 8.1 Request DTOs

#### `project-kpi-query.request.ts`

```typescript
export enum KpiMemberSortBy {
  PERFORMANCE_SCORE    = 'performanceScore',
  COMPLETION_RATE      = 'completionRate',
  ON_TIME_RATE         = 'onTimeRate',
  TOTAL_ASSIGNED       = 'totalAssigned',
  POINT_COMPLETION     = 'pointCompletionRate',
}

export class ProjectKpiMembersQueryRequest {
  @IsOptional() @IsUUID()
  userId?: string;

  @IsOptional() @IsEnum(KpiMemberSortBy)
  sortBy?: KpiMemberSortBy = KpiMemberSortBy.PERFORMANCE_SCORE;

  @IsOptional() @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional() @IsDateString()
  dateFrom?: string;  // YYYY-MM-DD — used to calculate expectedWorkingHours

  @IsOptional() @IsDateString()
  dateTo?: string;
}
```

#### `org-kpi-query.request.ts`

```typescript
export enum OrgKpiMemberSortBy {
  PERFORMANCE_SCORE = 'performanceScore',
  COMPLETION_RATE   = 'completionRate',
  ON_TIME_RATE      = 'onTimeRate',
  TOTAL_ASSIGNED    = 'totalAssigned',
  PROJECT_COUNT     = 'projectCount',
  POINT_COMPLETION  = 'pointCompletionRate',
  OT_HOURS          = 'totalOtHours',
}

export class OrgKpiMembersQueryRequest {
  @IsOptional() @IsUUID()
  userId?: string;

  @IsOptional() @IsEnum(OrgKpiMemberSortBy)
  sortBy?: OrgKpiMemberSortBy = OrgKpiMemberSortBy.PERFORMANCE_SCORE;

  @IsOptional() @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @IsDateString()
  dateFrom?: string;

  @IsOptional() @IsDateString()
  dateTo?: string;
}
```

---

### 8.2 Response DTOs — Working Time Config

```typescript
export class WorkingTimeConfigResponse {
  organizationId: string;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
  updatedAt: Date;
}

export class HolidayResponse {
  id: string;
  date: string;        // YYYY-MM-DD
  name: string;
  type: OrgHolidayType;
  workingHours: number;
}
```

---

### 8.3 Response DTOs — Project KPI

#### `project-kpi-overview.response.ts`

```typescript
export class ProjectKpiOverviewResponse {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: Date;
  endDate?: Date;
  daysRemaining?: number;
  progress: number;           // project.progress (0-100)
  isPointComplete: boolean;   // pointBasedProgress >= 100

  // Task counts
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;

  // Points — estimate (planned) vs actual (delivered)
  projectTotalEstimatePoints: number;   // SUM(estimated_point) all tasks
  projectTotalActualPoints: number;     // SUM(estimated_point) done tasks
  projectOpenPoints: number;            // projectTotalEstimatePoints - projectTotalActualPoints
  pointBasedProgress: number;           // Math.min(100, actualPoints / estimatePoints × 100) (%)

  // Hours
  totalEstimatedHours?: number;
  completedEstimatedHours?: number;

  // Rates
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;
  overdueRate: number;

  // Members
  totalMembers: number;
  activeMembers: number;
}
```

#### `project-member-kpi.response.ts` (list)

```typescript
export class ProjectMemberKpiResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;

  // Task
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;

  // Points
  totalEstimatePoints: number;    // SUM(estimated_point) tasks assigned to this member
  totalActualPoints: number;      // SUM(estimated_point) done tasks of this member
  openPoints: number;             // totalEstimatePoints - totalActualPoints
  pointCompletionRate: number;    // Math.min(100, actualPoints / estimatePoints × 100) (%)

  // Hours
  totalEstimatedHours?: number;
  completedEstimatedHours?: number;
  allocatedHoursPerDay?: number;  // from project_members — null if not set
  expectedWorkingHours?: number;  // null if no dateFrom/dateTo provided

  // OT
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;

  // Rates
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
}
```

#### `project-member-kpi-detail.response.ts` (single)

```typescript
export class RecentTaskItem {
  taskId: string;
  title: string;
  slug?: string;
  statusName: string;
  priority: TaskPriority;
  estimatedPoint?: number;   // set by PM
  estimatedHours?: number;   // set by PM
  dueDate?: Date;
  dueState: TaskDueState;
  completedAt?: Date;
}

export class ProjectMemberKpiDetailResponse extends ProjectMemberKpiResponse {
  tasksByPriority: { urgent: number; high: number; medium: number; low: number };
  pointsByPriority: { urgent: number; high: number; medium: number; low: number };
  recentTasks: RecentTaskItem[];  // max 5, ordered by updated_at DESC
}
```

---

### 8.4 Response DTOs — Org KPI

#### `org-kpi-overview.response.ts`

```typescript
export class OrgKpiOverviewResponse {
  organizationId: string;

  totalMembers: number;
  activeMembers: number;

  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  avgProjectProgress: number;

  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  // aggregate points for entire org
  totalEstimatePoints: number;    // SUM of all tasks
  totalActualPoints: number;      // SUM of done tasks
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;

  totalTickets: number;
  pendingTickets: number;
  approvedTickets: number;
  rejectedTickets: number;
  avgTicketResolutionHours?: number;

  // OT aggregate
  totalApprovedOtTickets: number;
  totalOtHours: number;
}
```

#### `org-member-kpi.response.ts` (list + pagination)

```typescript
export class OrgMemberKpiResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;

  projectCount: number;
  activeProjectCount: number;

  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;

  totalEstimatePoints: number;    // SUM estimated_point of assigned tasks
  totalActualPoints: number;      // SUM estimated_point of done tasks
  openPoints: number;             // totalEstimatePoints - totalActualPoints
  pointCompletionRate: number;

  totalEstimatedHours?: number;
  expectedWorkingHours?: number;

  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;

  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;

  // Ticket summary
  totalTickets: number;
  pendingTickets: number;
  approvedTickets: number;
  rejectedTickets: number;
}
```

#### `org-member-kpi-detail.response.ts` (single)

```typescript
export class OrgMemberKpiAggregateResponse {
  projectCount: number;
  activeProjectCount: number;
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  openPoints: number;             // totalEstimatePoints - totalActualPoints
  pointCompletionRate: number;
  totalEstimatedHours?: number;
  expectedWorkingHours?: number;
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
}

export class OrgMemberKpiByProjectResponse {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;    // planned points for this member in this project
  totalActualPoints: number;      // actual delivered points
  openPoints: number;             // totalEstimatePoints - totalActualPoints
  pointCompletionRate: number;
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
}

export class OrgMemberOtSummaryResponse {
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  breakdown: Array<{
    ticketId: string;
    ticketCode: string;
    projectName?: string;
    date: string;
    hours: number;
    multiplier: number;
    effectiveHours: number;
  }>;
}

export class OrgMemberTicketSummaryResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: {
    leave: number;
    wfh: number;
    overtime: number;
    advance: number;
    general: number;
  };
}

export class OrgMemberKpiDetailResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  aggregate: OrgMemberKpiAggregateResponse;
  byProject: OrgMemberKpiByProjectResponse[];
  ot: OrgMemberOtSummaryResponse;
  tickets: OrgMemberTicketSummaryResponse;
}
```

---

## 9. Service Methods

### 9.1 WorkingTimeService

```typescript
getOrCreateConfig(orgId)
upsertConfig(orgId, dto)
listHolidays(orgId)
addHoliday(orgId, dto)
deleteHoliday(orgId, holidayId)
calcExpectedWorkingHours(orgId, dateFrom, dateTo, allocatedHoursPerDay?)
// allocatedHoursPerDay: taken from project_members.allocated_hours_per_day
// → null/undefined = fallback to org config
calcMemberOtHours(userId, orgId, dateFrom?, dateTo?)
```

### 9.2 ProjectKpiService

```typescript
getProjectOverview(projectId, orgId, currentUserId)
getProjectMembersKpi(projectId, orgId, currentUserId, query)
getProjectMemberKpiDetail(projectId, orgId, currentUserId, targetUserId)
// helpers:
private getDoneStatusIds(projectId, orgId)
private calcRates(stats)
private calcPerformanceScore(pointRate, onTimeRate, otScore)
```

### 9.3 OrgKpiService

```typescript
getOrgOverview(orgId)
getOrgMembersKpi(orgId, currentUserId, query)
getOrgMemberKpiDetail(orgId, currentUserId, targetUserId)
// helpers:
private calcRates(stats)
private calcPerformanceScore(pointRate, onTimeRate, otScore)
```

---

## 10. Controller & Routing

### 10.1 WorkingTimeController

```typescript
@ApiTags('Org Config — Working Time')
@Controller({ path: 'org-config/working-time', version: '1' })
export class WorkingTimeController {
  @Get()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.VIEW)
  getConfig(@GetOrgId() orgId)

  @Put()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  upsertConfig(@GetOrgId() orgId, @Body() dto)

  @Get('holidays')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.VIEW)
  listHolidays(@GetOrgId() orgId)

  @Post('holidays')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  addHoliday(@GetOrgId() orgId, @Body() dto)

  @Delete('holidays/:id')
  @RequirePermission(PERMISSIONS.ORG_CONFIG.WORKING_TIME.MANAGE)
  deleteHoliday(@GetOrgId() orgId, @Param('id', ParseUUIDPipe) id)
}
```

### 10.2 ProjectKpiController

```typescript
@Controller({ path: 'projects/:projectId/kpi', version: '1' })
// No @RequirePermission at controller level
// Service checks: member.role === MANAGER or user is Org Admin
// → throws ForbiddenException for regular members
@Get('overview')        → getProjectOverview()
@Get('members')         → getProjectMembersKpi()
@Get('members/:userId') → getProjectMemberKpiDetail()
```

**Access check pattern in service:**

```typescript
// ProjectKpiService — at the top of each method:
const member = await this.projectMemberRepo.findOne({
  where: { projectId, userId: currentUserId, organizationId: orgId },
});
const isOrgAdmin = await this.rbacService.hasPermission(
  currentUserId, PERMISSIONS.ANALYTICS.KPI.VIEW_ORG, orgId,
);
if (!member && !isOrgAdmin) throw new NotFoundException('Project not found');
if (member?.role !== ProjectMemberRole.MANAGER && !isOrgAdmin) {
  throw new ForbiddenException('Only project managers can view KPI');
}
```

### 10.3 OrgKpiController

```typescript
@Controller({ path: 'kpi', version: '1' })
@Get('overview')
@RequirePermission(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG)
→ getOrgOverview()

@Get('members')
@RequirePermission(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG)
→ getOrgMembersKpi()

@Get('members/:userId')
// No @RequirePermission → service checks: org.view OR self
→ getOrgMemberKpiDetail()
```

---

## 11. Module Wiring

### `working-time.module.ts`

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([OrgWorkingTimeConfig, OrgHoliday, TicketRequest])],
  controllers: [WorkingTimeController],
  providers: [WorkingTimeService],
  exports: [WorkingTimeService],
})
export class WorkingTimeModule {}
```

### `project-kpi.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, Task, StatusTask, User]),
    WorkingTimeModule,
    KpiSettingsResolverModule,  // ← dynamic weights + bonus
  ],
  controllers: [ProjectKpiController],
  providers: [ProjectKpiService],
})
export class ProjectKpiModule {}
```

### `org-kpi.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, Task, StatusTask,
      OrganizationMember, TicketRequest, User]),
    WorkingTimeModule,
    KpiSettingsResolverModule,
  ],
  controllers: [OrgKpiController],
  providers: [OrgKpiService],
})
export class OrgKpiModule {}
```

### `analytics.module.ts`

```typescript
@Module({
  imports: [
    ProjectKpiModule,
    OrgKpiModule,
    KpiSettingsResolverModule,  // shared export
  ],
})
export class AnalyticsModule {}
```

### `organization.module.ts` — add WorkingTimeModule

```typescript
@Module({
  imports: [
    // ... existing
    WorkingTimeModule,
  ],
})
export class OrganizationModule {}
```

---

## 12. Migration Plan

**6 migrations required (KPI + Settings combined):**

| Migration | Contents |
|---|---|
| `AddEstimatedPointToTasks` | ALTER TABLE tasks: add `estimated_point`, `estimated_hours` |
| `AddAllocatedHoursToProjectMembers` | ALTER TABLE project_members: add `allocated_hours_per_day` |
| `CreateOrgWorkingTimeConfig` | Create table `tenant.org_working_time_configs` |
| `CreateOrgHolidays` | Create enum `org_holiday_type` + table `tenant.org_holidays` |
| `CreateProjectConfigs` | Create table `project.project_configs` (from Settings module) |
| `CreateOrgSettings` | Create table `tenant.org_settings` (from Settings module) |

```bash
npm run migration:generate:tables -- src/database/migrations/tables/AddEstimatedPointToTasks
npm run migration:generate:tables -- src/database/migrations/tables/AddAllocatedHoursToProjectMembers
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgWorkingTimeConfig
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgHolidays
npm run migration:generate:tables -- src/database/migrations/tables/CreateProjectConfigs
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgSettings
npm run migration:run
```

After deploy: `POST /v1/rbac/permissions/sync`

---

## 13. Error Handling

| Scenario | Exception | HTTP |
|---|---|---|
| Project does not exist | `ValidationException(ErrorCode.P001)` | 404 |
| Not a project member | `ForbiddenException` | 403 |
| User does not exist | `ValidationException(ErrorCode.U003)` | 404 |
| userId does not belong to org | `ValidationException(ErrorCode.O003)` | 404 |
| Missing org.view permission and not self | `ForbiddenException` | 403 |
| dateTo < dateFrom | `BadRequestException` | 400 |
