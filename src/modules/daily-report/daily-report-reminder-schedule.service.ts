import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ProjectConfig } from '@modules/project/settings/entities/project-config.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { DailyReport, DailyReportStatus } from './entities/daily-report.entity';
import { DailyReportNotificationListener } from './daily-report-notification.listener';
import { TaskWorklog } from '@modules/project/task-management/entities/task-worklog.entity';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

type LocalDateTime = {
  date: string;
  weekday: number;
  hour: number;
  minute: number;
};

type DueReminder = {
  reportDate: string;
};

const DEFAULT_DAILY_DAYS = [1, 2, 3, 4, 5];
const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Monday: 1,
  Tue: 2,
  Tuesday: 2,
  Wed: 3,
  Wednesday: 3,
  Thu: 4,
  Thursday: 4,
  Fri: 5,
  Friday: 5,
  Sat: 6,
  Saturday: 6,
  Sun: 7,
  Sunday: 7,
};

@Injectable()
export class DailyReportReminderScheduleService {
  private readonly logger = new Logger(DailyReportReminderScheduleService.name);
  private isScanning = false;

  constructor(
    @InjectRepository(ProjectConfig)
    private readonly projectConfigRepo: Repository<ProjectConfig>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepo: Repository<DailyReport>,
    @InjectRepository(TaskWorklog)
    private readonly taskWorklogRepo: Repository<TaskWorklog>,
    private readonly dailyReportNotificationListener: DailyReportNotificationListener,
  ) {}

  async dispatchPendingDailyReportReminders(): Promise<void> {
    if (this.isScanning) {
      this.logger.warn(
        'Daily report reminder scan already in progress, skipping',
      );
      return;
    }

    this.isScanning = true;
    try {
      await this.scanAndSend();
    } catch (error) {
      this.logger.error(`Daily report reminder scan failed: ${String(error)}`);
    } finally {
      this.isScanning = false;
    }
  }

  private async scanAndSend(): Promise<void> {
    const configs = await this.projectConfigRepo.find({
      where: { dailyEnabled: true },
    });
    const configsWithTime = configs.filter(
      (config) => this.parseTime(config.dailyTime ?? '') !== null,
    );

    if (!configsWithTime.length) {
      return;
    }

    const projectIds = [
      ...new Set(configsWithTime.map((config) => config.projectId)),
    ];
    const organizationIds = [
      ...new Set(configsWithTime.map((config) => config.organizationId)),
    ];

    const [projects, organizations] = await Promise.all([
      this.projectRepo.find({
        where: {
          id: In(projectIds),
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.organizationRepo.find({
        where: {
          id: In(organizationIds),
          isActive: true,
        },
      }),
    ]);

    const projectMap = new Map(
      projects.map((project) => [project.id, project]),
    );
    const organizationMap = new Map(
      organizations.map((organization) => [organization.id, organization]),
    );
    const dueConfigs = configsWithTime
      .map((config) => {
        const project = projectMap.get(config.projectId);
        const organization = organizationMap.get(config.organizationId);
        if (!project || !organization) {
          return null;
        }

        const dueReminder = this.resolveDueReminder(config);
        if (!dueReminder) {
          return null;
        }

        return {
          organization,
          project,
          reportDate: dueReminder.reportDate,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (!dueConfigs.length) {
      return;
    }

    await Promise.allSettled(
      dueConfigs.map((item) => this.sendProjectReminders(item)),
    );
  }

  private async sendProjectReminders(item: {
    organization: Organization;
    project: Project;
    reportDate: string;
  }): Promise<void> {
    const members = await this.projectMemberRepo.find({
      where: {
        organizationId: item.organization.id,
        projectId: item.project.id,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const memberIds = [...new Set(members.map((member) => member.userId))];
    if (!memberIds.length) return;

    const [submittedReports, worklogs] = await Promise.all([
      this.dailyReportRepo.find({
        where: {
          organizationId: item.organization.id,
          projectId: item.project.id,
          reportDate: item.reportDate,
          userId: In(memberIds),
          status: In([DailyReportStatus.SUBMITTED, DailyReportStatus.LOCKED]),
        },
      }),
      this.taskWorklogRepo.find({
        where: {
          organizationId: item.organization.id,
          projectId: item.project.id,
          workDate: item.reportDate,
          userId: In(memberIds),
        },
        select: ['userId'],
      }),
    ]);

    const submittedUserIds = new Set(submittedReports.map((r) => r.userId));
    const worklogUserIds = new Set(worklogs.map((w) => w.userId));
    const pendingUserIds = memberIds.filter(
      (userId) => worklogUserIds.has(userId) && !submittedUserIds.has(userId),
    );
    if (!pendingUserIds.length) return;

    await Promise.allSettled(
      pendingUserIds.map((userId) =>
        this.dailyReportNotificationListener.sendReminder({
          organizationId: item.organization.id,
          projectId: item.project.id,
          userId,
          reportDate: item.reportDate,
        }),
      ),
    );
  }

  private resolveDueReminder(config: ProjectConfig): DueReminder | null {
    const time = this.parseTime(config.dailyTime ?? '');
    if (!time) {
      return null;
    }

    const current = this.getLocalDateTime(new Date(), DEFAULT_TIMEZONE);
    const dailyDays = this.normalizeDailyDays(config.dailyDays);

    if (!dailyDays.includes(current.weekday)) {
      return null;
    }

    if (current.hour !== time.hour || current.minute !== time.minute) {
      return null;
    }

    return { reportDate: current.date };
  }

  private parseTime(value: string): { hour: number; minute: number } | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return { hour, minute };
  }

  private normalizeDailyDays(days?: number[]): number[] {
    const normalized = (days?.length ? days : DEFAULT_DAILY_DAYS).filter(
      (day) => Number.isInteger(day) && day >= 1 && day <= 7,
    );
    return [...new Set(normalized)];
  }

  private getLocalDateTime(date: Date, timeZone: string): LocalDateTime {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const weekday = WEEKDAY_MAP[values.get('weekday') ?? ''];
    const year = values.get('year');
    const month = values.get('month');
    const day = values.get('day');
    const hour = Number(values.get('hour'));
    const minute = Number(values.get('minute'));

    if (!weekday || !year || !month || !day) {
      throw new Error(`Cannot resolve local datetime for timezone ${timeZone}`);
    }

    return {
      date: `${year}-${month}-${day}`,
      weekday,
      hour,
      minute,
    };
  }

}
