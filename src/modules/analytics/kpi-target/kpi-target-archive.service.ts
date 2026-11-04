import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { KpiActualService, KpiActualMetrics } from '@modules/analytics/kpi-actual.service';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiTargetService } from './kpi-target.service';
import { KpiTargetScopeType } from './enums/kpi-target.enum';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

@Injectable()
export class KpiTargetArchiveService {
  private readonly logger = new Logger(KpiTargetArchiveService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly kpiTargetService: KpiTargetService,
    private readonly kpiActualService: KpiActualService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async archiveFinishedTargets(): Promise<void> {
    const [organizations, activeTargets] = await Promise.all([
      this.organizationRepo.find(),
      this.kpiTargetService.findArchivableTargets(),
    ]);

    if (!activeTargets.length) return;

    const orgMap = new Map(organizations.map((org) => [org.id, org]));

    for (const target of activeTargets) {
      const org = orgMap.get(target.organizationId);
      if (!org) continue;
      const timeZone = DEFAULT_TIMEZONE;
      const localToday = this.formatDateInTimeZone(new Date(), timeZone);
      if (this.toDateStr(target.periodEnd) >= localToday) {
        continue;
      }

      const periodEnd = this.toEndOfDayInTimeZone(target.periodEnd, timeZone);
      const affectedUserIds = await this.resolveAffectedUserIds(
        target,
        periodEnd,
      );
      const snapshot = await this.buildSnapshot(
        target,
        affectedUserIds,
        timeZone,
      );
      await this.kpiTargetService.upsertSnapshot(target.id, snapshot);
      await this.kpiTargetService.markArchived(target, null);
      this.logger.log(`Archived KPI target ${target.id}`);
    }
  }

  private async buildSnapshot(
    target: KpiTarget,
    userIds: string[],
    timeZone: string,
  ) {
    const dateFrom = this.toStartOfDayInTimeZone(target.periodStart, timeZone);
    const dateTo = this.toEndOfDayInTimeZone(target.periodEnd, timeZone);

    let metricsMap: Map<string, KpiActualMetrics>;
    if (target.projectId) {
      metricsMap = await this.kpiActualService.computeProjectMembersActual(
        target.projectId,
        target.organizationId,
        userIds,
        { dateFrom, dateTo, now: dateTo },
      );
    } else {
      metricsMap = await this.kpiActualService.computeOrgMembersActual(
        target.organizationId,
        userIds,
        { dateFrom, dateTo, now: dateTo },
      );
    }

    const perUser = userIds
      .map((userId) => {
        const metrics = metricsMap.get(userId);
        if (!metrics) return null;
        return {
          userId,
          performanceScore: metrics.performanceScore,
          onTimeRate: metrics.onTimeRate,
          pointCompletionRate: metrics.pointCompletionRate,
          effectiveOtHours: metrics.effectiveOtHours,
          completedTasks: metrics.completedTasks,
          overdueTasks: metrics.overdueTasks,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);

    const aggregate = this.aggregateSnapshot(perUser);
    return {
      actualScore: aggregate.actualScore,
      actualOnTimeRate: aggregate.actualOnTimeRate,
      actualPointCompletionRate: aggregate.actualPointCompletionRate,
      actualOtHours: aggregate.actualOtHours,
      actualCompletedTasks: aggregate.actualCompletedTasks,
      actualOverdueTasks: aggregate.actualOverdueTasks,
      actualPayload: {
        scopeType: target.scopeType,
        timeZone,
        periodStart: this.toDateStr(target.periodStart),
        periodEnd: this.toDateStr(target.periodEnd),
        recipientUserIds: userIds,
        aggregatedFromUsers: perUser,
      },
    };
  }

  private aggregateSnapshot(
    perUser: Array<{
      performanceScore: number;
      onTimeRate: number;
      pointCompletionRate: number;
      effectiveOtHours: number;
      completedTasks: number;
      overdueTasks: number;
    }>,
  ) {
    if (!perUser.length) {
      return {
        actualScore: 0,
        actualOnTimeRate: 0,
        actualPointCompletionRate: 0,
        actualOtHours: 0,
        actualCompletedTasks: 0,
        actualOverdueTasks: 0,
      };
    }

    const avg = (values: number[]) =>
      Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
      100;

    return {
      actualScore: avg(perUser.map((item) => item.performanceScore)),
      actualOnTimeRate: avg(perUser.map((item) => item.onTimeRate)),
      actualPointCompletionRate: avg(
        perUser.map((item) => item.pointCompletionRate),
      ),
      actualOtHours: avg(perUser.map((item) => item.effectiveOtHours)),
      actualCompletedTasks: Math.round(
        perUser.reduce((sum, item) => sum + item.completedTasks, 0) / perUser.length,
      ),
      actualOverdueTasks: Math.round(
        perUser.reduce((sum, item) => sum + item.overdueTasks, 0) / perUser.length,
      ),
    };
  }

  private async resolveAffectedUserIds(
    target: KpiTarget,
    archivedAt: Date,
  ): Promise<string[]> {
    if (target.scopeType === KpiTargetScopeType.USER) {
      return target.userId ? [target.userId] : [];
    }

    if (!target.roleId) return [];

    const qb = this.userRoleRepo
      .createQueryBuilder('user_role')
      .where('user_role.organization_id = :organizationId', {
        organizationId: target.organizationId,
      })
      .andWhere('user_role.role_id = :roleId', {
        roleId: target.roleId,
      })
      .andWhere('user_role.assigned_at <= :archivedAt', {
        archivedAt,
      });

    if (target.scopeType === KpiTargetScopeType.PROJECT_ROLE) {
      qb.andWhere('user_role.scope_type = :scopeType', {
        scopeType: ScopeType.PROJECT,
      }).andWhere('user_role.scope_id = :scopeId', {
        scopeId: target.projectId,
      });
    } else {
      qb.andWhere('user_role.scope_type = :scopeType', {
        scopeType: ScopeType.ORGANIZATION,
      });
    }

    const rows = await qb.getMany();
    return [...new Set(rows.map((item) => item.userId))];
  }

  private formatDateInTimeZone(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private toDateStr(d: Date | string): string {
    if (typeof d === 'string') return d;
    return d.toISOString().slice(0, 10);
  }

  private toStartOfDayInTimeZone(d: Date | string, timeZone: string): Date {
    return this.zonedDateTimeToUtc(this.toDateStr(d), timeZone, false);
  }

  private toEndOfDayInTimeZone(d: Date | string, timeZone: string): Date {
    return this.zonedDateTimeToUtc(this.toDateStr(d), timeZone, true);
  }

  private zonedDateTimeToUtc(
    dateStr: string,
    timeZone: string,
    endOfDay: boolean,
  ): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const hours = endOfDay ? 23 : 0;
    const minutes = endOfDay ? 59 : 0;
    const seconds = endOfDay ? 59 : 0;
    const milliseconds = endOfDay ? 999 : 0;
    const utcGuess = Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
      milliseconds,
    );

    const firstPass = new Date(
      utcGuess - this.getTimeZoneOffsetMs(new Date(utcGuess), timeZone),
    );
    return new Date(
      utcGuess - this.getTimeZoneOffsetMs(firstPass, timeZone),
    );
  }

  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );

    const wallTimeUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );

    return wallTimeUtc - date.getTime();
  }
}
