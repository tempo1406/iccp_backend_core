import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { MaillerService } from '@modules/mail/mail.service';
import { ProjectCoreService } from '@modules/project/core/project-core.service';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { User } from '@modules/users/entities/user.entity';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { DailyReport, DailyReportStatus } from './entities/daily-report.entity';
import {
  DAILY_REPORT_NOTIFICATION_EVENTS,
  DAILY_REPORT_NOTIFICATION_TYPES,
  DailyReportCommentedNotificationEvent,
  DailyReportSeenNotificationEvent,
  DailyReportSubmittedNotificationEvent,
} from './constants/daily-report-notification-events.constant';

@Injectable()
export class DailyReportNotificationListener {
  private readonly logger = new Logger(DailyReportNotificationListener.name);

  constructor(
    private readonly notificationCoreService: NotificationCoreService,
    private readonly mailService: MaillerService,
    private readonly projectCoreService: ProjectCoreService,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepo: Repository<DailyReport>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @OnEvent(DAILY_REPORT_NOTIFICATION_EVENTS.SUBMITTED, { async: true })
  async handleSubmitted(
    event: DailyReportSubmittedNotificationEvent,
  ): Promise<void> {
    const [report, project, sender, recipientIds] = await Promise.all([
      this.dailyReportRepo.findOne({
        where: {
          id: event.reportId,
          organizationId: event.organizationId,
          projectId: event.projectId,
          status: DailyReportStatus.SUBMITTED,
        },
      }),
      this.projectRepo.findOne({
        where: {
          id: event.projectId,
          organizationId: event.organizationId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.userRepo.findOne({
        where: {
          id: event.actorUserId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.resolveProjectReportViewers(
        event.organizationId,
        event.projectId,
        event.actorUserId,
      ),
    ]);

    if (!report || !project || !recipientIds.length) {
      return;
    }

    const senderName = this.getDisplayName(sender, 'A teammate');
    const title = `${senderName} submitted a daily report`;
    const message = `${senderName} submitted the daily report for ${event.reportDate} in project ${project.name}.`;

    await Promise.allSettled(
      recipientIds.map((recipientId) =>
        this.notificationCoreService.send({
          userId: recipientId,
          senderId: sender?.id,
          senderName,
          senderAvatarUrl: sender?.avatarUrl,
          type: DAILY_REPORT_NOTIFICATION_TYPES.SUBMITTED,
          title,
          message,
          data: {
            module: 'daily_report',
            action: DAILY_REPORT_NOTIFICATION_TYPES.SUBMITTED,
            organizationId: event.organizationId,
            projectId: project.id,
            projectSlug: project.slug,
            reportId: report.id,
            reportDate: event.reportDate,
            submittedBy: event.actorUserId,
          },
          idempotencyKey: `daily-report:submitted:${report.id}:${recipientId}`,
        }),
      ),
    );
  }

  @OnEvent(DAILY_REPORT_NOTIFICATION_EVENTS.COMMENTED, { async: true })
  async handleCommented(
    event: DailyReportCommentedNotificationEvent,
  ): Promise<void> {
    const [report, project, actor] = await Promise.all([
      this.dailyReportRepo.findOne({
        where: {
          id: event.reportId,
          organizationId: event.organizationId,
          projectId: event.projectId,
        },
      }),
      this.projectRepo.findOne({
        where: {
          id: event.projectId,
          organizationId: event.organizationId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.userRepo.findOne({
        where: {
          id: event.actorUserId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
    ]);

    if (!report || !project || report.userId === event.actorUserId) {
      return;
    }

    const actorName = this.getDisplayName(actor, 'Project manager');
    const title = `${actorName} commented on your daily report`;
    const message = `${actorName} commented on your daily report for ${event.reportDate} in project ${project.name}.`;

    await this.notificationCoreService.send({
      userId: report.userId,
      senderId: actor?.id,
      senderName: actorName,
      senderAvatarUrl: actor?.avatarUrl,
      type: DAILY_REPORT_NOTIFICATION_TYPES.COMMENTED,
      title,
      message,
      data: {
        module: 'daily_report',
        action: DAILY_REPORT_NOTIFICATION_TYPES.COMMENTED,
        organizationId: event.organizationId,
        projectId: project.id,
        projectSlug: project.slug,
        reportId: report.id,
        reportDate: event.reportDate,
        commentId: event.commentId,
        commentedBy: event.actorUserId,
      },
      idempotencyKey: `daily-report:commented:${event.commentId}:${report.userId}`,
    });
  }

  @OnEvent(DAILY_REPORT_NOTIFICATION_EVENTS.SEEN, { async: true })
  async handleSeen(event: DailyReportSeenNotificationEvent): Promise<void> {
    const [report, project, actor] = await Promise.all([
      this.dailyReportRepo.findOne({
        where: {
          id: event.reportId,
          organizationId: event.organizationId,
          projectId: event.projectId,
        },
      }),
      this.projectRepo.findOne({
        where: {
          id: event.projectId,
          organizationId: event.organizationId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.userRepo.findOne({
        where: {
          id: event.actorUserId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
    ]);

    if (!report || !project || report.userId === event.actorUserId) {
      return;
    }

    const actorName = this.getDisplayName(actor, 'Project manager');
    const title = `${actorName} marked your daily report as seen`;
    const message = `${actorName} marked your daily report for ${event.reportDate} in project ${project.name} as seen.`;

    await this.notificationCoreService.send({
      userId: report.userId,
      senderId: actor?.id,
      senderName: actorName,
      senderAvatarUrl: actor?.avatarUrl,
      type: DAILY_REPORT_NOTIFICATION_TYPES.SEEN,
      title,
      message,
      data: {
        module: 'daily_report',
        action: DAILY_REPORT_NOTIFICATION_TYPES.SEEN,
        organizationId: event.organizationId,
        projectId: project.id,
        projectSlug: project.slug,
        reportId: report.id,
        reportDate: event.reportDate,
        seenBy: event.actorUserId,
      },
      idempotencyKey: `daily-report:seen:${report.id}:${event.actorUserId}:${event.occurredAt}`,
    });
  }

  async sendReminder(params: {
    organizationId: string;
    projectId: string;
    userId: string;
    reportDate: string;
  }): Promise<void> {
    const [project, organization, user] = await Promise.all([
      this.projectRepo.findOne({
        where: {
          id: params.projectId,
          organizationId: params.organizationId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.organizationRepo.findOne({
        where: {
          id: params.organizationId,
          isActive: true,
        },
      }),
      this.userRepo.findOne({
        where: {
          id: params.userId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
    ]);

    if (!project || !organization || !user) {
      return;
    }

    const title = `Reminder: submit your daily report for ${project.name}`;
    const message = `You have not submitted your daily report for ${params.reportDate} in project ${project.name}.`;
    const notification = await this.notificationCoreService.send({
      userId: user.id,
      senderName: 'System',
      type: DAILY_REPORT_NOTIFICATION_TYPES.REMINDER,
      title,
      message,
      data: {
        module: 'daily_report',
        action: DAILY_REPORT_NOTIFICATION_TYPES.REMINDER,
        organizationId: organization.id,
        organizationName: organization.name,
        projectId: project.id,
        projectSlug: project.slug,
        reportDate: params.reportDate,
      },
      idempotencyKey: `daily-report:reminder:${project.id}:${user.id}:${params.reportDate}`,
    });

    if (!notification || !user.email) {
      return;
    }

    try {
      await this.mailService.sendMailNotification(
        user.email,
        this.getDisplayName(user, user.email),
        title,
        message,
        [
          `Organization: ${organization.name}`,
          `Project: ${project.name}`,
          `Report date: ${params.reportDate}`,
          'Please submit your daily report before the configured daily reminder deadline.',
        ].join('\n'),
        'System',
      );
    } catch (error) {
      this.logger.error(
        `Failed to send daily report reminder email to ${user.email}: ${String(error)}`,
      );
    }
  }

  private async resolveProjectReportViewers(
    organizationId: string,
    projectId: string,
    actorUserId: string,
  ): Promise<string[]> {
    const members = await this.projectMemberRepo.find({
      where: {
        organizationId,
        projectId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const candidateIds = [
      ...new Set(members.map((member) => member.userId)),
    ].filter((userId) => userId !== actorUserId);
    if (!candidateIds.length) {
      return [];
    }

    const permissionChecks = await Promise.all(
      candidateIds.map(async (userId) => ({
        userId,
        allowed: await this.projectCoreService.hasProjectPermission(
          userId,
          organizationId,
          projectId,
          PERMISSIONS.PROJECTS.DAILY_REPORTS.VIEW_ALL,
        ),
      })),
    );

    return permissionChecks
      .filter((item) => item.allowed)
      .map((item) => item.userId);
  }

  private getDisplayName(user: User | null, fallback: string): string {
    if (!user) {
      return fallback;
    }

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return fullName || user.email || fallback;
  }
}
