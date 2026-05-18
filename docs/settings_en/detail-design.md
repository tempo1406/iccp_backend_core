# Settings Module — Detail Design (Technical Design)

> **Audience**: Backend Developer
> **Updated**: 2026-04-07

---

## 1. DB Schema

### 1.1 `project.project_configs` (new)

One row per project at most. All columns nullable — null means "use org default".

```sql
CREATE TABLE project.project_configs (
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                      UUID          NOT NULL UNIQUE,
  organization_id                 UUID          NOT NULL,

  -- Meeting: Daily Standup
  daily_enabled                   BOOLEAN       DEFAULT FALSE,
  daily_time                      TIME          DEFAULT NULL,          -- HH:MM
  daily_days                      INT[]         DEFAULT '{1,2,3,4,5}', -- 1=Mon..7=Sun
  daily_reminder_minutes          INT           DEFAULT 15,

  -- Meeting: Weekly Review
  weekly_enabled                  BOOLEAN       DEFAULT FALSE,
  weekly_day                      INT           DEFAULT 5,             -- 5=Fri
  weekly_time                     TIME          DEFAULT NULL,
  weekly_reminder_minutes         INT           DEFAULT 30,

  -- Reminder: Task Deadline
  task_due_reminder_enabled       BOOLEAN       DEFAULT TRUE,
  task_due_reminder_hours         INT[]         DEFAULT '{24,2}',
  reminder_channels               TEXT[]        DEFAULT '{push_notification,in_app}',
  overdue_escalation_enabled      BOOLEAN       DEFAULT FALSE,
  overdue_escalation_after_hours  INT           DEFAULT 4,

  -- Point Scale
  point_scale_type                VARCHAR(20)   DEFAULT NULL,          -- 'fibonacci'|'linear'|'custom'
  point_scale_values              INT[]         DEFAULT NULL,          -- custom list
  max_point_per_task              INT           DEFAULT NULL,

  -- KPI Weights (null = use org default)
  kpi_weight_point_completion     DECIMAL(4,3)  DEFAULT NULL,          -- 0.000..1.000
  kpi_weight_on_time              DECIMAL(4,3)  DEFAULT NULL,
  kpi_weight_ot_contribution      DECIMAL(4,3)  DEFAULT NULL,

  -- Bonus Rules (null = use org default)
  bonus_enabled                   BOOLEAN       DEFAULT NULL,
  bonus_on_time_task              DECIMAL(5,2)  DEFAULT NULL,
  bonus_early_task_hours          INT           DEFAULT NULL,
  bonus_early_task                DECIMAL(5,2)  DEFAULT NULL,
  bonus_zero_overdue              DECIMAL(5,2)  DEFAULT NULL,
  bonus_max_cap                   DECIMAL(5,2)  DEFAULT NULL,
  bonus_ot_per_effective_hour     DECIMAL(5,2)  DEFAULT NULL,

  created_at                      TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMP     NOT NULL DEFAULT now()
);
```

---

### 1.2 `tenant.org_settings` (new)

Org-level settings — one row per org.

```sql
CREATE TABLE tenant.org_settings (
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID          NOT NULL UNIQUE,

  -- Default KPI Weights
  default_weight_point_completion DECIMAL(4,3)  NOT NULL DEFAULT 0.500,
  default_weight_on_time          DECIMAL(4,3)  NOT NULL DEFAULT 0.300,
  default_weight_ot_contribution  DECIMAL(4,3)  NOT NULL DEFAULT 0.200,

  -- OT Multipliers
  ot_multiplier_weekday           DECIMAL(4,2)  NOT NULL DEFAULT 1.00,
  ot_multiplier_saturday          DECIMAL(4,2)  NOT NULL DEFAULT 1.50,
  ot_multiplier_sunday            DECIMAL(4,2)  NOT NULL DEFAULT 2.00,
  ot_multiplier_holiday           DECIMAL(4,2)  NOT NULL DEFAULT 3.00,

  -- Default Bonus Rules
  bonus_enabled                   BOOLEAN       NOT NULL DEFAULT FALSE,
  bonus_on_time_task              DECIMAL(5,2)  NOT NULL DEFAULT 0.50,
  bonus_early_task_hours          INT           NOT NULL DEFAULT 24,
  bonus_early_task                DECIMAL(5,2)  NOT NULL DEFAULT 1.00,
  bonus_zero_overdue              DECIMAL(5,2)  NOT NULL DEFAULT 2.00,
  bonus_max_cap                   DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
  bonus_ot_per_effective_hour     DECIMAL(5,2)  NOT NULL DEFAULT 0.20,

  -- Notification Defaults
  default_reminder_channels       TEXT[]        NOT NULL DEFAULT '{push_notification,in_app}',

  -- KPI Digest
  digest_enabled                  BOOLEAN       NOT NULL DEFAULT FALSE,
  digest_day                      INT           NOT NULL DEFAULT 1,    -- 1=Mon
  digest_time                     TIME          NOT NULL DEFAULT '08:00',
  digest_recipients               TEXT[]        NOT NULL DEFAULT '{org_admin}',
  digest_channels                 TEXT[]        NOT NULL DEFAULT '{email,in_app}',

  created_at                      TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMP     NOT NULL DEFAULT now()
);
```

---

## 2. TypeORM Entities

### 2.1 `ProjectConfig` entity

```typescript
// src/modules/project/settings/entities/project-config.entity.ts
@Entity({ schema: 'project', name: 'project_configs' })
export class ProjectConfig {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // --- Meeting ---
  @Column({ name: 'daily_enabled', type: 'boolean', default: false })
  dailyEnabled: boolean;

  @Column({ name: 'daily_time', type: 'time', nullable: true })
  dailyTime?: string;   // 'HH:MM:SS' — from PostgreSQL time type

  @Column({ name: 'daily_days', type: 'int', array: true, default: [1,2,3,4,5] })
  dailyDays: number[];

  @Column({ name: 'daily_reminder_minutes', type: 'int', default: 15 })
  dailyReminderMinutes: number;

  @Column({ name: 'weekly_enabled', type: 'boolean', default: false })
  weeklyEnabled: boolean;

  @Column({ name: 'weekly_day', type: 'int', default: 5 })
  weeklyDay: number;

  @Column({ name: 'weekly_time', type: 'time', nullable: true })
  weeklyTime?: string;

  @Column({ name: 'weekly_reminder_minutes', type: 'int', default: 30 })
  weeklyReminderMinutes: number;

  // --- Reminder ---
  @Column({ name: 'task_due_reminder_enabled', type: 'boolean', default: true })
  taskDueReminderEnabled: boolean;

  @Column({ name: 'task_due_reminder_hours', type: 'int', array: true, default: [24,2] })
  taskDueReminderHours: number[];

  @Column({ name: 'reminder_channels', type: 'text', array: true,
    default: ['push_notification','in_app'] })
  reminderChannels: string[];

  @Column({ name: 'overdue_escalation_enabled', type: 'boolean', default: false })
  overdueEscalationEnabled: boolean;

  @Column({ name: 'overdue_escalation_after_hours', type: 'int', default: 4 })
  overdueEscalationAfterHours: number;

  // --- Point Scale ---
  @Column({ name: 'point_scale_type', type: 'varchar', length: 20, nullable: true })
  pointScaleType?: 'fibonacci' | 'linear' | 'custom';

  @Column({ name: 'point_scale_values', type: 'int', array: true, nullable: true })
  pointScaleValues?: number[];

  @Column({ name: 'max_point_per_task', type: 'int', nullable: true })
  maxPointPerTask?: number;

  // --- KPI Weights (null = inherit org) ---
  @Column({ name: 'kpi_weight_point_completion', type: 'decimal',
    precision: 4, scale: 3, nullable: true })
  kpiWeightPointCompletion?: number;

  @Column({ name: 'kpi_weight_on_time', type: 'decimal',
    precision: 4, scale: 3, nullable: true })
  kpiWeightOnTime?: number;

  @Column({ name: 'kpi_weight_ot_contribution', type: 'decimal',
    precision: 4, scale: 3, nullable: true })
  kpiWeightOtContribution?: number;

  // --- Bonus Rules (null = inherit org) ---
  @Column({ name: 'bonus_enabled', type: 'boolean', nullable: true })
  bonusEnabled?: boolean;

  @Column({ name: 'bonus_on_time_task', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bonusOnTimeTask?: number;

  @Column({ name: 'bonus_early_task_hours', type: 'int', nullable: true })
  bonusEarlyTaskHours?: number;

  @Column({ name: 'bonus_early_task', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bonusEarlyTask?: number;

  @Column({ name: 'bonus_zero_overdue', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bonusZeroOverdue?: number;

  @Column({ name: 'bonus_max_cap', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bonusMaxCap?: number;

  @Column({ name: 'bonus_ot_per_effective_hour', type: 'decimal',
    precision: 5, scale: 2, nullable: true })
  bonusOtPerEffectiveHour?: number;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

### 2.2 `OrgSettings` entity

```typescript
// src/modules/organization/settings/entities/org-settings.entity.ts
@Entity({ schema: 'tenant', name: 'org_settings' })
export class OrgSettings {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  // KPI Weights
  @Column({ name: 'default_weight_point_completion', type: 'decimal',
    precision: 4, scale: 3, default: 0.5 })
  defaultWeightPointCompletion: number;

  @Column({ name: 'default_weight_on_time', type: 'decimal',
    precision: 4, scale: 3, default: 0.3 })
  defaultWeightOnTime: number;

  @Column({ name: 'default_weight_ot_contribution', type: 'decimal',
    precision: 4, scale: 3, default: 0.2 })
  defaultWeightOtContribution: number;

  // OT Multipliers
  @Column({ name: 'ot_multiplier_weekday',  type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  otMultiplierWeekday: number;
  @Column({ name: 'ot_multiplier_saturday', type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  otMultiplierSaturday: number;
  @Column({ name: 'ot_multiplier_sunday',   type: 'decimal', precision: 4, scale: 2, default: 2.0 })
  otMultiplierSunday: number;
  @Column({ name: 'ot_multiplier_holiday',  type: 'decimal', precision: 4, scale: 2, default: 3.0 })
  otMultiplierHoliday: number;

  // Bonus
  @Column({ name: 'bonus_enabled',                type: 'boolean', default: false })
  bonusEnabled: boolean;
  @Column({ name: 'bonus_on_time_task',           type: 'decimal', precision: 5, scale: 2, default: 0.5 })
  bonusOnTimeTask: number;
  @Column({ name: 'bonus_early_task_hours',       type: 'int', default: 24 })
  bonusEarlyTaskHours: number;
  @Column({ name: 'bonus_early_task',             type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  bonusEarlyTask: number;
  @Column({ name: 'bonus_zero_overdue',           type: 'decimal', precision: 5, scale: 2, default: 2.0 })
  bonusZeroOverdue: number;
  @Column({ name: 'bonus_max_cap',                type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  bonusMaxCap: number;
  @Column({ name: 'bonus_ot_per_effective_hour',  type: 'decimal', precision: 5, scale: 2, default: 0.2 })
  bonusOtPerEffectiveHour: number;

  // Notification
  @Column({ name: 'default_reminder_channels', type: 'text', array: true,
    default: ['push_notification','in_app'] })
  defaultReminderChannels: string[];

  // Digest
  @Column({ name: 'digest_enabled',    type: 'boolean', default: false })
  digestEnabled: boolean;
  @Column({ name: 'digest_day',        type: 'int', default: 1 })
  digestDay: number;
  @Column({ name: 'digest_time',       type: 'time', default: '08:00' })
  digestTime: string;
  @Column({ name: 'digest_recipients', type: 'text', array: true, default: ['org_admin'] })
  digestRecipients: string[];
  @Column({ name: 'digest_channels',   type: 'text', array: true, default: ['email','in_app'] })
  digestChannels: string[];

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

---

## 3. Module Structure

```
src/modules/
│
├── project/
│   └── settings/                        ← NEW MODULE
│       ├── project-settings.module.ts
│       ├── project-settings.controller.ts
│       ├── project-settings.service.ts
│       ├── entities/
│       │   └── project-config.entity.ts
│       └── dto/
│           ├── request/
│           │   └── upsert-project-settings.request.ts
│           └── response/
│               └── project-settings.response.ts
│
└── organization/
    └── settings/                        ← NEW MODULE
        ├── org-settings.module.ts
        ├── org-settings.controller.ts
        ├── org-settings.service.ts
        ├── entities/
        │   └── org-settings.entity.ts
        └── dto/
            ├── request/
            │   └── upsert-org-settings.request.ts
            └── response/
                └── org-settings.response.ts
```

---

## 4. Resolved KPI Weights (core helper)

`KpiSettingsResolver` — shared service used by both `ProjectKpiService` and `OrgKpiService`:

```typescript
// src/modules/analytics/kpi-settings-resolver.service.ts

export interface ResolvedKpiWeights {
  weightPointCompletion: number;
  weightOnTime: number;
  weightOtContribution: number;
}

export interface ResolvedBonusRules {
  bonusEnabled: boolean;
  bonusOnTimeTask: number;
  bonusEarlyTaskHours: number;
  bonusEarlyTask: number;
  bonusZeroOverdue: number;
  bonusMaxCap: number;
  bonusOtPerEffectiveHour: number;
}

const SYSTEM_DEFAULTS: ResolvedKpiWeights = {
  weightPointCompletion: 0.5,
  weightOnTime: 0.3,
  weightOtContribution: 0.2,
};

@Injectable()
export class KpiSettingsResolver {
  constructor(
    @InjectRepository(ProjectConfig) private readonly projectConfigRepo,
    @InjectRepository(OrgSettings) private readonly orgSettingsRepo,
  ) {}

  async resolveWeights(
    projectId: string | null,
    orgId: string,
  ): Promise<ResolvedKpiWeights> {
    // 1. Try project config
    if (projectId) {
      const pc = await this.projectConfigRepo.findOne({
        where: { projectId, organizationId: orgId },
      });
      if (pc?.kpiWeightPointCompletion != null) {
        return this.normalizeWeights({
          weightPointCompletion: +pc.kpiWeightPointCompletion,
          weightOnTime:          +pc.kpiWeightOnTime,
          weightOtContribution:  +pc.kpiWeightOtContribution,
        });
      }
    }

    // 2. Try org settings
    const org = await this.getOrCreateOrgSettings(orgId);
    return this.normalizeWeights({
      weightPointCompletion: +org.defaultWeightPointCompletion,
      weightOnTime:          +org.defaultWeightOnTime,
      weightOtContribution:  +org.defaultWeightOtContribution,
    });
  }

  async resolveBonusRules(
    projectId: string | null,
    orgId: string,
  ): Promise<ResolvedBonusRules> {
    const org = await this.getOrCreateOrgSettings(orgId);

    let pc: ProjectConfig | null = null;
    if (projectId) {
      pc = await this.projectConfigRepo.findOne({
        where: { projectId, organizationId: orgId },
      });
    }

    return {
      bonusEnabled:            pc?.bonusEnabled           ?? org.bonusEnabled,
      bonusOnTimeTask:        +(pc?.bonusOnTimeTask       ?? org.bonusOnTimeTask),
      bonusEarlyTaskHours:     pc?.bonusEarlyTaskHours    ?? org.bonusEarlyTaskHours,
      bonusEarlyTask:         +(pc?.bonusEarlyTask        ?? org.bonusEarlyTask),
      bonusZeroOverdue:       +(pc?.bonusZeroOverdue      ?? org.bonusZeroOverdue),
      bonusMaxCap:            +(pc?.bonusMaxCap            ?? org.bonusMaxCap),
      bonusOtPerEffectiveHour:+(pc?.bonusOtPerEffectiveHour ?? org.bonusOtPerEffectiveHour),
    };
  }

  async resolveOtMultipliers(orgId: string) {
    const org = await this.getOrCreateOrgSettings(orgId);
    return {
      weekday:  +org.otMultiplierWeekday,
      saturday: +org.otMultiplierSaturday,
      sunday:   +org.otMultiplierSunday,
      holiday:  +org.otMultiplierHoliday,
    };
  }

  private normalizeWeights(w: ResolvedKpiWeights): ResolvedKpiWeights {
    // Re-normalize if weightOtContribution = 0
    if (w.weightOtContribution === 0) {
      const sum = w.weightPointCompletion + w.weightOnTime;
      if (sum === 0) return SYSTEM_DEFAULTS;
      return {
        weightPointCompletion: w.weightPointCompletion / sum,
        weightOnTime:          w.weightOnTime / sum,
        weightOtContribution:  0,
      };
    }
    return w;
  }

  async getOrCreateOrgSettings(orgId: string): Promise<OrgSettings> {
    let s = await this.orgSettingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = this.orgSettingsRepo.create({ organizationId: orgId });
      await this.orgSettingsRepo.save(s);
    }
    return s;
  }
}
```

---

## 5. Performance Score Formula (with dynamic weights + bonus)

```typescript
// src/modules/analytics/kpi-formula.helper.ts

export function calcBasePerformanceScore(
  pointCompletionRate: number,
  onTimeRate: number,
  otContributionScore: number,
  weights: ResolvedKpiWeights,
): number {
  return Math.min(100,
    pointCompletionRate * weights.weightPointCompletion +
    onTimeRate          * weights.weightOnTime          +
    otContributionScore * weights.weightOtContribution,
  );
}

export function calcBonusPoints(
  stats: {
    onTimeTasks: number;
    earlyTasks: number;       // completedAt <= dueDate - earlyTaskHours
    hasZeroOverdue: boolean;
    effectiveOtHours: number;
  },
  rules: ResolvedBonusRules,
): number {
  if (!rules.bonusEnabled) return 0;

  const raw =
    stats.onTimeTasks        * rules.bonusOnTimeTask +
    stats.earlyTasks         * rules.bonusEarlyTask  +
    (stats.hasZeroOverdue ? rules.bonusZeroOverdue : 0) +
    stats.effectiveOtHours   * rules.bonusOtPerEffectiveHour;

  return Math.min(rules.bonusMaxCap, raw);
}

export function calcFinalScore(
  baseScore: number,
  bonusPoints: number,
): number {
  return Math.min(100, Math.round((baseScore + bonusPoints) * 10) / 10);
}
```

---

## 6. DTOs

### 6.1 `upsert-project-settings.request.ts`

```typescript
export class MeetingSettingsDto {
  @IsOptional() @IsBoolean()
  dailyEnabled?: boolean;

  @IsOptional() @Matches(/^\d{2}:\d{2}$/)
  dailyTime?: string;

  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  dailyDays?: number[];

  @IsOptional() @IsInt() @Min(0)
  dailyReminderMinutes?: number;

  @IsOptional() @IsBoolean()
  weeklyEnabled?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(7)
  weeklyDay?: number;

  @IsOptional() @Matches(/^\d{2}:\d{2}$/)
  weeklyTime?: string;

  @IsOptional() @IsInt() @Min(0)
  weeklyReminderMinutes?: number;
}

export class ReminderSettingsDto {
  @IsOptional() @IsBoolean()
  taskDueReminderEnabled?: boolean;

  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true })
  taskDueReminderHours?: number[];

  @IsOptional() @IsArray() @IsEnum(ReminderChannel, { each: true })
  reminderChannels?: ReminderChannel[];

  @IsOptional() @IsBoolean()
  overdueEscalationEnabled?: boolean;

  @IsOptional() @IsInt() @Min(1)
  overdueEscalationAfterHours?: number;
}

export class PointScaleSettingsDto {
  @IsOptional() @IsEnum(['fibonacci', 'linear', 'custom'])
  pointScaleType?: string;

  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true })
  pointScaleValues?: number[];

  @IsOptional() @IsInt() @Min(1)
  maxPointPerTask?: number;
}

export class KpiWeightsDto {
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  weightPointCompletion?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  weightOnTime?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  weightOtContribution?: number;

  // Custom validator: sum must = 1.0 (±0.001)
}

export class BonusRulesDto {
  @IsOptional() @IsBoolean()
  bonusEnabled?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  bonusOnTimeTask?: number;

  @IsOptional() @IsInt() @Min(0)
  bonusEarlyTaskHours?: number;

  @IsOptional() @IsNumber() @Min(0)
  bonusEarlyTask?: number;

  @IsOptional() @IsNumber() @Min(0)
  bonusZeroOverdue?: number;

  @IsOptional() @IsNumber() @Min(0)
  bonusMaxCap?: number;

  @IsOptional() @IsNumber() @Min(0)
  bonusOtPerEffectiveHour?: number;
}

export class UpsertProjectSettingsRequest {
  @IsOptional() @ValidateNested() @Type(() => MeetingSettingsDto)
  meeting?: MeetingSettingsDto;

  @IsOptional() @ValidateNested() @Type(() => ReminderSettingsDto)
  reminder?: ReminderSettingsDto;

  @IsOptional() @ValidateNested() @Type(() => PointScaleSettingsDto)
  pointScale?: PointScaleSettingsDto;

  @IsOptional() @ValidateNested() @Type(() => KpiWeightsDto)
  kpiWeights?: KpiWeightsDto;

  @IsOptional() @ValidateNested() @Type(() => BonusRulesDto)
  bonusRules?: BonusRulesDto;
}
```

### 6.2 `project-settings.response.ts`

```typescript
export class ProjectSettingsResponse {
  projectId: string;
  // Shows RESOLVED values (project override OR org default OR system default)
  // Also shows raw project-level override (null = using org/system default)

  meeting: {
    dailyEnabled: boolean;
    dailyTime?: string;
    dailyDays: number[];
    dailyReminderMinutes: number;
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime?: string;
    weeklyReminderMinutes: number;
  };

  reminder: {
    taskDueReminderEnabled: boolean;
    taskDueReminderHours: number[];
    reminderChannels: string[];
    overdueEscalationEnabled: boolean;
    overdueEscalationAfterHours: number;
  };

  pointScale: {
    pointScaleType?: string;
    pointScaleValues?: number[];
    maxPointPerTask?: number;
  };

  kpiWeights: {
    weightPointCompletion: number;
    weightOnTime: number;
    weightOtContribution: number;
    source: 'project' | 'org' | 'system';  // lets FE know where the value came from
  };

  bonusRules: {
    bonusEnabled: boolean;
    bonusOnTimeTask: number;
    bonusEarlyTaskHours: number;
    bonusEarlyTask: number;
    bonusZeroOverdue: number;
    bonusMaxCap: number;
    bonusOtPerEffectiveHour: number;
    source: 'project' | 'org' | 'system';
  };

  updatedAt?: Date;
}
```

---

## 7. Service Methods

### 7.1 ProjectSettingsService

```typescript
// GET /v1/projects/:id/settings
async getProjectSettings(projectId, orgId): Promise<ProjectSettingsResponse>
// → load ProjectConfig, merge with org defaults, return resolved + source flag

// PUT /v1/projects/:id/settings
async upsertProjectSettings(projectId, orgId, dto): Promise<ProjectSettingsResponse>
// → upsert ProjectConfig (MERGE per field, don't erase other fields)
// → validate KPI weights sum = 1.0 if provided
// → validate pointScaleValues not empty when type = 'custom'

// DELETE /v1/projects/:id/settings
async resetProjectSettings(projectId, orgId): Promise<void>
// → delete ProjectConfig row → KPI will fallback to org default
```

### 7.2 OrgSettingsService

```typescript
// GET /v1/org-config/settings
async getOrgSettings(orgId): Promise<OrgSettingsResponse>

// PUT /v1/org-config/settings
async upsertOrgSettings(orgId, dto): Promise<OrgSettingsResponse>
// → validate: defaultWeight sum = 1.0
// → validate: otMultipliers > 0
```

---

## 8. Validation: KPI Weights Sum

**DTO-level validator** — only validates when all 3 fields are provided:

```typescript
// src/common/validators/weights-sum.validator.ts
export function WeightsSum(target: object, key: string) {
  registerDecorator({
    name: 'weightsSum',
    target: target.constructor,
    propertyName: key,
    validator: {
      validate(_: unknown, args: ValidationArguments) {
        const obj = args.object as KpiWeightsDto;
        // All null = inherit → OK
        if (
          obj.weightPointCompletion == null &&
          obj.weightOnTime == null &&
          obj.weightOtContribution == null
        ) return true;
        // All provided → validate sum
        if (
          obj.weightPointCompletion != null &&
          obj.weightOnTime != null &&
          obj.weightOtContribution != null
        ) {
          const sum = obj.weightPointCompletion + obj.weightOnTime + obj.weightOtContribution;
          return Math.abs(sum - 1.0) < 0.001;
        }
        // Partial update → DTO validator SKIPS; service layer validates after merge
        return true;
      },
      defaultMessage: () => 'KPI weights must sum to 1.0',
    },
  });
}
```

**Service-level validation** (in `upsertProjectSettings`): when DTO sends only 1–2 weights,
service merges with the existing record then validates sum = 1.0:

```typescript
// Inside ProjectSettingsService.upsertProjectSettings():
if (dto.kpiWeights) {
  const existing = await this.projectConfigRepo.findOne({
    where: { projectId, organizationId: orgId },
  });
  const merged = {
    weightPointCompletion: dto.kpiWeights.weightPointCompletion
      ?? existing?.kpiWeightPointCompletion ?? null,
    weightOnTime: dto.kpiWeights.weightOnTime
      ?? existing?.kpiWeightOnTime ?? null,
    weightOtContribution: dto.kpiWeights.weightOtContribution
      ?? existing?.kpiWeightOtContribution ?? null,
  };
  const nonNull = [merged.weightPointCompletion, merged.weightOnTime, merged.weightOtContribution]
    .filter(v => v != null);
  if (nonNull.length > 0 && nonNull.length < 3) {
    throw new BadRequestException(
      'All 3 KPI weights must be set (or all null to inherit org default)',
    );
  }
  if (nonNull.length === 3) {
    const sum = +merged.weightPointCompletion + +merged.weightOnTime
              + +merged.weightOtContribution;
    if (Math.abs(sum - 1.0) >= 0.001) {
      throw new BadRequestException('KPI weights must sum to 1.0');
    }
  }
}
```

---

## 9. Controller

### 9.1 ProjectSettingsController

```typescript
@ApiTags('Project Settings')
@Controller({ path: 'projects/:projectId/settings', version: '1' })
export class ProjectSettingsController {

  @Get()
  // Access: active member of project (read); service checks
  getSettings(@Param('projectId', ParseUUIDPipe) pid, @GetOrgId() orgId)

  @Put()
  // Access: PM role or Org Admin; service checks project role
  upsertSettings(@Param('projectId', ParseUUIDPipe) pid, @GetOrgId() orgId,
                 @GetUser('sub') userId, @Body() dto)

  @Delete()
  // Access: PM role or Org Admin
  resetSettings(@Param('projectId', ParseUUIDPipe) pid, @GetOrgId() orgId,
                @GetUser('sub') userId)
}
```

### 9.2 OrgSettingsController

```typescript
@ApiTags('Org Config — Settings')
@Controller({ path: 'org-config/settings', version: '1' })
export class OrgSettingsController {

  @Get()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.SETTINGS.VIEW)
  getSettings(@GetOrgId() orgId)

  @Put()
  @RequirePermission(PERMISSIONS.ORG_CONFIG.SETTINGS.MANAGE)
  upsertSettings(@GetOrgId() orgId, @Body() dto)
}
```

---

## 10. New Permissions (add to `permission.constant.ts`)

```typescript
ORG_CONFIG: {
  WORKING_TIME: { VIEW: '...', MANAGE: '...' },  // already exists from KPI docs
  SETTINGS: {
    VIEW:   'org_config.settings.view',
    MANAGE: 'org_config.settings.manage',
  },
},
```

```typescript
// USER_PERMISSIONS — add:
'org_config.settings.view',

// ORG_ADMIN_MODULES already includes 'org_config' → manage is auto-granted
```

---

## 11. Module Wiring

```typescript
// project-settings.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([ProjectConfig])],
  controllers: [ProjectSettingsController],
  providers: [ProjectSettingsService],
  exports: [ProjectSettingsService],
})
export class ProjectSettingsModule {}

// org-settings.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([OrgSettings])],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService],
  exports: [OrgSettingsService],
})
export class OrgSettingsModule {}

// kpi-settings-resolver.module.ts (shared helper)
@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectConfig, OrgSettings]),
  ],
  providers: [KpiSettingsResolver],
  exports: [KpiSettingsResolver],
})
export class KpiSettingsResolverModule {}

// analytics.module.ts — updated:
@Module({
  imports: [
    ProjectKpiModule,
    OrgKpiModule,
    KpiSettingsResolverModule,
  ],
})
export class AnalyticsModule {}
```

---

## 12. Migration Plan

| Migration | Contents |
|---|---|
| `CreateProjectConfigs` | Create table `project.project_configs` |
| `CreateOrgSettings` | Create table `tenant.org_settings` |

```bash
npm run migration:generate:tables -- src/database/migrations/tables/CreateProjectConfigs
npm run migration:generate:tables -- src/database/migrations/tables/CreateOrgSettings
npm run migration:run
```

After deploy: `POST /v1/rbac/permissions/sync`

---

## 13. Error Handling

| Scenario | Exception | HTTP |
|---|---|---|
| KPI weights sum != 1.0 | `BadRequestException('KPI weights must sum to 1.0')` | 400 |
| pointScaleType = custom but pointScaleValues empty | `BadRequestException` | 400 |
| OT multiplier <= 0 | `BadRequestException` | 400 |
| No permission to edit settings | `ForbiddenException` | 403 |
