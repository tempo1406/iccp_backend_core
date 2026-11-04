import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PeriodicReportAttemptStatus,
  PeriodicReportRunStatus,
  PeriodicReportTriggerSource,
  ReportFrequency,
} from '../../domain/constants/periodic-report.constant';

export class PeriodicReportArtifactResponse {
  @ApiProperty()
  artifactType: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileUrl: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiPropertyOptional()
  scopeKey?: string;

  @ApiPropertyOptional()
  scopeType?: string;

  @ApiPropertyOptional()
  scopeLabel?: string;

  @ApiPropertyOptional({ type: [String] })
  projectIds?: string[];

  @ApiPropertyOptional()
  artifactVersion?: string;
}

export class PeriodicReportAttemptResponse {
  @ApiProperty()
  attemptNo: number;

  @ApiProperty({ enum: PeriodicReportTriggerSource })
  triggerSource: PeriodicReportTriggerSource;

  @ApiProperty({ enum: PeriodicReportAttemptStatus })
  status: PeriodicReportAttemptStatus;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiPropertyOptional()
  errorSummary?: string | null;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  finishedAt?: Date | null;
}

export class PeriodicReportHistoryItemResponse {
  @ApiProperty()
  runId: string;

  @ApiProperty({ enum: ReportFrequency })
  frequency: ReportFrequency;

  @ApiProperty()
  periodKey: string;

  @ApiProperty({ enum: PeriodicReportRunStatus })
  status: PeriodicReportRunStatus;

  @ApiProperty()
  scheduledFor: Date;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiProperty()
  attemptCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiPropertyOptional()
  lastError?: string | null;

  @ApiProperty({ type: [PeriodicReportArtifactResponse] })
  artifacts: PeriodicReportArtifactResponse[];
}

export class PeriodicReportHistoryDetailResponse extends PeriodicReportHistoryItemResponse {
  @ApiProperty({ type: [PeriodicReportAttemptResponse] })
  attempts: PeriodicReportAttemptResponse[];
}
