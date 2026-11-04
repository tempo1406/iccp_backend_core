import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProjectConfig } from '@modules/project/settings/entities/project-config.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { ScopeType, UserRole } from '@modules/rbac/entities/user-role.entity';
import {
  ResolvedBonusRules,
  ResolvedKpiWeights,
} from './kpi-formula.helper';
import { KpiTarget } from './kpi-target/entities/kpi-target.entity';
import {
  KpiTargetScopeType,
  KpiTargetStatus,
} from './kpi-target/enums/kpi-target.enum';

const SYSTEM_DEFAULTS: ResolvedKpiWeights = {
  weightPointCompletion: 0.5,
  weightOnTime: 0.3,
  weightOtContribution: 0.2,
};

@Injectable()
export class KpiSettingsResolver {
  constructor(
    @InjectRepository(ProjectConfig)
    private readonly projectConfigRepo: Repository<ProjectConfig>,

    @InjectRepository(OrgSettings)
    private readonly orgSettingsRepo: Repository<OrgSettings>,

    @InjectRepository(KpiTarget)
    private readonly kpiTargetRepo: Repository<KpiTarget>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async resolveUserTarget(
    userId: string,
    projectId: string | null,
    orgId: string,
    refDate?: Date,
  ): Promise<KpiTarget | null> {
    const rows = await this.kpiTargetRepo.find({
      where: {
        organizationId: orgId,
        status: KpiTargetStatus.ACTIVE,
      },
      order: { updatedAt: 'DESC' },
    });

    const roleAssignments = await this.userRoleRepo.find({
      where: { userId, organizationId: orgId },
    });
    const orgRoleIds = new Set(
      roleAssignments
        .filter((item) => item.scopeType === ScopeType.ORGANIZATION)
        .map((item) => item.roleId),
    );
    const projectRoleIds = new Map<string, Set<string>>();
    for (const assignment of roleAssignments) {
      if (assignment.scopeType !== ScopeType.PROJECT || !assignment.scopeId) {
        continue;
      }

      const set = projectRoleIds.get(assignment.scopeId) ?? new Set<string>();
      set.add(assignment.roleId);
      projectRoleIds.set(assignment.scopeId, set);
    }

    const matches = rows.filter((row) => {
      if (refDate && !this.isInPeriod(row, refDate)) return false;
      if (projectId) {
        if (row.projectId && row.projectId !== projectId) return false;
      } else if (row.projectId) {
        return false;
      }

      switch (row.scopeType) {
        case KpiTargetScopeType.USER:
          return row.userId === userId;
        case KpiTargetScopeType.ROLE:
          return !!row.roleId && orgRoleIds.has(row.roleId);
        case KpiTargetScopeType.PROJECT_ROLE:
          return !!row.roleId &&
            !!row.projectId &&
            (projectRoleIds.get(row.projectId)?.has(row.roleId) ?? false);
        default:
          return false;
      }
    });

    if (!matches.length) return null;
    return matches.sort((a, b) => this.comparePrecedence(a, b))[0];
  }

  async resolveWeights(
    projectId: string | null,
    orgId: string,
  ): Promise<ResolvedKpiWeights> {
    if (projectId) {
      const pc = await this.projectConfigRepo.findOne({
        where: { projectId, organizationId: orgId },
      });
      if (pc?.kpiWeightPointCompletion != null) {
        return this.normalizeWeights({
          weightPointCompletion: +pc.kpiWeightPointCompletion,
          weightOnTime: +(pc.kpiWeightOnTime ?? 0),
          weightOtContribution: +(pc.kpiWeightOtContribution ?? 0),
        });
      }
    }

    const org = await this.getOrCreateOrgSettings(orgId);
    return this.normalizeWeights({
      weightPointCompletion: +org.defaultWeightPointCompletion,
      weightOnTime: +org.defaultWeightOnTime,
      weightOtContribution: +org.defaultWeightOtContribution,
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
      bonusEnabled: pc?.bonusEnabled ?? org.bonusEnabled,
      bonusOnTimeTask: +(pc?.bonusOnTimeTask ?? org.bonusOnTimeTask),
      bonusEarlyTaskHours: pc?.bonusEarlyTaskHours ?? org.bonusEarlyTaskHours,
      bonusEarlyTask: +(pc?.bonusEarlyTask ?? org.bonusEarlyTask),
      bonusZeroOverdue: +(pc?.bonusZeroOverdue ?? org.bonusZeroOverdue),
      bonusMaxCap: +(pc?.bonusMaxCap ?? org.bonusMaxCap),
      bonusOtPerEffectiveHour: +(
        pc?.bonusOtPerEffectiveHour ?? org.bonusOtPerEffectiveHour
      ),
    };
  }

  async resolveOtMultipliers(orgId: string) {
    const org = await this.getOrCreateOrgSettings(orgId);
    return {
      weekday: +org.otMultiplierWeekday,
      saturday: +org.otMultiplierSaturday,
      sunday: +org.otMultiplierSunday,
      holiday: +org.otMultiplierHoliday,
    };
  }

  async getOrCreateOrgSettings(orgId: string): Promise<OrgSettings> {
    let s = await this.orgSettingsRepo.findOne({
      where: { organizationId: orgId },
    });
    if (!s) {
      s = this.orgSettingsRepo.create({ organizationId: orgId });
      await this.orgSettingsRepo.save(s);
    }
    return s;
  }

  private comparePrecedence(a: KpiTarget, b: KpiTarget): number {
    const scoreA = this.getPrecedenceScore(a);
    const scoreB = this.getPrecedenceScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }

  private getPrecedenceScore(row: KpiTarget): number {
    if (row.projectId && row.scopeType === KpiTargetScopeType.USER) return 400;
    if (row.projectId && row.scopeType === KpiTargetScopeType.PROJECT_ROLE)
      return 300;
    if (!row.projectId && row.scopeType === KpiTargetScopeType.USER) return 200;
    if (!row.projectId && row.scopeType === KpiTargetScopeType.ROLE) return 100;
    return 0;
  }

  private isInPeriod(row: KpiTarget, refDate: Date) {
    const ref = refDate.toISOString().slice(0, 10);
    const start =
      typeof row.periodStart === 'string'
        ? row.periodStart
        : row.periodStart.toISOString().slice(0, 10);
    const end =
      typeof row.periodEnd === 'string'
        ? row.periodEnd
        : row.periodEnd.toISOString().slice(0, 10);
    return start <= ref && end >= ref;
  }

  private normalizeWeights(w: ResolvedKpiWeights): ResolvedKpiWeights {
    if (w.weightOtContribution === 0) {
      const sum = w.weightPointCompletion + w.weightOnTime;
      if (sum === 0) return SYSTEM_DEFAULTS;
      return {
        weightPointCompletion: w.weightPointCompletion / sum,
        weightOnTime: w.weightOnTime / sum,
        weightOtContribution: 0,
      };
    }
    return w;
  }
}
