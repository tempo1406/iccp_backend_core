import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PeriodicReportRecipientGroup } from '@modules/organization/settings/constants/periodic-report-settings.constant';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { Project } from '@modules/project/core/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { In, IsNull, Repository } from 'typeorm';
import { PeriodicReportRecipient } from './types/periodic-report.types';

@Injectable()
export class PeriodicReportRecipientResolver {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async resolveRecipients(
    organization: Organization,
    recipientGroups: PeriodicReportRecipientGroup[],
    customEmails: string[],
  ): Promise<PeriodicReportRecipient[]> {
    const map = new Map<string, PeriodicReportRecipient>();
    const ownerUserIds = new Set<string>();
    const orgAdminUserIds = new Set<string>();
    const projectManagerUserIds = new Set<string>();
    const ownerProjectIdsByUser = new Map<string, Set<string>>();
    const projectManagerProjectIdsByUser = new Map<string, Set<string>>();

    const addRecipient = (
      email: string,
      displayName: string,
      source: PeriodicReportRecipientGroup,
      userId?: string,
      managedProjectIds?: string[],
    ) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return;

      const existing = map.get(normalized);
      if (existing) {
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
        if (!existing.userId && userId) {
          existing.userId = userId;
        }
        if (!existing.displayName && displayName) {
          existing.displayName = displayName;
        }
        if (managedProjectIds?.length) {
          existing.managedProjectIds = [
            ...new Set([...(existing.managedProjectIds ?? []), ...managedProjectIds]),
          ];
        }
        return;
      }

      map.set(normalized, {
        email: normalized,
        displayName,
        userId,
        sources: [source],
        managedProjectIds: managedProjectIds?.length
          ? [...new Set(managedProjectIds)]
          : undefined,
      });
    };

    const userIds = new Set<string>();

    let orgAdminRole: Role | null = null;
    if (recipientGroups.includes(PeriodicReportRecipientGroup.ORG_ADMIN)) {
      orgAdminRole = await this.roleRepo.findOne({
        where: { name: SYSTEM_ROLES.ORG_ADMIN, isSystemRole: true },
      });

      if (orgAdminRole) {
        const adminAssignments = await this.userRoleRepo.find({
          where: {
            organizationId: organization.id,
            roleId: orgAdminRole.id,
            scopeType: ScopeType.ORGANIZATION,
          },
        });
        adminAssignments.forEach((item) => {
          userIds.add(item.userId);
          orgAdminUserIds.add(item.userId);
        });
      }
    }

    if (
      recipientGroups.includes(PeriodicReportRecipientGroup.OWNER) ||
      recipientGroups.includes(PeriodicReportRecipientGroup.PROJECT_MANAGER)
    ) {
      const projects = await this.projectRepo.find({
        where: {
          organizationId: organization.id,
          isActive: true,
          deletedAt: IsNull(),
        },
      });

      if (recipientGroups.includes(PeriodicReportRecipientGroup.OWNER)) {
        projects.forEach((project) => {
          if (!project.createdBy) return;
          userIds.add(project.createdBy);
          ownerUserIds.add(project.createdBy);
          const scopedProjectIds =
            ownerProjectIdsByUser.get(project.createdBy) ?? new Set<string>();
          scopedProjectIds.add(project.id);
          ownerProjectIdsByUser.set(project.createdBy, scopedProjectIds);
        });
      }

      if (recipientGroups.includes(PeriodicReportRecipientGroup.PROJECT_MANAGER)) {
        projects.forEach((project) => {
          (project.managerId ?? []).forEach((managerId) => {
            userIds.add(managerId);
            projectManagerUserIds.add(managerId);
            const scopedProjectIds =
              projectManagerProjectIdsByUser.get(managerId) ?? new Set<string>();
            scopedProjectIds.add(project.id);
            projectManagerProjectIdsByUser.set(managerId, scopedProjectIds);
          });
        });
      }
    }

    if (userIds.size > 0) {
      const users = await this.userRepo.find({
        where: {
          id: In([...userIds]),
          deletedAt: IsNull(),
        },
      });

      for (const user of users) {
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.email;

        if (ownerUserIds.has(user.id)) {
          addRecipient(
            user.email,
            fullName,
            PeriodicReportRecipientGroup.OWNER,
            user.id,
            [...(ownerProjectIdsByUser.get(user.id) ?? new Set())],
          );
        }
        if (orgAdminUserIds.has(user.id)) {
          addRecipient(
            user.email,
            fullName,
            PeriodicReportRecipientGroup.ORG_ADMIN,
            user.id,
          );
        }
        if (projectManagerUserIds.has(user.id)) {
          addRecipient(
            user.email,
            fullName,
            PeriodicReportRecipientGroup.PROJECT_MANAGER,
            user.id,
            [...(projectManagerProjectIdsByUser.get(user.id) ?? new Set())],
          );
        }
      }
    }

    if (
      recipientGroups.includes(PeriodicReportRecipientGroup.CONTACT_EMAIL) &&
      organization.contactEmail
    ) {
      addRecipient(
        organization.contactEmail,
        organization.name,
        PeriodicReportRecipientGroup.CONTACT_EMAIL,
      );
    }

    if (customEmails.length > 0) {
      const normalizedCustomEmails = [...new Set(
        customEmails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      )];

      const memberRows = await this.organizationMemberRepo.find({
        where: {
          organizationId: organization.id,
          isActive: true,
          isDeleted: false,
        },
      });

      const memberUserIds = [...new Set(memberRows.map((item) => item.userId))];
      const matchedUsers =
        memberUserIds.length > 0
          ? await this.userRepo.find({
              where: {
                id: In(memberUserIds),
                email: In(normalizedCustomEmails),
                deletedAt: IsNull(),
              },
            })
          : [];
      const matchedUserByEmail = new Map(
        matchedUsers.map((user) => [user.email.trim().toLowerCase(), user]),
      );

      normalizedCustomEmails.forEach((email) => {
        const matchedUser = matchedUserByEmail.get(email);
        const fullName =
          matchedUser
            ? [matchedUser.firstName, matchedUser.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || matchedUser.email
            : email;

        addRecipient(
          email,
          fullName,
          PeriodicReportRecipientGroup.CONTACT_EMAIL,
          matchedUser?.id,
        );
      });
    }

    return [...map.values()].sort((a, b) => a.email.localeCompare(b.email));
  }
}
