import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import {
  DEFAULT_PERIODIC_REPORT_CHANNELS,
  DEFAULT_PERIODIC_REPORT_RECIPIENT_GROUPS,
  DEFAULT_PERIODIC_REPORT_SCOPES,
  PeriodicReportChannel,
  PeriodicReportRecipientGroup,
  PeriodicReportSchedule,
  PeriodicReportScope,
} from '@modules/organization/settings/constants/periodic-report-settings.constant';
import { OrgSettingsService } from '@modules/organization/settings/org-settings.service';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import {
  DEFAULT_REPORT_FREQUENCY,
  PERIODIC_REPORT_HISTORY_SORT_FIELDS,
  PERIODIC_REPORT_RETRY_MINUTES,
  PERIODIC_REPORT_TYPE,
  PeriodicReportAttemptStatus,
  PeriodicReportRunStatus,
  PeriodicReportTriggerSource,
  ReportFrequency,
} from '../domain/constants/periodic-report.constant';
import { ReportRun } from '../entities/report-run.entity';
import { ReportDeliveryAttempt } from '../entities/report-delivery-attempt.entity';
import { DispatchPeriodicReportRequest } from '../dto/request/dispatch-periodic-report.request';
import { PeriodicReportHistoryRequest } from '../dto/request/periodic-report-history.request';
import {
  PeriodicReportArtifactResponse,
  PeriodicReportAttemptResponse,
  PeriodicReportHistoryDetailResponse,
  PeriodicReportHistoryItemResponse,
} from '../dto/response/periodic-report-history.response';
import { PeriodicReportPeriodService } from '../domain/periodic-report-period.service';
import { PeriodicReportBuilderService } from '../domain/periodic-report-builder.service';
import {
  PeriodicReportCsvArtifact,
  PeriodicReportCsvService,
} from '../domain/periodic-report-csv.service';
import { PeriodicReportXlsxService } from '../domain/periodic-report-xlsx.service';
import { PeriodicReportRecipientResolver } from '../domain/periodic-report-recipient-resolver.service';
import { PeriodicReportMailService } from '../domain/periodic-report-mail.service';
import {
  PeriodicReportArtifact,
  PeriodicReportRecipient,
  PeriodicReportSnapshotContent,
  PeriodicReportSummarySnapshot,
} from '../domain/types/periodic-report.types';

type PeriodicReportArtifactScope = {
  scopeKey: string;
  scopeType: 'organization' | 'project_manager';
  scopeLabel: string;
  projectIds?: string[];
};

type PeriodicReportMailAttachment = {
  filename: string;
  path: string;
  contentType: string;
};

const ORGANIZATION_ARTIFACT_SCOPE: PeriodicReportArtifactScope = {
  scopeKey: 'organization',
  scopeType: 'organization',
  scopeLabel: 'Organization',
};

@Injectable()
export class PeriodicReportService {
  private readonly logger = new Logger(PeriodicReportService.name);

  constructor(
    @InjectRepository(ReportRun)
    private readonly reportRunRepo: Repository<ReportRun>,
    @InjectRepository(ReportDeliveryAttempt)
    private readonly attemptRepo: Repository<ReportDeliveryAttempt>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrgSettings)
    private readonly orgSettingsRepo: Repository<OrgSettings>,
    private readonly orgSettingsService: OrgSettingsService,
    private readonly imageKitService: ImageKitService,
    private readonly periodService: PeriodicReportPeriodService,
    private readonly builderService: PeriodicReportBuilderService,
    private readonly csvService: PeriodicReportCsvService,
    private readonly xlsxService: PeriodicReportXlsxService,
    private readonly recipientResolver: PeriodicReportRecipientResolver,
    private readonly mailService: PeriodicReportMailService,
    private readonly notificationCoreService: NotificationCoreService,
    private readonly dataSource: DataSource,
  ) {}

  async scheduleLatestPeriodRuns(): Promise<void> {
    const settingsRows = await this.orgSettingsRepo.find();
    const enabledRows = settingsRows.filter((row) =>
      (row.periodicReportSchedules ?? []).some((s) => s.enabled),
    );
    if (!enabledRows.length) {
      return;
    }

    const organizations = await this.organizationRepo.find({
      where: {
        id: In(enabledRows.map((row) => row.organizationId)),
        isActive: true,
      },
    });
    const organizationMap = new Map(organizations.map((org) => [org.id, org]));

    for (const settings of enabledRows) {
      const organization = organizationMap.get(settings.organizationId);
      if (!organization) continue;

      for (const schedule of settings.periodicReportSchedules ?? []) {
        if (!schedule.enabled) continue;
        const frequency = schedule.frequency as ReportFrequency;
        const period = this.periodService.getLatestClosedPeriodSchedule(
          frequency,
          new Date(),
          DEFAULT_TIMEZONE,
          schedule.sendDelayDays ?? 1,
          schedule.sendTime ?? '08:00',
        );

        if (new Date() < period.scheduledFor) {
          continue;
        }

        const existing = await this.reportRunRepo.findOne({
          where: {
            organizationId: organization.id,
            reportType: PERIODIC_REPORT_TYPE,
            frequency,
            periodKey: period.periodKey,
          },
        });
        if (existing) {
          continue;
        }

        try {
          await this.reportRunRepo.save(
            this.reportRunRepo.create({
              organizationId: organization.id,
              reportType: PERIODIC_REPORT_TYPE,
              frequency,
              periodKey: period.periodKey,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              status: PeriodicReportRunStatus.PENDING,
              scheduledFor: period.scheduledFor,
            }),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to create periodic report run for org ${organization.id} [${frequency}]: ${this.stringifyError(
              error,
            )}`,
          );
        }
      }
    }
  }

  async dispatchDueRuns(): Promise<void> {
    const now = new Date();
    const dueRuns = await this.reportRunRepo
      .createQueryBuilder('run')
      .where('run.report_type = :reportType', {
        reportType: PERIODIC_REPORT_TYPE,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('run.status = :pending AND run.scheduled_for <= :now', {
            pending: PeriodicReportRunStatus.PENDING,
            now,
          }).orWhere(
            'run.status IN (:...retryStatuses) AND run.next_retry_at IS NOT NULL AND run.next_retry_at <= :now',
            {
              retryStatuses: [
                PeriodicReportRunStatus.PARTIAL_FAILED,
                PeriodicReportRunStatus.FAILED_RETRYABLE,
              ],
              now,
            },
          );
        }),
      )
      .orderBy('COALESCE(run.next_retry_at, run.scheduled_for)', 'ASC')
      .limit(10)
      .getMany();

    for (const run of dueRuns) {
      const trigger =
        run.status === PeriodicReportRunStatus.PENDING
          ? PeriodicReportTriggerSource.AUTO
          : PeriodicReportTriggerSource.RETRY;
      await this.processRun(run.id, trigger, {});
    }
  }

  async dispatchManually(
    organizationId: string,
    dto: DispatchPeriodicReportRequest,
    currentUserId?: string,
  ): Promise<PeriodicReportHistoryDetailResponse> {
    const organization = await this.getOrganizationOrThrow(organizationId);
    const period = this.periodService.parsePeriodKey(dto.periodKey);
    const existing = await this.reportRunRepo.findOne({
      where: {
        organizationId,
        reportType: PERIODIC_REPORT_TYPE,
        frequency: period.frequency,
        periodKey: period.periodKey,
      },
    });

    if (existing?.status === PeriodicReportRunStatus.RUNNING) {
      throw new ConflictException(
        'Periodic report run is currently processing',
      );
    }
    if (
      existing?.status === PeriodicReportRunStatus.SENT &&
      !dto.forceResend
    ) {
      throw new ConflictException(
        `Periodic report ${period.periodKey} has already been sent`,
      );
    }

    const runId = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReportRun);
      let run = existing;
      if (!run) {
        run = repo.create({
          organizationId,
          reportType: PERIODIC_REPORT_TYPE,
          frequency: period.frequency,
          periodKey: period.periodKey,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          status: PeriodicReportRunStatus.PENDING,
          scheduledFor: new Date(),
        });
      } else {
        run.status = PeriodicReportRunStatus.PENDING;
        run.scheduledFor = new Date();
        run.nextRetryAt = null;
        run.lastError = null;
        if (dto.forceRebuild) {
          run.summarySnapshot = null;
          run.artifactSnapshot = null;
        }
        if (dto.forceResend) {
          run.successCount = 0;
          run.failedCount = 0;
          run.successfulRecipientSnapshot = [];
          run.pendingRecipientSnapshot = [];
          run.resolvedRecipientSnapshot = [];
          run.sentAt = null;
        }
      }

      const saved = await repo.save(run);
      return saved.id;
    });

    await this.processRun(runId, PeriodicReportTriggerSource.MANUAL, {
      forceRebuild: dto.forceRebuild,
      forceResend: dto.forceResend,
      organization,
    });

    return this.getHistoryDetail(organizationId, runId, currentUserId);
  }

  async getHistory(
    organizationId: string,
    query: PeriodicReportHistoryRequest,
    currentUserId?: string,
  ): Promise<PaginatedResponse<PeriodicReportHistoryItemResponse>> {
    const qb = this.reportRunRepo
      .createQueryBuilder('run')
      .where('run.organization_id = :organizationId', { organizationId })
      .andWhere('run.report_type = :reportType', {
        reportType: PERIODIC_REPORT_TYPE,
      });

    if (query.periodKey) {
      qb.andWhere('run.period_key = :periodKey', {
        periodKey: query.periodKey,
      });
    }
    if (query.status) {
      qb.andWhere('run.status = :status', { status: query.status });
    }
    if (query.frequency) {
      qb.andWhere('run.frequency = :frequency', {
        frequency: query.frequency,
      });
    }

    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      PERIODIC_REPORT_HISTORY_SORT_FIELDS,
      'run',
    );

    const [items, total] = await qb.getManyAndCount();
    const meta = PaginationHelper.buildMeta(total, query);
    return new PaginatedResponse(
      items.map((item) => this.mapHistoryItem(item, currentUserId)),
      meta,
    );
  }

  async getHistoryDetail(
    organizationId: string,
    runId: string,
    currentUserId?: string,
  ): Promise<PeriodicReportHistoryDetailResponse> {
    const run = await this.reportRunRepo.findOne({
      where: {
        id: runId,
        organizationId,
        reportType: PERIODIC_REPORT_TYPE,
      },
    });
    if (!run) {
      throw new NotFoundException('Periodic report run not found');
    }

    const attempts = await this.attemptRepo.find({
      where: { reportRunId: run.id },
      order: { attemptNo: 'ASC' },
    });

    return {
      ...this.mapHistoryItem(run, currentUserId),
      attempts: attempts.map((attempt) => this.mapAttempt(attempt)),
    };
  }

  private async processRun(
    runId: string,
    triggerSource: PeriodicReportTriggerSource,
    options: {
      forceRebuild?: boolean;
      forceResend?: boolean;
      organization?: Organization;
    },
  ): Promise<void> {
    const lockedRun = await this.lockRunForProcessing(runId, triggerSource);
    if (!lockedRun) {
      return;
    }

    const organization =
      options.organization ??
      (await this.getOrganizationOrThrow(lockedRun.organizationId));
    const settings = await this.orgSettingsService.getOrCreate(
      lockedRun.organizationId,
    );
    const runFrequency =
      (lockedRun.frequency as ReportFrequency) ?? DEFAULT_REPORT_FREQUENCY;
    const schedule = this.findScheduleForFrequency(settings, runFrequency);
    const groups = this.resolveRecipientGroups(schedule);
    const channels = this.resolveChannels(schedule);
    const scopes = this.resolveScopes(schedule);
    const scheduleCustomEmails = this.resolveCustomEmails(schedule);
    const attemptNo = lockedRun.attemptCount + 1;
    const previousSuccessful =
      options.forceResend === true
        ? []
        : (lockedRun.successfulRecipientSnapshot ?? []);

    let recipients: PeriodicReportRecipient[] = [];
    let resolvedRecipients = lockedRun.resolvedRecipientSnapshot ?? [];
    const attempt = this.attemptRepo.create({
      reportRunId: lockedRun.id,
      attemptNo,
      triggerSource,
      status: PeriodicReportAttemptStatus.FAILED,
      startedAt: new Date(),
      recipientSnapshot: [],
      successfulRecipientSnapshot: [],
      failedRecipientSnapshot: [],
      successCount: 0,
      failedCount: 0,
    });
    await this.attemptRepo.save(attempt);

    try {
      if (triggerSource === PeriodicReportTriggerSource.RETRY) {
        recipients = lockedRun.pendingRecipientSnapshot ?? [];
      } else if (
        triggerSource === PeriodicReportTriggerSource.MANUAL &&
        options.forceResend
      ) {
        recipients = await this.recipientResolver.resolveRecipients(
          organization,
          groups,
          scheduleCustomEmails,
        );
        resolvedRecipients = recipients;
      } else if ((lockedRun.pendingRecipientSnapshot?.length ?? 0) > 0) {
        recipients = lockedRun.pendingRecipientSnapshot ?? [];
      } else {
        recipients = await this.recipientResolver.resolveRecipients(
          organization,
          groups,
          scheduleCustomEmails,
        );
        resolvedRecipients = recipients;
      }

      attempt.recipientSnapshot = recipients;
      await this.attemptRepo.save(attempt);

      if (!recipients.length) {
        throw new ConflictException(
          'No periodic report recipients were resolved',
        );
      }
      if (!channels.length) {
        throw new ConflictException(
          'No supported periodic report channels were configured',
        );
      }

      let summarySnapshot =
        options.forceRebuild || !lockedRun.summarySnapshot
          ? await this.builderService.buildSnapshot({
              organization,
              periodKey: lockedRun.periodKey,
              periodStart: lockedRun.periodStart,
              periodEnd: lockedRun.periodEnd,
              timeZone: DEFAULT_TIMEZONE,
              scopes,
            })
          : (lockedRun.summarySnapshot as PeriodicReportSummarySnapshot);

      let artifactSnapshot = lockedRun.artifactSnapshot ?? [];
      const artifactVersion = this.buildArtifactVersion(attemptNo);
      const organizationArtifactResult = await this.ensureArtifactsForScope({
        organizationId: organization.id,
        periodKey: lockedRun.periodKey,
        runId: lockedRun.id,
        artifactVersion,
        artifactSnapshot,
        csvArtifacts: [
          ...this.csvService.buildArtifacts(summarySnapshot),
          ...(await this.xlsxService.buildArtifacts(summarySnapshot)),
        ],
        scope: ORGANIZATION_ARTIFACT_SCOPE,
        forceRebuild: options.forceRebuild === true,
      });
      artifactSnapshot = organizationArtifactResult.artifactSnapshot;

      const successfulRecipients: PeriodicReportRecipient[] = [];
      const failedRecipients: PeriodicReportRecipient[] = [];
      const failureMessages: string[] = [];
      const attachments = this.buildMailAttachmentsFromStoredArtifacts(
        organizationArtifactResult.scopeArtifacts,
      );
      const scopedRecipientContentCache = new Map<
        string,
        {
          snapshot: PeriodicReportSummarySnapshot;
          attachments: PeriodicReportMailAttachment[];
        }
      >();

      for (const recipient of recipients) {
        try {
          let recipientSnapshot = summarySnapshot;
          let recipientAttachments = attachments;
          let recipientScopeKey = ORGANIZATION_ARTIFACT_SCOPE.scopeKey;

          if (this.shouldUseProjectManagerScope(recipient)) {
            const scope = this.buildRecipientArtifactScope(recipient);
            recipientScopeKey = scope.scopeKey;
            let scopedContent = scopedRecipientContentCache.get(scope.scopeKey);
            if (!scopedContent) {
              let scopedSnapshot =
                options.forceRebuild === true
                  ? null
                  : this.getStoredScopedSnapshot(
                      summarySnapshot,
                      scope.scopeKey,
                    );
              if (!scopedSnapshot) {
                scopedSnapshot = await this.builderService.buildSnapshot({
                  organization,
                  periodKey: lockedRun.periodKey,
                  periodStart: lockedRun.periodStart,
                  periodEnd: lockedRun.periodEnd,
                  timeZone: DEFAULT_TIMEZONE,
                  scopes,
                  projectIds: recipient.managedProjectIds,
                });
                summarySnapshot = this.storeScopedSnapshot(
                  summarySnapshot,
                  scope.scopeKey,
                  scopedSnapshot,
                );
              }

              const scopedArtifactResult = await this.ensureArtifactsForScope({
                organizationId: organization.id,
                periodKey: lockedRun.periodKey,
                runId: lockedRun.id,
                artifactVersion,
                artifactSnapshot,
                csvArtifacts: [
                  ...this.csvService.buildArtifacts(scopedSnapshot),
                  ...(await this.xlsxService.buildArtifacts(scopedSnapshot)),
                ],
                scope,
                forceRebuild: options.forceRebuild === true,
              });
              artifactSnapshot = scopedArtifactResult.artifactSnapshot;
              scopedContent = {
                snapshot: scopedSnapshot,
                attachments: this.buildMailAttachmentsFromStoredArtifacts(
                  scopedArtifactResult.scopeArtifacts,
                ),
              };
              scopedRecipientContentCache.set(scope.scopeKey, scopedContent);
            }

            recipientSnapshot = scopedContent.snapshot;
            recipientAttachments = scopedContent.attachments;
          }

          await this.deliverPeriodicReport({
            organization,
            run: lockedRun,
            recipient,
            channels,
            snapshot: recipientSnapshot,
            attachments: recipientAttachments,
            scopeKey: recipientScopeKey,
          });
          successfulRecipients.push(recipient);
        } catch (error) {
          failedRecipients.push(recipient);
          failureMessages.push(
            `${recipient.email}: ${this.stringifyError(error)}`,
          );
        }
      }

      attempt.status = failedRecipients.length
        ? successfulRecipients.length
          ? PeriodicReportAttemptStatus.PARTIAL_FAILED
          : PeriodicReportAttemptStatus.FAILED
        : PeriodicReportAttemptStatus.SUCCESS;
      attempt.successfulRecipientSnapshot = successfulRecipients;
      attempt.failedRecipientSnapshot = failedRecipients;
      attempt.successCount = successfulRecipients.length;
      attempt.failedCount = failedRecipients.length;
      attempt.errorSummary = failureMessages.length
        ? failureMessages.join('\n')
        : null;
      attempt.finishedAt = new Date();
      await this.attemptRepo.save(attempt);

      const mergedSuccessful = this.mergeRecipients(
        previousSuccessful,
        successfulRecipients,
      );
      await this.updateRunAfterAttempt(lockedRun.id, {
        attemptNo,
        summarySnapshot,
        artifactSnapshot,
        resolvedRecipients,
        successfulRecipients: mergedSuccessful,
        failedRecipients,
        errorSummary: attempt.errorSummary,
        finishedAt: attempt.finishedAt,
      });
    } catch (error) {
      attempt.status = PeriodicReportAttemptStatus.FAILED;
      attempt.failedRecipientSnapshot = recipients;
      attempt.failedCount = recipients.length;
      attempt.errorSummary = this.stringifyError(error);
      attempt.finishedAt = new Date();
      await this.attemptRepo.save(attempt);

      await this.updateRunAfterAttempt(lockedRun.id, {
        attemptNo,
        summarySnapshot: (options.forceRebuild
          ? null
          : lockedRun.summarySnapshot) as PeriodicReportSummarySnapshot | null,
        artifactSnapshot: lockedRun.artifactSnapshot ?? [],
        resolvedRecipients,
        successfulRecipients: previousSuccessful,
        failedRecipients: recipients,
        forceFailure: true,
        errorSummary: attempt.errorSummary,
        finishedAt: attempt.finishedAt,
      });

      this.logger.error(
        `Periodic report run ${lockedRun.id} failed: ${this.stringifyError(error)}`,
      );
    }
  }

  private async lockRunForProcessing(
    runId: string,
    triggerSource: PeriodicReportTriggerSource,
  ): Promise<ReportRun | null> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReportRun);
      const run = await repo
        .createQueryBuilder('run')
        .setLock('pessimistic_write')
        .where('run.id = :runId', { runId })
        .getOne();

      if (!run || run.status === PeriodicReportRunStatus.RUNNING) {
        return null;
      }

      const now = new Date();
      const isDue =
        triggerSource === PeriodicReportTriggerSource.MANUAL ||
        (run.status === PeriodicReportRunStatus.PENDING &&
          run.scheduledFor <= now) ||
        ((run.status === PeriodicReportRunStatus.PARTIAL_FAILED ||
          run.status === PeriodicReportRunStatus.FAILED_RETRYABLE) &&
          !!run.nextRetryAt &&
          run.nextRetryAt <= now);

      if (!isDue) {
        return null;
      }

      run.status = PeriodicReportRunStatus.RUNNING;
      run.lastAttemptAt = now;
      await repo.save(run);
      return run;
    });
  }

  private async updateRunAfterAttempt(
    runId: string,
    payload: {
      attemptNo: number;
      summarySnapshot: PeriodicReportSummarySnapshot | null;
      artifactSnapshot: PeriodicReportArtifact[];
      resolvedRecipients: PeriodicReportRecipient[];
      successfulRecipients: PeriodicReportRecipient[];
      failedRecipients: PeriodicReportRecipient[];
      forceFailure?: boolean;
      errorSummary?: string | null;
      finishedAt: Date;
    },
  ): Promise<void> {
    const terminalFailure =
      (payload.forceFailure || payload.failedRecipients.length > 0) &&
      payload.attemptNo > PERIODIC_REPORT_RETRY_MINUTES.length;
    const hasFailures =
      payload.forceFailure || payload.failedRecipients.length > 0;

    let status = PeriodicReportRunStatus.SENT;
    let nextRetryAt: Date | null = null;
    let sentAt: Date | null = payload.finishedAt;

    if (hasFailures) {
      sentAt = null;
      if (terminalFailure) {
        status = PeriodicReportRunStatus.FAILED_EXHAUSTED;
      } else if (payload.successfulRecipients.length > 0) {
        status = PeriodicReportRunStatus.PARTIAL_FAILED;
        nextRetryAt = this.buildNextRetryAt(
          payload.finishedAt,
          payload.attemptNo,
        );
      } else {
        status = PeriodicReportRunStatus.FAILED_RETRYABLE;
        nextRetryAt = this.buildNextRetryAt(
          payload.finishedAt,
          payload.attemptNo,
        );
      }
    }

    await this.reportRunRepo.update(
      { id: runId },
      {
        attemptCount: payload.attemptNo,
        successCount: payload.successfulRecipients.length,
        failedCount: payload.failedRecipients.length,
        summarySnapshot: payload.summarySnapshot,
        artifactSnapshot: payload.artifactSnapshot,
        resolvedRecipientSnapshot: payload.resolvedRecipients,
        successfulRecipientSnapshot: payload.successfulRecipients,
        pendingRecipientSnapshot: payload.failedRecipients,
        nextRetryAt,
        status,
        lastError: payload.errorSummary ?? null,
        sentAt,
        lastAttemptAt: payload.finishedAt,
      },
    );
  }

  private buildNextRetryAt(baseTime: Date, attemptNo: number): Date | null {
    const minutes = PERIODIC_REPORT_RETRY_MINUTES[attemptNo - 1];
    if (!minutes) return null;
    return new Date(baseTime.getTime() + minutes * 60 * 1000);
  }

  private async ensureArtifactsForScope(payload: {
    organizationId: string;
    periodKey: string;
    runId: string;
    artifactVersion: string;
    artifactSnapshot: PeriodicReportArtifact[];
    csvArtifacts: PeriodicReportCsvArtifact[];
    scope: PeriodicReportArtifactScope;
    forceRebuild: boolean;
  }): Promise<{
    artifactSnapshot: PeriodicReportArtifact[];
    scopeArtifacts: PeriodicReportArtifact[];
  }> {
    const existingScopeArtifacts = payload.forceRebuild
      ? []
      : this.getArtifactsForScope(
          payload.artifactSnapshot,
          payload.scope.scopeKey,
        );

    if (
      !payload.forceRebuild &&
      !this.hasMissingArtifacts(existingScopeArtifacts, payload.csvArtifacts)
    ) {
      return {
        artifactSnapshot: payload.artifactSnapshot,
        scopeArtifacts: existingScopeArtifacts,
      };
    }

    const uploadedArtifacts = await this.uploadArtifacts({
      organizationId: payload.organizationId,
      periodKey: payload.periodKey,
      runId: payload.runId,
      artifactVersion: payload.artifactVersion,
      scope: payload.scope,
      artifacts: payload.csvArtifacts,
    });

    return {
      artifactSnapshot: this.replaceArtifactsForScope(
        payload.artifactSnapshot,
        payload.scope.scopeKey,
        uploadedArtifacts,
      ),
      scopeArtifacts: uploadedArtifacts,
    };
  }

  private async uploadArtifacts(payload: {
    organizationId: string;
    periodKey: string;
    runId: string;
    artifactVersion: string;
    scope: PeriodicReportArtifactScope;
    artifacts: PeriodicReportCsvArtifact[];
  }): Promise<PeriodicReportArtifact[]> {
    const uploaded = await Promise.all(
      payload.artifacts.map(async (artifact) => {
        const result = await this.imageKitService.uploadBuffer({
          buffer: artifact.content,
          fileName: artifact.fileName,
          folder: `reports/periodic/${payload.organizationId}/${payload.periodKey}/${payload.runId}/${payload.artifactVersion}/${payload.scope.scopeKey}`,
          mimeType: artifact.mimeType,
        });

        return {
          artifactType: artifact.artifactType,
          fileName: result.fileName,
          fileUrl: result.url,
          mimeType: artifact.mimeType,
          size: artifact.content.byteLength,
          scopeKey: payload.scope.scopeKey,
          scopeType: payload.scope.scopeType,
          scopeLabel: payload.scope.scopeLabel,
          projectIds: payload.scope.projectIds,
          artifactVersion: payload.artifactVersion,
        };
      }),
    );

    return uploaded;
  }

  private buildMailAttachmentsFromStoredArtifacts(
    artifacts: PeriodicReportArtifact[],
  ): PeriodicReportMailAttachment[] {
    return this.sortArtifactsForDelivery(artifacts).map((artifact) => ({
      filename: artifact.fileName,
      path: artifact.fileUrl,
      contentType: artifact.mimeType,
    }));
  }

  private hasMissingArtifacts(
    storedArtifacts: PeriodicReportArtifact[],
    csvArtifacts: PeriodicReportCsvArtifact[],
  ): boolean {
    if (!csvArtifacts.length) return false;
    if (!storedArtifacts.length) return true;
    if (
      storedArtifacts.some(
        (artifact) =>
          !artifact.scopeKey ||
          !artifact.scopeType ||
          !artifact.artifactVersion,
      )
    ) {
      return true;
    }

    const storedTypes = new Set(
      storedArtifacts.map((item) => item.artifactType),
    );
    return csvArtifacts.some(
      (artifact) => !storedTypes.has(artifact.artifactType),
    );
  }

  private getArtifactsForScope(
    artifacts: PeriodicReportArtifact[],
    scopeKey: string,
  ): PeriodicReportArtifact[] {
    return this.sortArtifactsForDelivery(
      artifacts.filter(
        (artifact) => this.getArtifactScopeKey(artifact) === scopeKey,
      ),
    );
  }

  private replaceArtifactsForScope(
    artifacts: PeriodicReportArtifact[],
    scopeKey: string,
    replacement: PeriodicReportArtifact[],
  ): PeriodicReportArtifact[] {
    return [
      ...artifacts.filter(
        (artifact) => this.getArtifactScopeKey(artifact) !== scopeKey,
      ),
      ...replacement,
    ];
  }

  private getArtifactScopeKey(artifact: PeriodicReportArtifact): string {
    return artifact.scopeKey ?? ORGANIZATION_ARTIFACT_SCOPE.scopeKey;
  }

  private sortArtifactsForDelivery(
    artifacts: PeriodicReportArtifact[],
  ): PeriodicReportArtifact[] {
    const order = [
      PeriodicReportScope.WORKBOOK,
      PeriodicReportScope.ORG_SUMMARY,
      PeriodicReportScope.PROJECT_SUMMARY,
      PeriodicReportScope.MEMBER_KPI,
    ];
    return [...artifacts].sort(
      (left, right) =>
        order.indexOf(left.artifactType) - order.indexOf(right.artifactType),
    );
  }

  private findScheduleForFrequency(
    settings: OrgSettings,
    frequency: ReportFrequency,
  ): PeriodicReportSchedule | null {
    return (
      (settings.periodicReportSchedules ?? []).find(
        (s) => s.frequency === frequency,
      ) ?? null
    );
  }

  private resolveRecipientGroups(
    schedule: PeriodicReportSchedule | null,
  ): PeriodicReportRecipientGroup[] {
    return (
      schedule?.recipientGroups?.length
        ? schedule.recipientGroups
        : DEFAULT_PERIODIC_REPORT_RECIPIENT_GROUPS
    ) as PeriodicReportRecipientGroup[];
  }

  private resolveScopes(
    schedule: PeriodicReportSchedule | null,
  ): PeriodicReportScope[] {
    return (
      schedule?.scopes?.length
        ? schedule.scopes
        : DEFAULT_PERIODIC_REPORT_SCOPES
    ) as PeriodicReportScope[];
  }

  private resolveChannels(
    schedule: PeriodicReportSchedule | null,
  ): PeriodicReportChannel[] {
    const normalized = (
      schedule?.channels?.length
        ? schedule.channels
        : DEFAULT_PERIODIC_REPORT_CHANNELS
    )
      .map((channel) => channel.trim().toLowerCase())
      .filter(
        (channel): channel is PeriodicReportChannel =>
          channel === PeriodicReportChannel.EMAIL ||
          channel === PeriodicReportChannel.IN_APP,
      );

    return [...new Set(normalized)];
  }

  private resolveCustomEmails(
    schedule: PeriodicReportSchedule | null,
  ): string[] {
    return schedule?.customEmails ?? [];
  }

  private async deliverPeriodicReport(payload: {
    organization: Organization;
    run: ReportRun;
    recipient: PeriodicReportRecipient;
    channels: PeriodicReportChannel[];
    snapshot: PeriodicReportSummarySnapshot;
    attachments: PeriodicReportMailAttachment[];
    scopeKey: string;
  }): Promise<void> {
    const channelResults: boolean[] = [];

    if (payload.channels.includes(PeriodicReportChannel.EMAIL)) {
      await this.mailService.sendPeriodicReport({
        email: payload.recipient.email,
        recipientName: payload.recipient.displayName || payload.recipient.email,
        organizationName: payload.organization.name,
        frequency:
          (payload.run.frequency as ReportFrequency) ?? DEFAULT_REPORT_FREQUENCY,
        snapshot: payload.snapshot,
        attachments: payload.attachments,
      });
      channelResults.push(true);
    }

    if (
      payload.channels.includes(PeriodicReportChannel.IN_APP) &&
      payload.recipient.userId
    ) {
      const notification = await this.notificationCoreService.send({
        userId: payload.recipient.userId,
        type: 'periodic_report',
        title: `Periodic Report ${payload.run.periodKey} is ready`,
        message: `Your periodic report for ${payload.organization.name} is ready.`,
        data: {
          module: 'analytics',
          action: 'periodic_report_ready',
          reportType: PERIODIC_REPORT_TYPE,
          runId: payload.run.id,
          periodKey: payload.run.periodKey,
          periodStart: payload.run.periodStart,
          periodEnd: payload.run.periodEnd,
          organizationId: payload.organization.id,
          organizationName: payload.organization.name,
          scopeKey: payload.scopeKey,
        },
        idempotencyKey: `periodic-report:${payload.run.id}:${payload.recipient.userId}`,
      });
      channelResults.push(notification !== undefined);
    }

    if (channelResults.length === 0) {
      throw new ConflictException(
        `No applicable periodic report channel for recipient ${payload.recipient.email}`,
      );
    }
  }

  private mergeRecipients(
    left: PeriodicReportRecipient[],
    right: PeriodicReportRecipient[],
  ): PeriodicReportRecipient[] {
    const merged = new Map<string, PeriodicReportRecipient>();
    for (const recipient of [...left, ...right]) {
      const key = recipient.email.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...recipient, sources: [...recipient.sources] });
        continue;
      }

      existing.sources = [
        ...new Set([...existing.sources, ...recipient.sources]),
      ];
      existing.displayName = existing.displayName || recipient.displayName;
      existing.userId = existing.userId || recipient.userId;
      existing.managedProjectIds = [
        ...new Set([
          ...(existing.managedProjectIds ?? []),
          ...(recipient.managedProjectIds ?? []),
        ]),
      ];
    }
    return [...merged.values()];
  }

  private shouldUseProjectManagerScope(
    recipient: PeriodicReportRecipient,
  ): boolean {
    const scopedSources = [
      PeriodicReportRecipientGroup.OWNER,
      PeriodicReportRecipientGroup.PROJECT_MANAGER,
    ];
    return (
      recipient.sources.length > 0 &&
      recipient.sources.every((source) => scopedSources.includes(source)) &&
      !!recipient.managedProjectIds?.length
    );
  }

  private buildRecipientArtifactScope(
    recipient: PeriodicReportRecipient,
  ): PeriodicReportArtifactScope {
    const projectIds = [...(recipient.managedProjectIds ?? [])].sort();
    return {
      scopeKey: this.buildProjectManagerScopeKey(projectIds),
      scopeType: 'project_manager',
      scopeLabel: recipient.sources.includes(
        PeriodicReportRecipientGroup.PROJECT_MANAGER,
      )
        ? 'Projects You Manage'
        : 'Projects You Own',
      projectIds,
    };
  }

  private buildProjectManagerScopeKey(projectIds: string[]): string {
    const digest = createHash('sha1')
      .update([...projectIds].sort().join(','))
      .digest('hex')
      .slice(0, 12);
    return `pm-${digest}`;
  }

  private getStoredScopedSnapshot(
    summarySnapshot: PeriodicReportSummarySnapshot,
    scopeKey: string,
  ): PeriodicReportSummarySnapshot | null {
    const scopedSnapshot = summarySnapshot.scopedSnapshots?.[scopeKey];
    return scopedSnapshot ? { ...scopedSnapshot } : null;
  }

  private storeScopedSnapshot(
    summarySnapshot: PeriodicReportSummarySnapshot,
    scopeKey: string,
    scopedSnapshot: PeriodicReportSummarySnapshot,
  ): PeriodicReportSummarySnapshot {
    const snapshotContent = { ...scopedSnapshot };
    delete snapshotContent.scopedSnapshots;

    return {
      ...summarySnapshot,
      scopedSnapshots: {
        ...(summarySnapshot.scopedSnapshots ?? {}),
        [scopeKey]: snapshotContent as PeriodicReportSnapshotContent,
      },
    };
  }

  private buildArtifactVersion(attemptNo: number): string {
    return `attempt-${attemptNo}-${Date.now()}`;
  }

  private async getOrganizationOrThrow(
    organizationId: string,
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId, isActive: true },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  private mapHistoryItem(
    run: ReportRun,
    currentUserId?: string,
  ): PeriodicReportHistoryItemResponse {
    const artifacts = this.getArtifactsForViewer(run, currentUserId);

    return {
      runId: run.id,
      frequency:
        (run.frequency as ReportFrequency) ?? DEFAULT_REPORT_FREQUENCY,
      periodKey: run.periodKey,
      status: run.status,
      scheduledFor: run.scheduledFor,
      sentAt: run.sentAt ?? null,
      attemptCount: run.attemptCount,
      successCount: run.successCount,
      failedCount: run.failedCount,
      lastError: run.lastError ?? null,
      artifacts: artifacts.map((artifact) => this.mapArtifact(artifact)),
    };
  }

  private getArtifactsForViewer(
    run: ReportRun,
    currentUserId?: string,
  ): PeriodicReportArtifact[] {
    const scopeKey = this.resolveViewerArtifactScopeKey(run, currentUserId);
    return this.getArtifactsForScope(run.artifactSnapshot ?? [], scopeKey);
  }

  private resolveViewerArtifactScopeKey(
    run: ReportRun,
    currentUserId?: string,
  ): string {
    if (!currentUserId) {
      return ORGANIZATION_ARTIFACT_SCOPE.scopeKey;
    }

    const recipient = [
      ...(run.resolvedRecipientSnapshot ?? []),
      ...(run.successfulRecipientSnapshot ?? []),
      ...(run.pendingRecipientSnapshot ?? []),
    ].find((item) => item.userId === currentUserId);

    if (recipient && this.shouldUseProjectManagerScope(recipient)) {
      return this.buildRecipientArtifactScope(recipient).scopeKey;
    }

    return ORGANIZATION_ARTIFACT_SCOPE.scopeKey;
  }

  private mapArtifact(
    artifact: PeriodicReportArtifact,
  ): PeriodicReportArtifactResponse {
    return {
      artifactType: artifact.artifactType,
      fileName: artifact.fileName,
      fileUrl: artifact.fileUrl,
      mimeType: artifact.mimeType,
      size: artifact.size,
      scopeKey: this.getArtifactScopeKey(artifact),
      scopeType: artifact.scopeType ?? ORGANIZATION_ARTIFACT_SCOPE.scopeType,
      scopeLabel: artifact.scopeLabel ?? ORGANIZATION_ARTIFACT_SCOPE.scopeLabel,
      projectIds: artifact.projectIds,
      artifactVersion: artifact.artifactVersion,
    };
  }

  private mapAttempt(
    attempt: ReportDeliveryAttempt,
  ): PeriodicReportAttemptResponse {
    return {
      attemptNo: attempt.attemptNo,
      triggerSource: attempt.triggerSource,
      status: attempt.status,
      successCount: attempt.successCount,
      failedCount: attempt.failedCount,
      errorSummary: attempt.errorSummary ?? null,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt ?? null,
    };
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
