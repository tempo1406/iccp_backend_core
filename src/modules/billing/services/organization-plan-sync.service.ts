import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';

@Injectable()
export class OrganizationPlanSyncService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  async syncPlan(organizationId: string, planId?: string | null): Promise<void> {
    if (!planId) return;

    await this.organizationRepo.update(
      { id: organizationId },
      { subscriptionPlanId: planId },
    );
  }
}
