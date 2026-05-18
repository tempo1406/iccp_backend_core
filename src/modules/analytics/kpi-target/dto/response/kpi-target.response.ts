import {
  KpiTargetPeriod,
  KpiTargetScopeType,
  KpiTargetStatus,
} from '../../enums/kpi-target.enum';

export class KpiTargetSnapshotResponse {
  actualScore?: number;
  actualOnTimeRate?: number;
  actualPointCompletionRate?: number;
  actualOtHours?: number;
  actualCompletedTasks?: number;
  actualOverdueTasks?: number;
  actualPayload?: Record<string, unknown>;
  archivedAt: Date;
}

export class KpiTargetResolvedFromResponse {
  targetId: string;
  scopeType: KpiTargetScopeType;
  projectId?: string | null;
  userId?: string | null;
  roleId?: string | null;
}

export class KpiTargetResponse {
  id: string;
  organizationId: string;
  projectId?: string | null;
  scopeType: KpiTargetScopeType;
  userId?: string | null;
  roleId?: string | null;
  period: KpiTargetPeriod;
  periodStart: string;
  periodEnd: string;

  targetScore?: number;
  targetPointCompletionRate?: number;
  targetOnTimeRate?: number;
  targetOtHours?: number;
  targetCompletedTasks?: number;
  maxOverdueTasks?: number;
  requireZeroOverdue: boolean;

  status: KpiTargetStatus;
  note?: string;
  assignedBy?: string;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  snapshot?: KpiTargetSnapshotResponse;
  resolvedFrom?: KpiTargetResolvedFromResponse;

  createdAt: Date;
  updatedAt: Date;
}
