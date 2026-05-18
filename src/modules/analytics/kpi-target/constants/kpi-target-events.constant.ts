import { KpiTargetScopeType } from '../enums/kpi-target.enum';

export const KPI_TARGET_EVENTS = {
  ASSIGNED: 'kpi-target.assigned',
} as const;

export interface KpiTargetAssignedEvent {
  targetId: string;
  organizationId: string;
  projectId?: string | null;
  scopeType: KpiTargetScopeType;
  userId?: string | null;
  roleId?: string | null;
  actorUserId: string;
  changeType: 'created' | 'updated' | 'cloned';
  occurredAt: string;
}
