import {
  Injectable,
  ConflictException,
  ForbiddenException,
  ConsoleLogger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

import { AllConfigType } from '@configs/config.type';
import { Organization } from '../core/entities/organization.entity';
import { OrganizationMember } from '../core/entities/organization-member.entity';
import {
  OrganizationInvitation,
  InvitationStatus,
} from '../core/entities/organization-invitation.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';

import { CreateOrganizationRequest } from './dto/request/create-organization.request';
import { InviteMembersRequest } from './dto/request/invite-members.request';
import { OrganizationResponse } from './dto/response/organization.response';
import { OrganizationInvitationResponse } from './dto/response/organization-invitation.response';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { AcceptJoinRequest } from './dto/request/accept-join.request';
import { defaultRoleOfOrg } from '../constants/role.constant';
import {
  INVITATION_EVENTS,
  InvitationSentEvent,
} from '../invite-manager/constants/invitation-events.constant';
import {
  OrganizationCreatedDomainEvent,
  OrganizationMemberJoinedDomainEvent,
  ORGANIZATION_DOMAIN_EVENTS,
} from './constants/organization-domain-events.constant';

@Injectable()
export class OrganizationCoreService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepo: Repository<OrganizationInvitation>,

    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,

    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly dataSource: DataSource,

    private readonly configService: ConfigService<AllConfigType>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Tạo Organization mới, gán Owner vào member table, tạo Subscription
  async create(
    userId: string,
    dto: CreateOrganizationRequest,
  ): Promise<OrganizationResponse> {
    try {
      const existingSlug = await this.orgRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existingSlug) {
        throw new ValidationException(ErrorCode.O002);
      }

      const freePlan = await this.planRepo.findOne({
        where: { code: 'free', isActive: true },
      });
      if (!freePlan) {
        throw new ValidationException(ErrorCode.O009);
      }

      if (dto.subscriptionPlanId && dto.subscriptionPlanId !== freePlan.id) {
        const requestedPlan = await this.planRepo.findOne({
          where: { id: dto.subscriptionPlanId, isActive: true },
        });
        if (!requestedPlan) {
          throw new ValidationException(ErrorCode.O009);
        }

        throw new ValidationException(
          ErrorCode.O010,
          'Paid plans must be purchased via payment.',
        );
      }

      const createdOrg = await this.dataSource.transaction(async (manager) => {
        // 1. Tạo Organization
        const org = manager.create(Organization, {
          name: dto.name,
          slug: dto.slug,
          ownerId: userId,
          description: dto.description,
          logoUrl: dto.logoUrl,
          industry: dto.industry,
          size: dto.size,
          subscriptionPlanId: freePlan.id,
          isActive: true,
        });
        const savedOrg = await manager.save(org);

        // 2. Thêm Owner vào OrganizationMember
        const ownerMember = manager.create(OrganizationMember, {
          organizationId: savedOrg.id,
          userId,
          isActive: true,
          isOwner: true,
        });
        await manager.save(ownerMember);

        // 3. Gán role OWNER trong RBAC (system role 'owner')
        const ownerRole = await manager.findOne(Role, {
          where: { name: SYSTEM_ROLES.ORG_ADMIN, isSystemRole: true },
        });
        if (ownerRole) {
          const userRole = manager.create(UserRole, {
            userId,
            organizationId: savedOrg.id,
            roleId: ownerRole.id,
            scopeType: ScopeType.ORGANIZATION,
            assignedBy: userId,
          });
          await manager.save(userRole);
        }

        const subscription = manager.create(Subscription, {
          organizationId: savedOrg.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: undefined,
          startDate: undefined,
          endDate: undefined,
        });
        await manager.save(subscription);

        return savedOrg;
      });

      const createdEvent: OrganizationCreatedDomainEvent = {
        organizationId: createdOrg.id,
        ownerUserId: userId,
        occurredAt: new Date().toISOString(),
      };
      this.eventEmitter.emit(
        ORGANIZATION_DOMAIN_EVENTS.ORGANIZATION_CREATED,
        createdEvent,
      );

      return plainToInstance(OrganizationResponse, createdOrg);
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  async getOrganizationById(orgId: string): Promise<OrganizationResponse> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: orgId, isActive: true },
      });
      if (!org) {
        throw new ValidationException(ErrorCode.O001);
      }
      return plainToInstance(OrganizationResponse, org);
    } catch (error) {
      console.error('Error getting organization by id:', error);
      throw error;
    }
  }

  // Lấy danh sách Organization mà userId tham gia
  async getMyOrgs(userId: string): Promise<OrganizationResponse[]> {
    try {
      const memberships = await this.memberRepo.find({
        where: { userId, isActive: true },
      });

      if (memberships.length === 0) return [];

      const orgIds = memberships.map((m) => m.organizationId);
      const orgs = await this.orgRepo
        .createQueryBuilder('org')
        .where('org.id IN (:...orgIds)', { orgIds })
        .andWhere('org.isActive = true')
        .getMany();

      return plainToInstance(OrganizationResponse, orgs);
    } catch (error) {
      console.error('Error getting my organizations:', error);
      throw error;
    }
  }

  // Mời members vào Organization (tạo invitation, sau đó họ tự accept)
  async inviteMembers(
    invitedBy: string,
    orgId: string,
    dto: InviteMembersRequest,
  ): Promise<OrganizationInvitationResponse[]> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: orgId, isActive: true },
      });
      if (!org) {
        throw new ValidationException(ErrorCode.O001);
      }

      const expiredAt = new Date();
      // Token hết hạn sau 7 ngày
      expiredAt.setDate(expiredAt.getDate() + 7);

      const results: OrganizationInvitationResponse[] = [];

      for (const email of dto.emails) {
        // Nếu đã có invitation PENDING → trả về luôn, không tạo mới
        const existing = await this.invitationRepo.findOne({
          where: {
            organizationId: orgId,
            email,
            status: InvitationStatus.PENDING,
          },
        });
        if (existing) {
          results.push(
            plainToInstance(OrganizationInvitationResponse, existing),
          );
          continue;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const invitation = this.invitationRepo.create({
          organizationId: orgId,
          email,
          invitedBy,
          token,
          status: InvitationStatus.PENDING,
          expiresAt: expiredAt,
          message: dto.message,
        });
        const saved = await this.invitationRepo.save(invitation);
        results.push(plainToInstance(OrganizationInvitationResponse, saved));

        // Emit event — email + in-app notification handled by InvitationNotificationListener
        const appConfig = this.configService.get('app', { infer: true })!;
        const acceptUrl = `${appConfig.frontendDomain}/invitations/accept?token=${token}`;
        this.eventEmitter.emit(INVITATION_EVENTS.SENT, {
          invitationId: saved.id,
          email,
          orgId: org.id,
          orgName: org.name,
          invitedBy,
          token,
          expiresAt: expiredAt,
          acceptUrl,
          message: saved.message,
        } satisfies InvitationSentEvent);
      }

      return results;
    } catch (error) {
      console.error('Error inviting members:', error);
      throw error;
    }
  }

  // Accept invitation: ghi vào organization_members với thông tin invitation
  async acceptInvitation(
    userId: string,
    dto: AcceptJoinRequest,
  ): Promise<void> {
    try {
      const invitation = await this.invitationRepo.findOne({
        where: { token: dto.token },
      });
      if (!invitation) {
        throw new ValidationException(ErrorCode.O004);
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new ValidationException(ErrorCode.O008);
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationRepo.save(invitation);
        throw new ForbiddenException('Invitation has expired');
      }

      const alreadyMember = await this.memberRepo.findOne({
        where: {
          organizationId: invitation.organizationId,
          userId,
          isActive: true,
        },
      });
      if (alreadyMember) {
        throw new ConflictException(ErrorCode.O006);
      }
      console.log('123133');
      const now = new Date();

      await this.dataSource.transaction(async (manager) => {
        // Thêm vào organization_members với đầy đủ thông tin invitation
        const member = manager.create(OrganizationMember, {
          organizationId: invitation.organizationId,
          userId,
          invitedBy: invitation.invitedBy,
          invitationToken: invitation.token,
          invitationAcceptedAt: now,
          isActive: true,
        });
        await manager.save(member);

        // Gán system role USER cho member mới (org-scoped assignment)
        // defaultRoleOfOrg là default role cho mọi member tham gia tổ chức qua invitation
        const memberRole = await manager.findOne(Role, {
          where: {
            name: defaultRoleOfOrg.name,
            isSystemRole: false,
            organizationId: invitation.organizationId,
          },
        });

        if (memberRole) {
          const userRole = manager.create(UserRole, {
            userId,
            organizationId: invitation.organizationId,
            roleId: memberRole.id,
            scopeType: ScopeType.ORGANIZATION,
            assignedBy: invitation.invitedBy,
          });
          await manager.save(userRole);
        }

        // Cập nhật trạng thái invitation
        invitation.status = InvitationStatus.ACCEPTED;
        invitation.acceptedAt = now;
        await manager.save(invitation);
      });

      const memberJoinedEvent: OrganizationMemberJoinedDomainEvent = {
        organizationId: invitation.organizationId,
        userId,
        invitedBy: invitation.invitedBy,
        occurredAt: now.toISOString(),
      };
      this.eventEmitter.emit(
        ORGANIZATION_DOMAIN_EVENTS.MEMBER_JOINED,
        memberJoinedEvent,
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }
}
