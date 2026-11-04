import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  ScopeType,
  UserRole,
} from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import {
  FindOptionsWhere,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiTargetSnapshot } from './entities/kpi-target-snapshot.entity';
import {
  KpiTargetPeriod,
  KpiTargetScopeType,
  KpiTargetStatus,
} from './enums/kpi-target.enum';
import {
  CloneKpiTargetRequest,
  UpdateKpiTargetRequest,
  UpsertKpiTargetRequest,
} from './dto/request/upsert-kpi-target.request';
import { ListKpiTargetsRequest } from './dto/request/list-kpi-targets.request';
import {
  KpiTargetResolvedFromResponse,
  KpiTargetResponse,
  KpiTargetSnapshotResponse,
} from './dto/response/kpi-target.response';
import {
  KPI_TARGET_EVENTS,
  KpiTargetAssignedEvent,
} from './constants/kpi-target-events.constant';

type RoleContext = {
  orgRoleIds: Set<string>;
  projectRoleIdsByProject: Map<string, Set<string>>;
};

@Injectable()
export class KpiTargetService {
  constructor(
    @InjectRepository(KpiTarget)
    private readonly targetRepo: Repository<KpiTarget>,
    @InjectRepository(KpiTargetSnapshot)
    private readonly snapshotRepo: Repository<KpiTargetSnapshot>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async bulkUpsert(
    orgId: string,
    actorId: string,
    dto: UpsertKpiTargetRequest,
  ): Promise<KpiTargetResponse[]> {
    await this.assertCanManage(orgId, actorId, dto.projectId ?? null);
    this.validatePeriod(dto.periodStart, dto.periodEnd);
    this.validateScopeRequest(dto);
    await this.assertRolesExist(orgId, dto);

    const periodStart = new Date(dto.periodStart);
    const rows: KpiTarget[] = [];

    for (const targetRef of this.expandTargetRefs(dto)) {
      const existing = await this.findActiveTargetByKey({
        organizationId: orgId,
        projectId: dto.projectId ?? null,
        scopeType: dto.scopeType,
        userId: targetRef.userId ?? null,
        roleId: targetRef.roleId ?? null,
        period: dto.period,
        periodStart,
      });

      const before = existing ? this.snapshotTargetState(existing) : null;
      const row =
        existing ??
        this.targetRepo.create({
          organizationId: orgId,
          projectId: dto.projectId ?? null,
          scopeType: dto.scopeType,
          userId: targetRef.userId ?? null,
          roleId: targetRef.roleId ?? null,
          period: dto.period,
          periodStart,
          periodEnd: new Date(dto.periodEnd),
          assignedBy: actorId,
        });

      this.applyUpsertPayload(row, dto, actorId);
      const saved = await this.targetRepo.save(row);
      rows.push(saved);

      await this.writeAuditLog({
        organizationId: orgId,
        actorId,
        action: existing ? 'kpi_target.updated' : 'kpi_target.created',
        entityId: saved.id,
        oldValues: before,
        newValues: this.snapshotTargetState(saved),
      });

      this.emitAssignedEvent(saved, actorId, existing ? 'updated' : 'created');
    }

    return this.toResponses(rows);
  }

  async clone(
    orgId: string,
    actorId: string,
    dto: CloneKpiTargetRequest,
  ): Promise<KpiTargetResponse[]> {
    await this.assertCanManage(orgId, actorId, dto.projectId ?? null);

    const sourceRows = await this.targetRepo.find({
      where: {
        organizationId: orgId,
        periodStart: new Date(dto.fromPeriodStart),
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
      },
      order: { createdAt: 'ASC' },
    });

    const filtered = sourceRows.filter((row) => {
      if (
        dto.userIds?.length &&
        row.scopeType === KpiTargetScopeType.USER &&
        row.userId &&
        !dto.userIds.includes(row.userId)
      ) {
        return false;
      }
      return true;
    });

    const clonedRows: KpiTarget[] = [];
    for (const source of filtered) {
      const destinationStart = new Date(dto.toPeriodStart);
      const durationMs =
        new Date(source.periodEnd).getTime() -
        new Date(source.periodStart).getTime();
      const destinationEnd = new Date(destinationStart.getTime() + durationMs);

      const existing = await this.findActiveTargetByKey({
        organizationId: orgId,
        projectId: source.projectId ?? null,
        scopeType: source.scopeType,
        userId: source.userId ?? null,
        roleId: source.roleId ?? null,
        period: source.period,
        periodStart: destinationStart,
      });

      const before = existing ? this.snapshotTargetState(existing) : null;
      const row =
        existing ??
        this.targetRepo.create({
          organizationId: orgId,
          projectId: source.projectId ?? null,
          scopeType: source.scopeType,
          userId: source.userId ?? null,
          roleId: source.roleId ?? null,
          period: source.period,
          periodStart: destinationStart,
          periodEnd: destinationEnd,
        });

      Object.assign(row, {
        periodEnd: destinationEnd,
        targetScore: source.targetScore,
        targetPointCompletionRate: source.targetPointCompletionRate,
        targetOnTimeRate: source.targetOnTimeRate,
        targetOtHours: source.targetOtHours,
        targetCompletedTasks: source.targetCompletedTasks,
        maxOverdueTasks: source.maxOverdueTasks,
        requireZeroOverdue: source.requireZeroOverdue,
        status:
          source.status === KpiTargetStatus.DRAFT
            ? KpiTargetStatus.DRAFT
            : KpiTargetStatus.ACTIVE,
        note: source.note,
        assignedBy: actorId,
      });

      const saved = await this.targetRepo.save(row);
      clonedRows.push(saved);

      await this.writeAuditLog({
        organizationId: orgId,
        actorId,
        action: 'kpi_target.cloned',
        entityId: saved.id,
        oldValues: before,
        newValues: this.snapshotTargetState(saved),
      });

      this.emitAssignedEvent(saved, actorId, 'cloned');
    }

    return this.toResponses(clonedRows);
  }

  async list(
    orgId: string,
    actorId: string,
    q: ListKpiTargetsRequest,
  ): Promise<KpiTargetResponse[]> {
    await this.assertCanView(orgId, actorId, q.projectId ?? null);

    const qb = this.targetRepo
      .createQueryBuilder('t')
      .where('t.organization_id = :orgId', { orgId })
      .andWhere('t.deleted_at IS NULL');

    if (q.userId) qb.andWhere('t.user_id = :userId', { userId: q.userId });
    if (q.roleId) qb.andWhere('t.role_id = :roleId', { roleId: q.roleId });
    if (q.projectId)
      qb.andWhere('t.project_id = :projectId', { projectId: q.projectId });
    if (q.scopeType)
      qb.andWhere('t.scope_type = :scopeType', { scopeType: q.scopeType });
    if (q.period) qb.andWhere('t.period = :period', { period: q.period });
    if (q.status) qb.andWhere('t.status = :status', { status: q.status });
    if (q.activeOn) {
      qb.andWhere('t.period_start <= :d AND t.period_end >= :d', { d: q.activeOn });
    }

    qb.orderBy('t.period_start', 'DESC').addOrderBy('t.updated_at', 'DESC');

    const rows = await qb.getMany();
    return this.toResponses(rows);
  }

  async listMine(orgId: string, userId: string): Promise<KpiTargetResponse[]> {
    const roleContext = await this.loadRoleContext(userId, orgId);
    const rows = await this.targetRepo.find({
      where: {
        organizationId: orgId,
        status: KpiTargetStatus.ACTIVE,
      },
      order: { periodStart: 'DESC', updatedAt: 'DESC' },
    });

    const applicable = rows.filter((row) =>
      this.isTargetApplicableToUser(row, userId, roleContext),
    );
    const effectiveRows = this.selectEffectiveTargets(applicable);
    const snapshotMap = await this.loadSnapshotMap(effectiveRows.map((row) => row.id));

    return effectiveRows.map((row) =>
      this.toResponse(
        row,
        snapshotMap.get(row.id),
        this.toResolvedFrom(row),
      ),
    );
  }

  async getById(
    id: string,
    orgId: string,
    actorId: string,
  ): Promise<KpiTargetResponse> {
    const row = await this.targetRepo.findOne({
      where: { id, organizationId: orgId },
    });
    if (!row) throw new NotFoundException('KPI target not found');

    const roleContext = await this.loadRoleContext(actorId, orgId);
    if (
      row.userId !== actorId &&
      !this.isTargetApplicableToUser(row, actorId, roleContext)
    ) {
      await this.assertCanView(orgId, actorId, row.projectId ?? null);
    }

    const snapshot = await this.snapshotRepo.findOne({
      where: { targetId: row.id },
    });
    return this.toResponse(row, snapshot);
  }

  async update(
    id: string,
    orgId: string,
    actorId: string,
    dto: UpdateKpiTargetRequest,
  ): Promise<KpiTargetResponse> {
    const row = await this.targetRepo.findOne({
      where: { id, organizationId: orgId },
    });
    if (!row) throw new NotFoundException('KPI target not found');

    await this.assertCanManage(orgId, actorId, row.projectId ?? null);

    const before = this.snapshotTargetState(row);
    Object.assign(row, dto);
    row.assignedBy = actorId;
    const saved = await this.targetRepo.save(row);

    await this.writeAuditLog({
      organizationId: orgId,
      actorId,
      action: 'kpi_target.updated',
      entityId: saved.id,
      oldValues: before,
      newValues: this.snapshotTargetState(saved),
    });
    this.emitAssignedEvent(saved, actorId, 'updated');

    const snapshot = await this.snapshotRepo.findOne({
      where: { targetId: saved.id },
    });
    return this.toResponse(saved, snapshot);
  }

  async remove(id: string, orgId: string, actorId: string): Promise<void> {
    const row = await this.targetRepo.findOne({
      where: { id, organizationId: orgId },
    });
    if (!row) throw new NotFoundException('KPI target not found');
    await this.assertCanManage(orgId, actorId, row.projectId ?? null);

    const before = this.snapshotTargetState(row);
    row.deletedBy = actorId;
    row.deletedAt = new Date();
    await this.targetRepo.save(row);

    await this.writeAuditLog({
      organizationId: orgId,
      actorId,
      action: 'kpi_target.deleted',
      entityId: row.id,
      oldValues: before,
      newValues: this.snapshotTargetState(row),
    });
  }

  async findArchivableTargets(orgId?: string): Promise<KpiTarget[]> {
    const qb = this.targetRepo
      .createQueryBuilder('t')
      .where('t.status = :status', { status: KpiTargetStatus.ACTIVE })
      .andWhere('t.deleted_at IS NULL');

    if (orgId) qb.andWhere('t.organization_id = :orgId', { orgId });
    return qb.getMany();
  }

  async markArchived(
    row: KpiTarget,
    actorId: string | null,
  ): Promise<KpiTarget> {
    const before = this.snapshotTargetState(row);
    row.status = KpiTargetStatus.ARCHIVED;
    row.assignedBy = actorId ?? null;
    const saved = await this.targetRepo.save(row);
    await this.writeAuditLog({
      organizationId: row.organizationId,
      actorId,
      action: 'kpi_target.archived',
      entityId: row.id,
      oldValues: before,
      newValues: this.snapshotTargetState(saved),
    });
    return saved;
  }

  async upsertSnapshot(
    targetId: string,
    snapshot: Partial<KpiTargetSnapshot>,
  ): Promise<KpiTargetSnapshot> {
    const existing = await this.snapshotRepo.findOne({ where: { targetId } });
    const entity =
      existing ??
      this.snapshotRepo.create({
        targetId,
      });
    Object.assign(entity, snapshot);
    return this.snapshotRepo.save(entity);
  }

  async resolveEffectiveTarget(
    userId: string,
    projectId: string | null,
    orgId: string,
    refDate?: Date,
  ): Promise<KpiTarget | null> {
    const roleContext = await this.loadRoleContext(userId, orgId);
    const rows = await this.targetRepo.find({
      where: {
        organizationId: orgId,
        status: KpiTargetStatus.ACTIVE,
      },
      order: { updatedAt: 'DESC' },
    });

    const applicable = rows.filter((row) => {
      if (refDate && !this.isRefDateInsideTarget(row, refDate)) return false;
      if (projectId) {
        if (row.projectId && row.projectId !== projectId) return false;
      } else if (row.projectId) {
        return false;
      }
      return this.isTargetApplicableToUser(row, userId, roleContext);
    });

    const projectRows = applicable.filter((row) => row.projectId === projectId);
    const orgRows = applicable.filter((row) => !row.projectId);
    return this.pickHighestPrecedence([...projectRows, ...orgRows]);
  }

  private validatePeriod(start: string, end: string) {
    if (new Date(start) > new Date(end)) {
      throw new ValidationException(ErrorCode.KPT001);
    }
  }

  private validateScopeRequest(dto: UpsertKpiTargetRequest) {
    switch (dto.scopeType) {
      case KpiTargetScopeType.USER:
        if (!dto.userIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'userIds is required when scopeType = USER',
          );
        }
        if (dto.roleIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'roleIds is not allowed when scopeType = USER',
          );
        }
        return;
      case KpiTargetScopeType.ROLE:
        if (!dto.roleIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'roleIds is required when scopeType = ROLE',
          );
        }
        if (dto.projectId) {
          throw new ValidationException(
            ErrorCode.V000,
            'projectId is not allowed when scopeType = ROLE',
          );
        }
        if (dto.userIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'userIds is not allowed when scopeType = ROLE',
          );
        }
        return;
      case KpiTargetScopeType.PROJECT_ROLE:
        if (!dto.roleIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'roleIds is required when scopeType = PROJECT_ROLE',
          );
        }
        if (!dto.projectId) {
          throw new ValidationException(
            ErrorCode.V000,
            'projectId is required when scopeType = PROJECT_ROLE',
          );
        }
        if (dto.userIds?.length) {
          throw new ValidationException(
            ErrorCode.V000,
            'userIds is not allowed when scopeType = PROJECT_ROLE',
          );
        }
        return;
      default:
        throw new ValidationException(ErrorCode.V000, 'Unsupported scopeType');
    }
  }

  private async assertRolesExist(orgId: string, dto: UpsertKpiTargetRequest) {
    if (!dto.roleIds?.length) return;

    const where: FindOptionsWhere<Role> =
      dto.scopeType === KpiTargetScopeType.PROJECT_ROLE
        ? {
            id: In(dto.roleIds),
            organizationId: orgId,
            projectId: dto.projectId ?? undefined,
          }
        : {
            id: In(dto.roleIds),
            organizationId: orgId,
            projectId: IsNull(),
          };

    const roles = await this.roleRepo.find({ where });
    if (roles.length !== dto.roleIds.length) {
      throw new ValidationException(ErrorCode.R001, 'One or more roles not found');
    }
  }

  private expandTargetRefs(
    dto: UpsertKpiTargetRequest,
  ): Array<{ userId?: string; roleId?: string }> {
    if (dto.scopeType === KpiTargetScopeType.USER) {
      return (dto.userIds ?? []).map((userId) => ({ userId }));
    }
    return (dto.roleIds ?? []).map((roleId) => ({ roleId }));
  }

  private async findActiveTargetByKey(params: {
    organizationId: string;
    projectId: string | null;
    scopeType: KpiTargetScopeType;
    userId: string | null;
    roleId: string | null;
    period: KpiTargetPeriod;
    periodStart: Date;
  }): Promise<KpiTarget | null> {
    const where: FindOptionsWhere<KpiTarget> = {
      organizationId: params.organizationId,
      projectId: params.projectId ?? IsNull(),
      scopeType: params.scopeType,
      period: params.period,
      periodStart: params.periodStart,
    } as FindOptionsWhere<KpiTarget>;

    if (params.scopeType === KpiTargetScopeType.USER) {
      where.userId = params.userId ?? IsNull();
    } else {
      where.roleId = params.roleId ?? IsNull();
    }

    return this.targetRepo.findOne({ where });
  }

  private applyUpsertPayload(
    row: KpiTarget,
    dto: UpsertKpiTargetRequest,
    actorId: string,
  ) {
    Object.assign(row, {
      projectId: dto.projectId ?? null,
      scopeType: dto.scopeType,
      period: dto.period,
      periodEnd: new Date(dto.periodEnd),
      targetScore: dto.targetScore ?? row.targetScore,
      targetPointCompletionRate:
        dto.targetPointCompletionRate ?? row.targetPointCompletionRate,
      targetOnTimeRate: dto.targetOnTimeRate ?? row.targetOnTimeRate,
      targetOtHours: dto.targetOtHours ?? row.targetOtHours,
      targetCompletedTasks:
        dto.targetCompletedTasks ?? row.targetCompletedTasks,
      maxOverdueTasks: dto.maxOverdueTasks ?? row.maxOverdueTasks,
      requireZeroOverdue:
        dto.requireZeroOverdue ?? row.requireZeroOverdue ?? false,
      status: dto.status ?? row.status ?? KpiTargetStatus.ACTIVE,
      note: dto.note ?? row.note,
      assignedBy: actorId,
      deletedAt: null,
      deletedBy: null,
    });
  }

  private async toResponses(rows: KpiTarget[]): Promise<KpiTargetResponse[]> {
    const snapshotMap = await this.loadSnapshotMap(rows.map((row) => row.id));
    return rows.map((row) => this.toResponse(row, snapshotMap.get(row.id)));
  }

  private toResponse(
    row: KpiTarget,
    snapshot?: KpiTargetSnapshot | null,
    resolvedFrom?: KpiTargetResolvedFromResponse,
  ): KpiTargetResponse {
    return {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId ?? null,
      scopeType: row.scopeType,
      userId: row.userId ?? null,
      roleId: row.roleId ?? null,
      period: row.period,
      periodStart: this.toDateStr(row.periodStart),
      periodEnd: this.toDateStr(row.periodEnd),
      targetScore: row.targetScore != null ? +row.targetScore : undefined,
      targetPointCompletionRate:
        row.targetPointCompletionRate != null
          ? +row.targetPointCompletionRate
          : undefined,
      targetOnTimeRate:
        row.targetOnTimeRate != null ? +row.targetOnTimeRate : undefined,
      targetOtHours:
        row.targetOtHours != null ? +row.targetOtHours : undefined,
      targetCompletedTasks: row.targetCompletedTasks ?? undefined,
      maxOverdueTasks: row.maxOverdueTasks ?? undefined,
      requireZeroOverdue: row.requireZeroOverdue,
      status: row.status,
      note: row.note ?? undefined,
      assignedBy: row.assignedBy ?? undefined,
      deletedAt: row.deletedAt ?? null,
      deletedBy: row.deletedBy ?? null,
      snapshot: snapshot ? this.toSnapshotResponse(snapshot) : undefined,
      resolvedFrom,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toSnapshotResponse(
    snapshot: KpiTargetSnapshot,
  ): KpiTargetSnapshotResponse {
    return {
      actualScore:
        snapshot.actualScore != null ? +snapshot.actualScore : undefined,
      actualOnTimeRate:
        snapshot.actualOnTimeRate != null
          ? +snapshot.actualOnTimeRate
          : undefined,
      actualPointCompletionRate:
        snapshot.actualPointCompletionRate != null
          ? +snapshot.actualPointCompletionRate
          : undefined,
      actualOtHours:
        snapshot.actualOtHours != null ? +snapshot.actualOtHours : undefined,
      actualCompletedTasks: snapshot.actualCompletedTasks ?? undefined,
      actualOverdueTasks: snapshot.actualOverdueTasks ?? undefined,
      actualPayload: snapshot.actualPayload ?? undefined,
      archivedAt: snapshot.archivedAt,
    };
  }

  private toResolvedFrom(row: KpiTarget): KpiTargetResolvedFromResponse {
    return {
      targetId: row.id,
      scopeType: row.scopeType,
      projectId: row.projectId ?? null,
      userId: row.userId ?? null,
      roleId: row.roleId ?? null,
    };
  }

  private async loadSnapshotMap(targetIds: string[]) {
    if (!targetIds.length) return new Map<string, KpiTargetSnapshot>();
    const snapshots = await this.snapshotRepo.find({
      where: { targetId: In(targetIds) },
    });
    return new Map(snapshots.map((snapshot) => [snapshot.targetId, snapshot]));
  }

  private toDateStr(d: Date | string): string {
    if (typeof d === 'string') return d;
    return d.toISOString().slice(0, 10);
  }

  private async loadRoleContext(
    userId: string,
    orgId: string,
  ): Promise<RoleContext> {
    const roles = await this.userRoleRepo.find({
      where: { userId, organizationId: orgId },
    });
    const orgRoleIds = new Set<string>();
    const projectRoleIdsByProject = new Map<string, Set<string>>();

    for (const role of roles) {
      if (role.scopeType === ScopeType.ORGANIZATION) {
        orgRoleIds.add(role.roleId);
        continue;
      }

      if (role.scopeType === ScopeType.PROJECT && role.scopeId) {
        const set =
          projectRoleIdsByProject.get(role.scopeId) ?? new Set<string>();
        set.add(role.roleId);
        projectRoleIdsByProject.set(role.scopeId, set);
      }
    }

    return { orgRoleIds, projectRoleIdsByProject };
  }

  private isTargetApplicableToUser(
    row: KpiTarget,
    userId: string,
    roleContext: RoleContext,
  ): boolean {
    switch (row.scopeType) {
      case KpiTargetScopeType.USER:
        return row.userId === userId;
      case KpiTargetScopeType.ROLE:
        return !!row.roleId && roleContext.orgRoleIds.has(row.roleId);
      case KpiTargetScopeType.PROJECT_ROLE: {
        if (!row.roleId || !row.projectId) return false;
        return (
          roleContext.projectRoleIdsByProject.get(row.projectId)?.has(row.roleId) ??
          false
        );
      }
      default:
        return false;
    }
  }

  private selectEffectiveTargets(rows: KpiTarget[]): KpiTarget[] {
    const byBucket = new Map<string, KpiTarget>();
    for (const row of rows) {
      const bucket = [
        row.projectId ?? 'ORG',
        row.period,
        this.toDateStr(row.periodStart),
      ].join(':');
      const current = byBucket.get(bucket);
      if (!current || this.comparePrecedence(row, current) < 0) {
        byBucket.set(bucket, row);
      }
    }
    return [...byBucket.values()].sort((a, b) => {
      if (a.periodStart > b.periodStart) return -1;
      if (a.periodStart < b.periodStart) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  private pickHighestPrecedence(rows: KpiTarget[]): KpiTarget | null {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => this.comparePrecedence(a, b))[0];
  }

  private comparePrecedence(a: KpiTarget, b: KpiTarget): number {
    const scoreA = this.getPrecedenceScore(a);
    const scoreB = this.getPrecedenceScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }

  private getPrecedenceScore(row: KpiTarget): number {
    if (row.projectId && row.scopeType === KpiTargetScopeType.USER) return 400;
    if (row.projectId && row.scopeType === KpiTargetScopeType.PROJECT_ROLE)
      return 300;
    if (!row.projectId && row.scopeType === KpiTargetScopeType.USER) return 200;
    if (!row.projectId && row.scopeType === KpiTargetScopeType.ROLE) return 100;
    return 0;
  }

  private isRefDateInsideTarget(row: KpiTarget, refDate: Date): boolean {
    const ref = refDate.toISOString().slice(0, 10);
    return (
      this.toDateStr(row.periodStart) <= ref && this.toDateStr(row.periodEnd) >= ref
    );
  }

  private snapshotTargetState(row: KpiTarget): Record<string, unknown> {
    return {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId ?? null,
      scopeType: row.scopeType,
      userId: row.userId ?? null,
      roleId: row.roleId ?? null,
      period: row.period,
      periodStart: this.toDateStr(row.periodStart),
      periodEnd: this.toDateStr(row.periodEnd),
      targetScore: row.targetScore != null ? +row.targetScore : null,
      targetPointCompletionRate:
        row.targetPointCompletionRate != null
          ? +row.targetPointCompletionRate
          : null,
      targetOnTimeRate:
        row.targetOnTimeRate != null ? +row.targetOnTimeRate : null,
      targetOtHours: row.targetOtHours != null ? +row.targetOtHours : null,
      targetCompletedTasks: row.targetCompletedTasks ?? null,
      maxOverdueTasks: row.maxOverdueTasks ?? null,
      requireZeroOverdue: row.requireZeroOverdue,
      status: row.status,
      note: row.note ?? null,
      assignedBy: row.assignedBy ?? null,
      deletedAt: row.deletedAt ?? null,
      deletedBy: row.deletedBy ?? null,
      updatedAt: row.updatedAt,
    };
  }

  private async writeAuditLog(params: {
    organizationId: string;
    actorId: string | null;
    action: string;
    entityId: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }) {
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        organizationId: params.organizationId,
        userId: params.actorId,
        action: params.action,
        entityType: 'kpi_target',
        entityId: params.entityId,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
      }),
    );
  }

  private emitAssignedEvent(
    row: KpiTarget,
    actorId: string,
    changeType: 'created' | 'updated' | 'cloned',
  ) {
    const event: KpiTargetAssignedEvent = {
      targetId: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId ?? null,
      scopeType: row.scopeType,
      userId: row.userId ?? null,
      roleId: row.roleId ?? null,
      actorUserId: actorId,
      changeType,
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(KPI_TARGET_EVENTS.ASSIGNED, event);
  }

  private async assertCanManage(
    orgId: string,
    userId: string,
    projectId: string | null,
  ) {
    const hasOrg = await this.hasPermission(
      userId,
      orgId,
      null,
      PERMISSIONS.ANALYTICS.KPI.TARGET_MANAGE,
    );
    if (hasOrg) return;

    if (projectId) {
      const hasProj = await this.hasPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.ANALYTICS.KPI.TARGET_MANAGE,
      );
      if (hasProj) return;

      const member = await this.projectMemberRepo.findOne({
        where: { projectId, organizationId: orgId, userId },
      });
      if (member?.roleId) {
        const hasViewProj = await this.hasPermission(
          userId,
          orgId,
          projectId,
          PERMISSIONS.ANALYTICS.KPI.VIEW_PROJECT,
        );
        if (hasViewProj) return;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to manage KPI targets',
    );
  }

  private async assertCanView(
    orgId: string,
    userId: string,
    projectId: string | null,
  ) {
    const canManage = await this.hasPermission(
      userId,
      orgId,
      null,
      PERMISSIONS.ANALYTICS.KPI.TARGET_MANAGE,
    );
    if (canManage) return;

    const canView = await this.hasPermission(
      userId,
      orgId,
      null,
      PERMISSIONS.ANALYTICS.KPI.TARGET_VIEW,
    );
    if (canView) return;

    if (projectId) {
      const canViewProj = await this.hasPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.ANALYTICS.KPI.VIEW_PROJECT,
      );
      if (canViewProj) return;
    }

    throw new ForbiddenException(
      'You do not have permission to view KPI targets',
    );
  }

  private async hasPermission(
    userId: string,
    orgId: string,
    projectId: string | null,
    code: string,
  ): Promise<boolean> {
    const perm = await this.permissionRepo.findOne({ where: { code } });
    if (!perm) return false;

    const qb = this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(RolePermission, 'rp', 'rp.role_id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('rp.permission_id = :permId', { permId: perm.id });

    if (projectId) {
      qb.andWhere(
        '(ur.scope_type = :org OR (ur.scope_type = :project AND ur.scope_id = :projectId))',
        {
          org: ScopeType.ORGANIZATION,
          project: ScopeType.PROJECT,
          projectId,
        },
      );
    } else {
      qb.andWhere('ur.scope_type = :org', { org: ScopeType.ORGANIZATION });
    }

    const row = await qb.getOne();
    return !!row;
  }
}
