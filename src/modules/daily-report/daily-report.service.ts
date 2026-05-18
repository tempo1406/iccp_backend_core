import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository, Brackets } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';
import { DailyReport, DailyReportStatus } from './entities/daily-report.entity';
import { DailyReportComment } from './entities/daily-report-comment.entity';
import {
  DailyReportItem,
  DailyReportItemType,
} from './entities/daily-report-item.entity';
import { TaskWorklog } from '@modules/project/task-management/entities/task-worklog.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { DailyReportDateRequest } from './dto/request/daily-report-date.request';
import { CreateDailyReportCommentRequest } from './dto/request/create-daily-report-comment.request';
import { UpdateDailyReportRequest } from './dto/request/update-daily-report.request';
import {
  DAILY_REPORT_SORT_FIELDS,
  QueryProjectDailyReportsRequest,
} from './dto/request/query-project-daily-reports.request';
import { DailyReportResponse } from './dto/response/daily-report.response';
import { DailyReportCommentResponse } from './dto/response/daily-report-comment.response';
import { DailyReportItemResponse } from './dto/response/daily-report-item.response';
import { ProjectCoreService } from '@modules/project/core/project-core.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { DAILY_REPORT_NOTIFICATION_EVENTS } from './constants/daily-report-notification-events.constant';

@Injectable()
export class DailyReportService {
  constructor(
    @InjectRepository(DailyReport)
    private readonly dailyReportRepo: Repository<DailyReport>,
    @InjectRepository(DailyReportItem)
    private readonly dailyReportItemRepo: Repository<DailyReportItem>,
    @InjectRepository(DailyReportComment)
    private readonly dailyReportCommentRepo: Repository<DailyReportComment>,
    @InjectRepository(TaskWorklog)
    private readonly taskWorklogRepo: Repository<TaskWorklog>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    private readonly projectCoreService: ProjectCoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getMyReport(
    projectId: string,
    orgId: string,
    userId: string,
    query: DailyReportDateRequest,
  ): Promise<DailyReportResponse> {
    const reportDate = await this.resolveReportDate(orgId, query.date);
    await this.assertOwnProjectAccess(projectId, orgId, userId);

    const existing = await this.dailyReportRepo.findOne({
      where: { organizationId: orgId, projectId, userId, reportDate },
    });

    if (!existing) {
      return this.generateMyReportDraft(projectId, orgId, userId, query);
    }

    return this.mapReport(existing);
  }

  async generateMyReportDraft(
    projectId: string,
    orgId: string,
    userId: string,
    query: DailyReportDateRequest,
  ): Promise<DailyReportResponse> {
    const reportDate = await this.resolveReportDate(orgId, query.date);
    await this.assertOwnProjectAccess(projectId, orgId, userId);

    let report = await this.dailyReportRepo.findOne({
      where: { organizationId: orgId, projectId, userId, reportDate },
    });

    if (report && report.status !== DailyReportStatus.DRAFT) {
      return this.mapReport(report);
    }

    if (!report) {
      report = this.dailyReportRepo.create({
        organizationId: orgId,
        projectId,
        userId,
        reportDate,
        status: DailyReportStatus.DRAFT,
      });
    }

    const worklogs = await this.taskWorklogRepo.find({
      where: {
        organizationId: orgId,
        projectId,
        userId,
        workDate: reportDate,
        deletedAt: IsNull(),
      },
      order: { startedAt: 'ASC', createdAt: 'ASC' },
    });

    report.totalLoggedMinutes = worklogs.reduce(
      (sum, item) => sum + item.durationMinutes,
      0,
    );
    report = await this.dailyReportRepo.save(report);

    await this.dailyReportItemRepo.delete({ dailyReportId: report.id });
    if (worklogs.length) {
      const taskIds = [...new Set(worklogs.map((item) => item.taskId))];
      const [tasks, project] = await Promise.all([
        this.taskRepo.find({
          where: { id: In(taskIds), organizationId: orgId },
          withDeleted: true,
        }),
        this.projectRepo.findOne({
          where: { id: projectId, organizationId: orgId },
          withDeleted: true,
        }),
      ]);

      const taskMap = new Map(tasks.map((task) => [task.id, task]));

      await this.dailyReportItemRepo.save(
        worklogs.map((worklog, index) => {
          const task = taskMap.get(worklog.taskId);

          return this.dailyReportItemRepo.create({
            dailyReportId: report.id,
            type: DailyReportItemType.WORKLOG,
            worklogId: worklog.id,
            projectId: worklog.projectId,
            taskId: worklog.taskId,
            projectNameSnapshot: project?.name ?? null,
            taskTitleSnapshot: task?.title ?? null,
            taskSlugSnapshot: task?.slug ?? null,
            content: worklog.description ?? null,
            workDate: worklog.workDate,
            startedAt: worklog.startedAt ?? null,
            endedAt: worklog.endedAt ?? null,
            durationMinutes: worklog.durationMinutes,
            progressPercent: worklog.progressPercent ?? null,
            isBlocker: worklog.isBlocker,
            displayOrder: index + 1,
          });
        }),
      );
    }

    return this.mapReport(report);
  }

  async updateMyReport(
    projectId: string,
    orgId: string,
    userId: string,
    reportId: string,
    dto: UpdateDailyReportRequest,
  ): Promise<DailyReportResponse> {
    await this.assertOwnProjectAccess(projectId, orgId, userId);
    const report = await this.getOwnReportOrThrow(
      reportId,
      projectId,
      orgId,
      userId,
    );
    this.assertDraft(report);

    if (dto.summary !== undefined) {
      report.summary = dto.summary;
    }
    if (dto.blockers !== undefined) {
      report.blockers = dto.blockers;
    }
    if (dto.planTomorrow !== undefined) {
      report.planTomorrow = dto.planTomorrow;
    }

    const saved = await this.dailyReportRepo.save(report);
    return this.mapReport(saved);
  }

  async submitMyReport(
    projectId: string,
    orgId: string,
    userId: string,
    reportId: string,
  ): Promise<DailyReportResponse> {
    await this.assertOwnProjectAccess(projectId, orgId, userId);
    const report = await this.getOwnReportOrThrow(
      reportId,
      projectId,
      orgId,
      userId,
    );
    this.assertDraft(report);

    report.status = DailyReportStatus.SUBMITTED;
    report.submittedAt = new Date();
    const saved = await this.dailyReportRepo.save(report);

    const items = await this.dailyReportItemRepo.find({
      where: { dailyReportId: report.id },
    });
    const worklogIds = items
      .map((item) => item.worklogId)
      .filter((value): value is string => !!value);

    if (worklogIds.length) {
      await this.taskWorklogRepo.update(
        { id: In(worklogIds), organizationId: orgId, projectId },
        { isSubmitted: true, reportedDailyReportId: report.id },
      );
    }

    this.eventEmitter.emit(DAILY_REPORT_NOTIFICATION_EVENTS.SUBMITTED, {
      organizationId: orgId,
      projectId,
      reportId: report.id,
      reportDate: report.reportDate,
      actorUserId: userId,
      occurredAt: new Date().toISOString(),
    });

    return this.mapReport(saved);
  }

  async getProjectReports(
    projectId: string,
    orgId: string,
    actorUserId: string,
    query: QueryProjectDailyReportsRequest,
  ): Promise<PaginatedResponse<DailyReportResponse>> {
    await this.assertProjectReportViewPermission(projectId, orgId, actorUserId);
    const reportDate = await this.resolveReportDate(orgId, query.date);

    const qb = this.dailyReportRepo
      .createQueryBuilder('report')
      .leftJoin(
        User,
        'user',
        ['user.id = report.user_id', 'user.deleted_at IS NULL'].join(' AND '),
      )
      .where('report.organization_id = :orgId', { orgId })
      .andWhere('report.project_id = :projectId', { projectId })
      .andWhere('report.report_date = :reportDate', { reportDate });

    if (query.userId) {
      qb.andWhere('report.user_id = :userId', { userId: query.userId });
    }

    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where(
              `TRIM(CONCAT(COALESCE(user.first_name, ''), ' ', COALESCE(user.last_name, ''))) ILIKE :search`,
              { search },
            )
            .orWhere('user.email ILIKE :search', { search })
            .orWhere('report.summary ILIKE :search', { search })
            .orWhere('report.blockers ILIKE :search', { search })
            .orWhere('report.plan_tomorrow ILIKE :search', { search });
        }),
      );
    }

    const total = await qb.getCount();
    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      DAILY_REPORT_SORT_FIELDS,
      'report',
    );

    const reports = await qb.getMany();
    const data = reports.length ? await this.mapReports(reports) : [];
    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(data, meta);
  }

  async getReportComments(
    projectId: string,
    orgId: string,
    actorUserId: string,
    reportId: string,
  ): Promise<DailyReportCommentResponse[]> {
    const report = await this.getAccessibleReportOrThrow(
      reportId,
      projectId,
      orgId,
      actorUserId,
    );
    return this.mapCommentsForReports([report.id]);
  }

  async addReportComment(
    projectId: string,
    orgId: string,
    actorUserId: string,
    reportId: string,
    dto: CreateDailyReportCommentRequest,
  ): Promise<DailyReportCommentResponse> {
    const report = await this.getReportForReviewerActionOrThrow(
      reportId,
      projectId,
      orgId,
      actorUserId,
    );
    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('comment content must not be empty');
    }

    const saved = await this.dailyReportCommentRepo.save(
      this.dailyReportCommentRepo.create({
        dailyReportId: report.id,
        authorId: actorUserId,
        content,
      }),
    );

    this.eventEmitter.emit(DAILY_REPORT_NOTIFICATION_EVENTS.COMMENTED, {
      organizationId: orgId,
      projectId,
      reportId: report.id,
      reportDate: report.reportDate,
      commentId: saved.id,
      actorUserId,
      occurredAt: new Date().toISOString(),
    });

    const [mapped] = await this.mapCommentEntities([saved]);
    return mapped;
  }

  async markReportSeen(
    projectId: string,
    orgId: string,
    actorUserId: string,
    reportId: string,
  ): Promise<DailyReportResponse> {
    const report = await this.getReportForReviewerActionOrThrow(
      reportId,
      projectId,
      orgId,
      actorUserId,
    );

    report.seenBy = actorUserId;
    report.seenAt = new Date();
    const saved = await this.dailyReportRepo.save(report);

    this.eventEmitter.emit(DAILY_REPORT_NOTIFICATION_EVENTS.SEEN, {
      organizationId: orgId,
      projectId,
      reportId: report.id,
      reportDate: report.reportDate,
      actorUserId,
      occurredAt: report.seenAt.toISOString(),
    });

    return this.mapReport(saved);
  }

  private async getOwnReportOrThrow(
    reportId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<DailyReport> {
    const report = await this.dailyReportRepo.findOne({
      where: {
        id: reportId,
        organizationId: orgId,
        projectId,
        userId,
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    return report;
  }

  private async getAccessibleReportOrThrow(
    reportId: string,
    projectId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<DailyReport> {
    const report = await this.dailyReportRepo.findOne({
      where: {
        id: reportId,
        organizationId: orgId,
        projectId,
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.userId === actorUserId) {
      await this.assertOwnProjectAccess(projectId, orgId, actorUserId);
      return report;
    }

    await this.assertProjectReportViewPermission(projectId, orgId, actorUserId);
    return report;
  }

  private async getReportForReviewerActionOrThrow(
    reportId: string,
    projectId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<DailyReport> {
    const report = await this.getAccessibleReportOrThrow(
      reportId,
      projectId,
      orgId,
      actorUserId,
    );

    if (report.userId === actorUserId) {
      throw new ForbiddenException(
        'You cannot review or comment on your own daily report',
      );
    }

    await this.assertProjectReportViewPermission(projectId, orgId, actorUserId);

    if (report.status === DailyReportStatus.DRAFT) {
      throw new ForbiddenException(
        'Only submitted daily reports can be reviewed or commented',
      );
    }

    return report;
  }

  private assertDraft(report: DailyReport): void {
    if (report.status !== DailyReportStatus.DRAFT) {
      throw new ForbiddenException(
        'Only draft daily reports can be modified or submitted',
      );
    }
  }

  private async assertOwnProjectAccess(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
  }

  private async assertProjectReportViewPermission(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.getProjectEntity(projectId, orgId);
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.DAILY_REPORTS.VIEW_ALL,
    );
  }

  private async resolveReportDate(
    _orgId: string,
    requestedDate?: string,
  ): Promise<string> {
    if (requestedDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        throw new BadRequestException('date must be in YYYY-MM-DD format');
      }
      return requestedDate;
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private async mapReport(report: DailyReport): Promise<DailyReportResponse> {
    const [mapped] = await this.mapReports([report]);
    return mapped;
  }

  private async mapReports(
    reports: DailyReport[],
  ): Promise<DailyReportResponse[]> {
    if (!reports.length) {
      return [];
    }

    const reportIds = reports.map((report) => report.id);
    const userIds = [...new Set(reports.map((report) => report.userId))];
    const projectIds = [...new Set(reports.map((report) => report.projectId))];

    const [items, comments, projects] = await Promise.all([
      this.dailyReportItemRepo.find({
        where: { dailyReportId: In(reportIds) },
        order: { displayOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.dailyReportCommentRepo.find({
        where: { dailyReportId: In(reportIds) },
        order: { createdAt: 'ASC' },
      }),
      this.projectRepo.find({
        where: {
          id: In(projectIds),
          organizationId: reports[0].organizationId,
        },
        select: { id: true, name: true },
        withDeleted: true,
      }),
    ]);
    const relatedUserIds = [
      ...new Set([
        ...userIds,
        ...reports
          .map((report) => report.seenBy)
          .filter((value): value is string => !!value),
        ...comments.map((comment) => comment.authorId),
      ]),
    ];
    const users = relatedUserIds.length
      ? await this.userRepo.find({
          where: {
            id: In(relatedUserIds),
            deletedAt: IsNull(),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        })
      : [];

    const itemsByReportId = new Map<string, DailyReportItem[]>();
    for (const item of items) {
      const bucket = itemsByReportId.get(item.dailyReportId) ?? [];
      bucket.push(item);
      itemsByReportId.set(item.dailyReportId, bucket);
    }

    const commentsByReportId = new Map<string, DailyReportComment[]>();
    for (const comment of comments) {
      const bucket = commentsByReportId.get(comment.dailyReportId) ?? [];
      bucket.push(comment);
      commentsByReportId.set(comment.dailyReportId, bucket);
    }

    const userMap = new Map(users.map((user) => [user.id, user]));
    const projectMap = new Map(
      projects.map((project) => [project.id, project]),
    );

    return reports.map((report) => {
      const user = userMap.get(report.userId);
      const seenByUser = report.seenBy ? userMap.get(report.seenBy) : undefined;
      const project = report.projectId
        ? projectMap.get(report.projectId)
        : undefined;
      const userDisplayName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      return plainToInstance(DailyReportResponse, {
        ...report,
        projectName: project?.name,
        userDisplayName: userDisplayName || user?.email || report.userId,
        userEmail: user?.email,
        isSeen: !!report.seenAt,
        seenByUserId: report.seenBy ?? null,
        seenByDisplayName: seenByUser ? this.getDisplayName(seenByUser) : null,
        seenByEmail: seenByUser?.email ?? null,
        seenAt: report.seenAt ?? null,
        items: (itemsByReportId.get(report.id) ?? []).map((item) =>
          this.mapItem(item),
        ),
        comments: (commentsByReportId.get(report.id) ?? []).map((comment) =>
          this.mapComment(comment, userMap),
        ),
      });
    });
  }

  private mapItem(item: DailyReportItem): DailyReportItemResponse {
    return plainToInstance(DailyReportItemResponse, {
      ...item,
      projectName: item.projectNameSnapshot,
      taskTitle: item.taskTitleSnapshot,
      taskSlug: item.taskSlugSnapshot,
    });
  }

  private async mapCommentsForReports(
    reportIds: string[],
  ): Promise<DailyReportCommentResponse[]> {
    if (!reportIds.length) {
      return [];
    }

    const comments = await this.dailyReportCommentRepo.find({
      where: { dailyReportId: In(reportIds) },
      order: { createdAt: 'ASC' },
    });
    return this.mapCommentEntities(comments);
  }

  private async mapCommentEntities(
    comments: DailyReportComment[],
  ): Promise<DailyReportCommentResponse[]> {
    if (!comments.length) {
      return [];
    }

    const users = await this.userRepo.find({
      where: {
        id: In([...new Set(comments.map((comment) => comment.authorId))]),
        deletedAt: IsNull(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));
    return comments.map((comment) => this.mapComment(comment, userMap));
  }

  private mapComment(
    comment: DailyReportComment,
    userMap: Map<string, User>,
  ): DailyReportCommentResponse {
    const author = userMap.get(comment.authorId);
    return plainToInstance(DailyReportCommentResponse, {
      id: comment.id,
      dailyReportId: comment.dailyReportId,
      author: {
        id: comment.authorId,
        displayName: author ? this.getDisplayName(author) : comment.authorId,
        email: author?.email ?? '',
        avatarUrl: author?.avatarUrl ?? null,
      },
      content: comment.content,
      createdAt: comment.createdAt,
    });
  }

  private getDisplayName(user: User): string {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email
    );
  }
}
