import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProjectConfig } from './entities/project-config.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';
import { UpsertProjectSettingsRequest } from './dto/request/upsert-project-settings.request';
import { ProjectSettingsResponse } from './dto/response/project-settings.response';
import { KpiSettingsResolver } from '@modules/analytics/kpi-settings-resolver.service';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { ProjectCoreService } from '@modules/project/core/project-core.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

@Injectable()
export class ProjectSettingsService {
  constructor(
    @InjectRepository(ProjectConfig)
    private readonly projectConfigRepo: Repository<ProjectConfig>,

    @InjectRepository(OrgSettings)
    private readonly orgSettingsRepo: Repository<OrgSettings>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    private readonly kpiSettingsResolver: KpiSettingsResolver,
    private readonly projectCoreService: ProjectCoreService,
  ) {}

  async getSettings(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectSettingsResponse> {
    await this.ensureMember(projectId, orgId, userId);

    const [pc, weights, rules] = await Promise.all([
      this.projectConfigRepo.findOne({
        where: { projectId, organizationId: orgId },
      }),
      this.kpiSettingsResolver.resolveWeights(projectId, orgId),
      this.kpiSettingsResolver.resolveBonusRules(projectId, orgId),
    ]);

    const org = await this.kpiSettingsResolver.getOrCreateOrgSettings(orgId);

    const base =
      pc ?? this.projectConfigRepo.create({ projectId, organizationId: orgId });

    return {
      projectId,
      organizationId: orgId,
      dailyEnabled: base.dailyEnabled ?? false,
      dailyTime: base.dailyTime,
      dailyDays: base.dailyDays ?? [1, 2, 3, 4, 5],
      taskDueReminderEnabled: base.taskDueReminderEnabled ?? true,
      taskDueReminderHours: base.taskDueReminderHours ?? [24, 2],
      reminderChannels: base.reminderChannels ?? org.defaultReminderChannels,
      overdueEscalationEnabled: base.overdueEscalationEnabled ?? false,
      overdueEscalationAfterHours: base.overdueEscalationAfterHours ?? 4,
      pointScaleType: base.pointScaleType,
      pointScaleValues: base.pointScaleValues,
      maxPointPerTask: base.maxPointPerTask,
      kpiWeightPointCompletion: weights.weightPointCompletion,
      kpiWeightOnTime: weights.weightOnTime,
      kpiWeightOtContribution: weights.weightOtContribution,
      bonusEnabled: rules.bonusEnabled,
      bonusOnTimeTask: rules.bonusOnTimeTask,
      bonusEarlyTaskHours: rules.bonusEarlyTaskHours,
      bonusEarlyTask: rules.bonusEarlyTask,
      bonusZeroOverdue: rules.bonusZeroOverdue,
      bonusMaxCap: rules.bonusMaxCap,
      bonusOtPerEffectiveHour: rules.bonusOtPerEffectiveHour,
      orgTimezone: DEFAULT_TIMEZONE,
      updatedAt: base.updatedAt ?? new Date(),
    };
  }

  async upsertSettings(
    projectId: string,
    orgId: string,
    userId: string,
    dto: UpsertProjectSettingsRequest,
  ): Promise<ProjectSettingsResponse> {
    await this.ensureManager(projectId, orgId, userId);
    this.validateWeights(dto);

    let pc = await this.projectConfigRepo.findOne({
      where: { projectId, organizationId: orgId },
    });
    if (!pc) {
      pc = this.projectConfigRepo.create({ projectId, organizationId: orgId });
    }

    Object.assign(pc, dto);
    await this.projectConfigRepo.save(pc);

    return this.getSettings(projectId, orgId, userId);
  }

  async resetSettings(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureManager(projectId, orgId, userId);
    await this.projectConfigRepo.delete({ projectId, organizationId: orgId });
  }

  private validateWeights(dto: UpsertProjectSettingsRequest) {
    const {
      kpiWeightPointCompletion: w1,
      kpiWeightOnTime: w2,
      kpiWeightOtContribution: w3,
    } = dto;
    const allNull = w1 == null && w2 == null && w3 == null;
    if (allNull) return;

    const allProvided = w1 != null && w2 != null && w3 != null;
    if (!allProvided) {
      throw new ValidationException(ErrorCode.OS001);
    }

    const sum = +w1 + +w2 + +w3;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new ValidationException(
        ErrorCode.OS002,
        `KPI weights must sum to 1.0, got ${sum.toFixed(3)}`,
      );
    }
  }

  private async ensureMember(projectId: string, orgId: string, userId: string) {
    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    if (member) return;

    await this.ensureProjectExists(projectId, orgId);

    const [canViewProject, canUpdateProject] = await Promise.all([
      this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.PROJECTS.VIEW,
      ),
      this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.PROJECTS.UPDATE,
      ),
    ]);
    if (canViewProject || canUpdateProject) return;

    throw new NotFoundException('Project not found');
  }

  private async ensureManager(
    projectId: string,
    orgId: string,
    userId: string,
  ) {
    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    if (!member) {
      await this.ensureProjectExists(projectId, orgId);
    }

    const isManager = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.PROJECTS.UPDATE,
    );
    if (!isManager) {
      throw new ForbiddenException(
        'Only project managers or org admins can edit project settings',
      );
    }
  }

  private async ensureProjectExists(
    projectId: string,
    orgId: string,
  ): Promise<void> {
    const exists = await this.projectRepo.exists({
      where: {
        id: projectId,
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }
}
