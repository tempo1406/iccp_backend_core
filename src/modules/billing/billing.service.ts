import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Transactional } from 'typeorm-transactional';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { SubscriptionPlanResponse } from './dto/response/subscription-plan.response';
import { CacheService } from '@modules/cache/cache.service';
import { BILLING_CACHE, BILLING_CACHE_TTL } from '@modules/cache/constants/billing-cache.constant';
import { SubscriptionResponse } from './dto/response/subscription.response';
import { SubscriptionDetailResponse } from './dto/response/subscription-detail.response';
import { InvoiceResponse } from './dto/response/invoice.response';
import { CreatePlanRequest } from './dto/request/create-plan.request';
import { UpdatePlanRequest } from './dto/request/update-plan.request';
import {
  QueryPlanRequest,
  PLAN_SORT_FIELDS,
} from './dto/request/query-plan.request';
import {
  QuerySubscriptionRequest,
  SUBSCRIPTION_SORT_FIELDS,
} from './dto/request/query-subscription.request';
import {
  QueryInvoiceRequest,
  INVOICE_SORT_FIELDS,
} from './dto/request/query-invoice.request';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { In } from 'typeorm';
import { OrganizationPlanSyncService } from './services/organization-plan-sync.service';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    private readonly cacheService: CacheService,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private readonly organizationPlanSyncService: OrganizationPlanSyncService,
  ) {}

  // ========================
  // Public
  // ========================

  async getAllPlans(): Promise<SubscriptionPlanResponse[]> {
    const cached = await this.cacheService.get<SubscriptionPlanResponse[]>(BILLING_CACHE.PLANS);
    if (cached) return cached;

    const plans = await this.planRepository.find({
      order: { priceMonthly: 'ASC' },
      where: { isActive: true },
    });
    const result = plainToInstance(SubscriptionPlanResponse, plans);

    await this.cacheService.set(BILLING_CACHE.PLANS, result, BILLING_CACHE_TTL);
    return result;
  }

  async invalidatePlansCache(): Promise<void> {
    await this.cacheService.del(BILLING_CACHE.PLANS);
  }

  // ========================
  // Admin — Plans CRUD
  // ========================

  @Transactional()
  async createPlan(dto: CreatePlanRequest): Promise<SubscriptionPlanResponse> {
    const existing = await this.planRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Plan with code '${dto.code}' already exists`,
      );
    }

    const plan = this.planRepository.create(dto);
    const saved = await this.planRepository.save(plan);
    return plainToInstance(SubscriptionPlanResponse, saved);
  }

  async getPlansAdmin(
    query: QueryPlanRequest,
  ): Promise<PaginatedResponse<SubscriptionPlanResponse>> {
    const qb = this.planRepository.createQueryBuilder('plan');

    if (query.search) {
      qb.andWhere('(plan.name ILIKE :search OR plan.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('plan.is_active = :isActive', { isActive: query.isActive });
    }

    PaginationHelper.applyToQueryBuilder(qb, query, PLAN_SORT_FIELDS, 'plan');

    const [items, total] = await qb.getManyAndCount();
    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(
      plainToInstance(SubscriptionPlanResponse, items),
      meta,
    );
  }

  async getPlanById(id: string): Promise<SubscriptionPlanResponse> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id '${id}' not found`);
    }
    return plainToInstance(SubscriptionPlanResponse, plan);
  }

  @Transactional()
  async updatePlan(
    id: string,
    dto: UpdatePlanRequest,
  ): Promise<SubscriptionPlanResponse> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id '${id}' not found`);
    }

    if (dto.code && dto.code !== plan.code) {
      const existing = await this.planRepository.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Plan with code '${dto.code}' already exists`,
        );
      }
    }

    Object.assign(plan, dto);
    const saved = await this.planRepository.save(plan);
    return plainToInstance(SubscriptionPlanResponse, saved);
  }

  @Transactional()
  async deactivatePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id '${id}' not found`);
    }
    if (!plan.isActive) {
      throw new ConflictException('Plan is already inactive');
    }

    plan.isActive = false;
    await this.planRepository.save(plan);
  }

  @Transactional()
  async activatePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id '${id}' not found`);
    }
    if (plan.isActive) {
      throw new ConflictException('Plan is already active');
    }

    plan.isActive = true;
    await this.planRepository.save(plan);
  }

  // ========================
  // Admin — Subscriptions
  // ========================

  async getSubscriptions(
    query: QuerySubscriptionRequest,
  ): Promise<PaginatedResponse<SubscriptionResponse>> {
    const qb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoin(Organization, 'org', 'org.id = sub.organization_id')
      .leftJoin(SubscriptionPlan, 'plan', 'plan.id = sub.plan_id')
      .addSelect('org.name', 'org_name')
      .addSelect('plan.name', 'plan_name')
      .addSelect('plan.code', 'plan_code');

    if (query.search) {
      qb.andWhere('org.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.status) {
      qb.andWhere('sub.status = :status', { status: query.status });
    }

    if (query.planId) {
      qb.andWhere('sub.plan_id = :planId', { planId: query.planId });
    }

    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      SUBSCRIPTION_SORT_FIELDS,
      'sub',
    );

    const total = await qb.getCount();
    const { entities, raw } = await qb.getRawAndEntities();

    const data = entities.map((entity, index) => {
      const rawRow = raw[index];
      return plainToInstance(SubscriptionResponse, {
        ...entity,
        organizationName: rawRow.org_name,
        planName: rawRow.plan_name,
        planCode: rawRow.plan_code,
      });
    });

    const meta = PaginationHelper.buildMeta(total, query);
    return new PaginatedResponse(data, meta);
  }

  // ========================
  // Org-facing
  // ========================

  async getMySubscription(
    orgId: string,
  ): Promise<SubscriptionDetailResponse | null> {
    const qb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoinAndMapOne(
        'sub.plan',
        SubscriptionPlan,
        'plan',
        'plan.id = sub.plan_id',
      )
      .leftJoinAndMapOne(
        'sub.organization',
        Organization,
        'org',
        'org.id = sub.organization_id',
      )
      .where('sub.organization_id = :orgId', { orgId })
      .andWhere('sub.status IN (:...statuses)', {
        statuses: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ],
      })
      .orderBy('sub.created_at', 'DESC');

    const subscription = await qb.getOne();
    if (!subscription) return null;

    return plainToInstance(SubscriptionDetailResponse, subscription);
  }

  async getMyInvoices(
    orgId: string,
    query: QueryInvoiceRequest,
  ): Promise<PaginatedResponse<InvoiceResponse>> {
    const qb = this.invoiceRepository
      .createQueryBuilder('inv')
      .where('inv.organization_id = :orgId', { orgId });

    if (query.status) {
      qb.andWhere('inv.status = :status', { status: query.status });
    }

    PaginationHelper.applyToQueryBuilder(qb, query, INVOICE_SORT_FIELDS, 'inv');

    const [items, total] = await qb.getManyAndCount();
    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(plainToInstance(InvoiceResponse, items), meta);
  }

  @Transactional()
  async cancelMySubscription(orgId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        organizationId: orgId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ]),
      },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepository.save(subscription);
    await this.invoiceRepository.update(
      {
        organizationId: orgId,
        subscriptionId: subscription.id,
        status: InvoiceStatus.PENDING,
      },
      {
        status: InvoiceStatus.CANCELLED,
      },
    );
    await this.restoreFreePlan(orgId);
  }

  async getSubscriptionById(id: string): Promise<SubscriptionDetailResponse> {
    const qb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoinAndMapOne(
        'sub.plan',
        SubscriptionPlan,
        'plan',
        'plan.id = sub.plan_id',
      )
      .leftJoinAndMapOne(
        'sub.organization',
        Organization,
        'org',
        'org.id = sub.organization_id',
      )
      .where('sub.id = :id', { id });

    const subscription = await qb.getOne();
    if (!subscription) {
      throw new NotFoundException(`Subscription with id '${id}' not found`);
    }

    return plainToInstance(SubscriptionDetailResponse, subscription);
  }

  private async restoreFreePlan(orgId: string): Promise<void> {
    const hasCurrentSubscription = await this.subscriptionRepository.findOne({
      where: {
        organizationId: orgId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PENDING_PAYMENT,
        ]),
      },
    });
    if (hasCurrentSubscription) return;

    const freePlan = await this.planRepository.findOne({
      where: { code: 'free', isActive: true },
    });
    if (!freePlan) return;

    const freeSubscription = this.subscriptionRepository.create({
      organizationId: orgId,
      planId: freePlan.id,
      status: SubscriptionStatus.ACTIVE,
    });
    await this.subscriptionRepository.save(freeSubscription);
    await this.organizationPlanSyncService.syncPlan(orgId, freePlan.id);
  }
}
