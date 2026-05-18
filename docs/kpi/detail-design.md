# KPI Module — Detail Design (Thiết kế kỹ thuật)

> **Người đọc**: Backend Developer  
> **Cập nhật**: 2026-04-07 (v2 — thêm story point, working time config, OT integration)

---

## 1. Tổng quan thay đổi DB

### 1.1 Bảng hiện có cần ALTER

#### `project.tasks` — thêm 2 cột

```sql
ALTER TABLE project.tasks
  ADD COLUMN estimated_point    INT           DEFAULT NULL,  -- do PM set, nullable
  ADD COLUMN estimated_hours    DECIMAL(6,2)  DEFAULT NULL;  -- do PM set, nullable
```

#### `project.project_members` — thêm 1 cột

```sql
ALTER TABLE project.project_members
  ADD COLUMN allocated_hours_per_day DECIMAL(4,2) DEFAULT NULL;
  -- NULL = không RA cụ thể → fallback về org_working_time_configs
  -- Giá trị hợp lệ: 0.5 .. 24.0
  -- Chỉ PM / Org Admin được set
```

### 1.2 Bảng mới cần tạo

#### `tenant.org_working_time_configs`

```sql
CREATE TABLE tenant.org_working_time_configs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID         NOT NULL UNIQUE,  -- 1 org 1 row
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

## 2. TypeORM Entities mới/sửa

### 2.1 Task entity — thêm 2 field

```typescript
// src/modules/project/task-management/entities/task.entity.ts

/** Điểm ước tính — chỉ PM/Org Admin set được, member khác chỉ đọc */
@Column({ name: 'estimated_point', type: 'int', nullable: true })
estimatedPoint?: number;

/** Giờ ước tính — chỉ PM/Org Admin set được */
@Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
estimatedHours?: number;
```

### 2.2 ProjectMember entity — thêm 1 field

```typescript
// src/modules/project/core/entities/project-member.entity.ts

/** Số giờ/ngày RA cho dự án này — chỉ PM/Org Admin set được
 *  NULL = không RA cụ thể → fallback về org_working_time_configs khi tính KPI
 */
@Column({ name: 'allocated_hours_per_day', type: 'decimal', precision: 4, scale: 2, nullable: true })
allocatedHoursPerDay?: number;
```

### 2.2 OrgWorkingTimeConfig entity (mới)

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

### 2.3 OrgHoliday entity (mới)

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
  workingHours: number;  // 0 = nghỉ toàn bộ, 4 = nửa ngày

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
    └── working-time/               ← MODULE MỚI
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

### Files hiện có cần sửa

| File | Thay đổi |
|---|---|
| `src/modules/project/task-management/entities/task.entity.ts` | Thêm `estimatedPoint`, `estimatedHours` |
| `src/modules/project/task-management/dto/update-task.request.ts` | Thêm `estimatedPoint`, `estimatedHours` — validate PM role trong service |
| `src/modules/project/task-management/task.service.ts` | Guard: chỉ PM role / Org Admin mới set được 2 trường mới |
| `src/modules/project/core/entities/project-member.entity.ts` | Thêm `allocatedHoursPerDay` |
| `src/modules/project/project-member/dto/request/update-project-member.request.ts` | Thêm `allocatedHoursPerDay` (optional, PM only) |
| `src/modules/project/project-member/project-member.service.ts` | Guard: chỉ PM role / Org Admin mới set được `allocatedHoursPerDay` |
| `src/modules/rbac/constant/permission.constant.ts` | Thêm `ANALYTICS.KPI` và `ORG_CONFIG.WORKING_TIME` |
| `src/modules/organization/organization.module.ts` | Import `WorkingTimeModule` |
| `src/app.module.ts` | Import `AnalyticsModule` |

---

## 4. Permissions mới

```typescript
// permission.constant.ts

// Thêm vào ANALYTICS:
KPI: {
  VIEW_PROJECT: 'analytics.kpi.project.view',
  VIEW_ORG:     'analytics.kpi.org.view',
},

// Thêm block mới ORG_CONFIG:
ORG_CONFIG: {
  WORKING_TIME: {
    VIEW:   'org_config.working_time.view',
    MANAGE: 'org_config.working_time.manage',
  },
},
```

```typescript
// USER_PERMISSIONS — KHÔNG thêm kpi.project.view ở đây (PM-only, kiểm tra bằng project role)
// Chỉ thêm:
'org_config.working_time.view',
```

```typescript
// ORG_ADMIN_MODULES — thêm 'org_config':
export const ORG_ADMIN_MODULES = [
  'tenant', 'documents', 'chatbot', 'projects', 'analytics',
  'rbac', 'ticket_requests', 'notifications',
  'org_config',  // ← thêm mới
];
```

> **Lưu ý quan trọng về Project KPI access**:  
> Project KPI không dùng RBAC permission — kiểm tra bằng **project role** trong service:  
> `member.role === ProjectMemberRole.MANAGER` hoặc user là Org Admin.  
> Điều này giống pattern của các endpoint nhạy cảm khác trong project module.

---

## 5. Working Time Service — Core Logic

### 5.1 Lấy config (tạo mới nếu chưa có)

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

### 5.2 Tính giờ làm chuẩn cho 1 ngày

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
  if (holiday) return Number(holiday.workingHours); // override by holiday
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  return Number(config[DAY_HOURS_KEY[dayOfWeek]]);
}
```

### 5.3 Tính tổng giờ làm chuẩn trong kỳ

```typescript
/**
 * Tính expectedWorkingHours cho 1 member trong 1 kỳ.
 *
 * @param allocatedHoursPerDay — lấy từ project_members.allocated_hours_per_day.
 *   Nếu null → dùng org_working_time_configs (giờ theo ngày trong tuần).
 *   Ngày lễ luôn override cả hai (working_hours của holiday ghi đè).
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
      // Ngày lễ: dùng working_hours của holiday (có thể = 0)
      total += Number(holiday.workingHours);
    } else if (allocatedHoursPerDay != null) {
      // Member được RA cụ thể — nhưng chỉ tính ngày làm việc bình thường
      // (tham chiếu org config để biết ngày đó có làm không)
      const orgHours = getStandardHoursForDate(cur, config, holidayMap);
      if (orgHours > 0) {
        total += allocatedHoursPerDay;  // ngày có đi làm → dùng allocation
      }
      // ngày org = 0 (Sat/Sun chưa config) → không tính
    } else {
      // Fallback: dùng org config
      total += getStandardHoursForDate(cur, config, holidayMap);
    }

    cur.setDate(cur.getDate() + 1);
  }
  return total;
}
```

### 5.4 Tính hệ số OT cho từng ngày (dynamic từ OrgSettings)

> **Quan trọng**: OT multipliers được cấu hình ở org level qua `OrgSettings`
> (xem [settings/detail-design.md](../settings/detail-design.md#2-typeorm-entities)).
> **Không hardcode** — luôn lấy từ `KpiSettingsResolver.resolveOtMultipliers(orgId)`.

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

### 5.5 Tính effective OT hours từ approved OT tickets
> **Ghi chú**: `totalOtHours` = SUM(`effortEntries[].hours`) — lấy từ detail entries,
> **không** lấy từ `ot_metadata.totalActualHours` (field đó chỉ dùng hiển thị trên UI).

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
  // Dynamic multipliers từ OrgSettings (không hardcode)
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

> **Quan trọng**: Mọi weight và bonus rule đều lấy từ `KpiSettingsResolver` (xem [settings/detail-design.md](../settings/detail-design.md#4-resolved-kpi-weights-core-helper)).  
> Không hardcode bất kỳ trọng số nào trong KPI service.

### 6.1 calcRates

```typescript
interface TaskStatsRaw {
  totalAssigned: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  earlyTasks: number;           // done trước deadline >= bonusEarlyTaskHours
  totalEstimatePoints: number;  // SUM(COALESCE(estimated_point, 1)) task được giao
  totalActualPoints: number;    // SUM(COALESCE(estimated_point, 1)) task done
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
// Gọi từ ProjectKpiService / OrgKpiService
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

  // Base score với dynamic weights
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

Cần biết `bonusEarlyTaskHours` trước khi chạy query (lấy từ settings):

```sql
-- Trong task stats query, thêm:
SUM(CASE
  WHEN task.status_id = ANY(:doneIds)
    AND task.due_date IS NOT NULL
    AND task.completed_at IS NOT NULL
    AND task.completed_at <= (task.due_date - INTERVAL ':earlyHours hours')
  THEN 1 ELSE 0
END) AS "earlyTasks"
-- :earlyHours = bonusEarlyTaskHours từ settings (default 24)
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
-- sau đó: AND child.id IS NULL
```

### 7.3 Task stats per member (project scope) — với story point

```sql
SELECT
  task.assigned_to                                   AS "userId",
  COUNT(task.id)                                     AS "totalAssigned",

  -- estimated points (fallback: 1 nếu PM chưa set)
  SUM(COALESCE(task.estimated_point, 1))              AS "totalEstimatePoints",
  SUM(task.estimated_hours)                           AS "totalEstimatedHours",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN 1 ELSE 0 END)                            AS "completedTasks",

  -- actualPoints = estimated_point của task đã done
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

### 7.4 Project overview stats (tổng dự án)

```sql
SELECT
  COUNT(task.id)                                AS "totalTasks",
  -- projectTotalEstimatePoints = kế hoạch toàn dự án
  SUM(COALESCE(task.estimated_point, 1))         AS "projectTotalEstimatePoints",
  SUM(task.estimated_hours)                      AS "totalEstimatedHours",

  SUM(CASE WHEN task.status_id = ANY(:doneIds)
       THEN 1 ELSE 0 END)                       AS "completedTasks",
  -- projectTotalActualPoints = điểm đã deliver
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

### 7.5 Org-scope task stats (tất cả projects, JOIN với status_tasks để detect done)

```sql
SELECT
  task.assigned_to                                    AS "userId",
  task.project_id                                     AS "projectId",
  COUNT(task.id)                                      AS "totalAssigned",
  SUM(COALESCE(task.estimated_point, 1))              AS "totalEstimatePoints",
  SUM(task.estimated_hours)                           AS "totalEstimatedHours",

  SUM(CASE WHEN LOWER(st.name) = 'done' THEN 1 ELSE 0 END)
                                                      AS "completedTasks",
  -- totalActualPoints = estimated_point của task đã done
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
  dateFrom?: string;  // YYYY-MM-DD — dùng tính expectedWorkingHours

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

  // Points — estimate (kế hoạch) vs actual (đã deliver)
  projectTotalEstimatePoints: number;   // SUM(estimated_point) tất cả task
  projectTotalActualPoints: number;     // SUM(estimated_point) task done
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
  totalEstimatePoints: number;    // SUM(estimated_point) task được giao cho member này
  totalActualPoints: number;      // SUM(estimated_point) task done của member
  openPoints: number;             // totalEstimatePoints - totalActualPoints
  pointCompletionRate: number;    // Math.min(100, actualPoints / estimatePoints × 100) (%)

  // Hours
  totalEstimatedHours?: number;
  completedEstimatedHours?: number;
  allocatedHoursPerDay?: number;  // từ project_members — null nếu chưa set
  expectedWorkingHours?: number;  // null nếu không có dateFrom/dateTo

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
  estimatedPoint?: number;   // do PM set
  estimatedHours?: number;   // do PM set
  dueDate?: Date;
  dueState: TaskDueState;
  completedAt?: Date;
}

export class ProjectMemberKpiDetailResponse extends ProjectMemberKpiResponse {
  tasksByPriority: { urgent: number; high: number; medium: number; low: number };
  pointsByPriority: { urgent: number; high: number; medium: number; low: number };
  recentTasks: RecentTaskItem[];  // max 5, order by updated_at DESC
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
  // aggregate points của toàn org
  totalEstimatePoints: number;    // SUM tất cả task
  totalActualPoints: number;      // SUM task done
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

  totalEstimatePoints: number;    // SUM estimated_point task được giao
  totalActualPoints: number;      // SUM estimated_point task done
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
  totalEstimatePoints: number;    // kế hoạch của member trong project này
  totalActualPoints: number;      // thực tế đã deliver
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
// allocatedHoursPerDay: lấy từ project_members.allocated_hours_per_day
// → null/undefined = fallback về org config
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
// Không @RequirePermission tại controller level
// Service kiểm tra: member.role === MANAGER hoặc user là Org Admin
// → throws ForbiddenException nếu là member thường
@Get('overview')        → getProjectOverview()
@Get('members')         → getProjectMembersKpi()
@Get('members/:userId') → getProjectMemberKpiDetail()
```

**Access check pattern trong service:**

```typescript
// ProjectKpiService — đầu mỗi method:
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
// Không @RequirePermission → service kiểm tra: org.view OR self
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
    KpiSettingsResolverModule,  // export dùng chung
  ],
})
export class AnalyticsModule {}
```

### `organization.module.ts` — thêm WorkingTimeModule

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

**6 migrations cần tạo (KPI + Settings gộp):**

| Migration | Nội dung |
|---|---|
| `AddEstimatedPointToTasks` | ALTER TABLE task: thêm `estimated_point`, `estimated_hours` |
| `AddAllocatedHoursToProjectMembers` | ALTER TABLE project_members: thêm `allocated_hours_per_day` |
| `CreateOrgWorkingTimeConfig` | Tạo bảng `tenant.org_working_time_configs` |
| `CreateOrgHolidays` | Tạo enum `org_holiday_type` + bảng `tenant.org_holidays` |
| `CreateProjectConfigs` | Tạo bảng `project.project_configs` (từ Settings module) |
| `CreateOrgSettings` | Tạo bảng `tenant.org_settings` (từ Settings module) |

```bash
npm run migration:generate:tables -- src/database/migrations/tables/AddEstimatedPointToTasks
npm run migration:generate:tables -- src/database/migrations/tables/AddAllocatedHoursToProjectMembers
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgWorkingTimeConfig
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgHolidays
npm run migration:generate:tables -- src/database/migrations/tables/CreateProjectConfigs
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgSettings
npm run migration:run
```

Sau deploy: `POST /v1/rbac/permissions/sync`

---

## 13. Error Handling

| Tình huống | Exception | HTTP |
|---|---|---|
| Project không tồn tại | `ValidationException(ErrorCode.P001)` | 404 |
| Không phải member project | `ForbiddenException` | 403 |
| User không tồn tại | `ValidationException(ErrorCode.U003)` | 404 |
| userId không thuộc org | `ValidationException(ErrorCode.O003)` | 404 |
| Thiếu permission org.view + không phải self | `ForbiddenException` | 403 |
| dateTo < dateFrom | `BadRequestException` | 400 |
