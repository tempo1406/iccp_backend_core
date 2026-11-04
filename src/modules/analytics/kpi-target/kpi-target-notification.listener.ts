import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { MaillerService } from '@modules/mail/mail.service';
import { User } from '@modules/users/entities/user.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { KpiTarget } from './entities/kpi-target.entity';
import {
  KPI_TARGET_EVENTS,
  KpiTargetAssignedEvent,
} from './constants/kpi-target-events.constant';
import { KpiTargetScopeType } from './enums/kpi-target.enum';

type KpiTargetMetricRow = { label: string; value: string };

@Injectable()
export class KpiTargetNotificationListener {
  constructor(
    private readonly notificationCoreService: NotificationCoreService,
    private readonly mailService: MaillerService,
    @InjectRepository(KpiTarget)
    private readonly kpiTargetRepo: Repository<KpiTarget>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  @OnEvent(KPI_TARGET_EVENTS.ASSIGNED, { async: true })
  async handleAssigned(event: KpiTargetAssignedEvent): Promise<void> {
    const target = await this.kpiTargetRepo.findOne({
      where: { id: event.targetId, organizationId: event.organizationId },
    });
    if (!target) return;

    const [sender, role, recipients] = await Promise.all([
      event.actorUserId
        ? this.userRepo.findOne({
            where: { id: event.actorUserId, deletedAt: IsNull() },
          })
        : Promise.resolve(null),
      target.roleId
        ? this.roleRepo.findOne({ where: { id: target.roleId } })
        : Promise.resolve(null),
      this.resolveRecipients(target),
    ]);

    if (!recipients.length) return;

    const senderName =
      [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim() ||
      sender?.email ||
      'System';
    const periodLabel = `${this.toDateStr(target.periodStart)} - ${this.toDateStr(target.periodEnd)}`;
    const scopeLabel = this.buildScopeLabel(target, role?.name);
    const actionLabel = this.describeChange(event.changeType);
    const title = `KPI target ${actionLabel} for ${periodLabel}`;
    const message = `${senderName} ${actionLabel} the KPI target for ${scopeLabel}.`;
    const metricRows = this.buildMetricRows(target);
    const statusLabel = this.toTitleCase(target.status);

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        await this.notificationCoreService.send({
          userId: recipient.id,
          senderId: sender?.id ?? undefined,
          senderName,
          senderAvatarUrl: sender?.avatarUrl ?? undefined,
          type: 'kpi_target_assigned',
          title,
          message,
          data: {
            module: 'analytics',
            action: event.changeType,
            targetId: target.id,
            scopeType: target.scopeType,
            projectId: target.projectId ?? null,
            roleId: target.roleId ?? null,
            userId: target.userId ?? null,
            period: target.period,
            periodStart: this.toDateStr(target.periodStart),
            periodEnd: this.toDateStr(target.periodEnd),
          },
        });

        if (recipient.email) {
          const recipientName =
            [recipient.firstName, recipient.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() || recipient.email;
          await this.mailService.sendKpiTargetAssignedEmail({
            email: recipient.email,
            recipientName,
            title,
            message,
            senderName,
            periodLabel,
            scopeLabel,
            statusLabel,
            metricRows,
            note: target.note ?? null,
          });
        }
      }),
    );
  }

  private async resolveRecipients(target: KpiTarget): Promise<User[]> {
    let userIds: string[] = [];

    if (target.scopeType === KpiTargetScopeType.USER && target.userId) {
      userIds = [target.userId];
    } else if (target.scopeType === KpiTargetScopeType.ROLE && target.roleId) {
      const rows = await this.userRoleRepo.find({
        where: {
          organizationId: target.organizationId,
          roleId: target.roleId,
          scopeType: ScopeType.ORGANIZATION,
        },
      });
      userIds = rows.map((item) => item.userId);
    } else if (
      target.scopeType === KpiTargetScopeType.PROJECT_ROLE &&
      target.roleId &&
      target.projectId
    ) {
      const rows = await this.userRoleRepo.find({
        where: {
          organizationId: target.organizationId,
          roleId: target.roleId,
          scopeType: ScopeType.PROJECT,
          scopeId: target.projectId,
        },
      });
      userIds = rows.map((item) => item.userId);
    }

    const uniqueIds = [...new Set(userIds)];
    if (!uniqueIds.length) return [];
    return this.userRepo.find({
      where: { id: In(uniqueIds), deletedAt: IsNull() },
    });
  }

  private buildScopeLabel(target: KpiTarget, roleName?: string | null): string {
    if (target.scopeType === KpiTargetScopeType.USER) {
      return 'Individual';
    }
    if (target.scopeType === KpiTargetScopeType.ROLE) {
      return `Organization role: ${roleName ?? target.roleId}`;
    }
    return `Project role: ${roleName ?? target.roleId}`;
  }

  private buildMetricRows(target: KpiTarget): KpiTargetMetricRow[] {
    const rows: KpiTargetMetricRow[] = [];

    if (target.targetScore != null) {
      rows.push({
        label: 'Target score',
        value: this.formatNumber(target.targetScore),
      });
    }
    if (target.targetPointCompletionRate != null) {
      rows.push({
        label: 'Point completion rate',
        value: `${this.formatNumber(target.targetPointCompletionRate)}%`,
      });
    }
    if (target.targetOnTimeRate != null) {
      rows.push({
        label: 'On-time rate',
        value: `${this.formatNumber(target.targetOnTimeRate)}%`,
      });
    }
    if (target.targetOtHours != null) {
      rows.push({
        label: 'OT hours',
        value: this.formatNumber(target.targetOtHours),
      });
    }
    if (target.targetCompletedTasks != null) {
      rows.push({
        label: 'Completed tasks',
        value: String(target.targetCompletedTasks),
      });
    }
    if (target.maxOverdueTasks != null) {
      rows.push({
        label: 'Max overdue tasks',
        value: String(target.maxOverdueTasks),
      });
    }
    if (target.requireZeroOverdue) {
      rows.push({ label: 'Zero overdue required', value: 'Yes' });
    }

    return rows;
  }

  private describeChange(changeType: KpiTargetAssignedEvent['changeType']) {
    switch (changeType) {
      case 'created':
        return 'assigned';
      case 'updated':
        return 'updated';
      case 'cloned':
        return 'cloned';
      default:
        return 'processed';
    }
  }

  private toDateStr(d: Date | string): string {
    if (typeof d === 'string') return d;
    return d.toISOString().slice(0, 10);
  }

  private formatNumber(value: number | string): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return Number.isInteger(numeric)
      ? String(numeric)
      : numeric.toFixed(2).replace(/\.?0+$/, '');
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}
