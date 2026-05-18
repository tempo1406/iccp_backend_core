// import { Organization } from '@modules/organization/core/entities/organization.entity';
// import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
// import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
// import { Project, ProjectPriority, ProjectStatus } from '@modules/project/core/entities/project.entity';
// import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
// import { Role } from '@modules/rbac/entities/role.entity';
// import { ScopeType, UserRole } from '@modules/rbac/entities/user-role.entity';
// import { Task, TaskPriority, TaskStatus } from '@modules/project/task-management/entities/task.entity';
// import { User } from '@modules/users/entities/user.entity';
// import { hashString } from '@utils/auth';
// import { Repository } from 'typeorm';
// import { DataSource } from 'typeorm';

// const DEMO_ORG_SLUG = 'demo-org';
// const DEMO_PROJECT_CODE = 'DEMO-PM';
// const DEMO_MEMBER_EMAIL = 'member@iccp.com';

// export async function seedProjectTasks(dataSource: DataSource): Promise<void> {
//   const userRepo = dataSource.getRepository(User);
//   const orgRepo = dataSource.getRepository(Organization);
//   const memberRepo = dataSource.getRepository(OrganizationMember);
//   const projectRepo = dataSource.getRepository(Project);
//   const taskRepo = dataSource.getRepository(Task);
//   const projectMemberRepo = dataSource.getRepository(ProjectMember);
//   const roleRepo = dataSource.getRepository(Role);
//   const userRoleRepo = dataSource.getRepository(UserRole);

//   const admin = await userRepo.findOne({
//     where: { email: 'admin@iccp.com' },
//   });

//   if (!admin) {
//     console.log('Admin user not found, skipping project/task seed.');
//     return;
//   }

//   const [organization, memberUser] = await Promise.all([
//     ensureDemoOrganization(orgRepo, admin.id),
//     ensureDemoMember(userRepo),
//   ]);

//   await ensureOrgMember(memberRepo, organization.id, admin.id, true);
//   await ensureOrgMember(memberRepo, organization.id, memberUser.id, false, admin.id);
//   await ensureOrgUserRole(
//     roleRepo,
//     userRoleRepo,
//     organization.id,
//     memberUser.id,
//     admin.id,
//   );

//   const project = await ensureDemoProject(projectRepo, organization.id, admin.id);
//   await ensureProjectMember(projectMemberRepo, project.id, organization.id, admin.id);
//   await ensureProjectMember(
//     projectMemberRepo,
//     project.id,
//     organization.id,
//     memberUser.id,
//   );
//   await ensureDemoTasks(taskRepo, project.id, organization.id, admin.id, memberUser.id);
// }

// async function ensureDemoOrganization(
//   orgRepo: Repository<Organization>,
//   adminId: string,
// ): Promise<Organization> {
//   const existing = await orgRepo.findOne({
//     where: { slug: DEMO_ORG_SLUG },
//   });

//   if (existing) return existing;

//   const created = orgRepo.create({
//     name: 'Demo Organization',
//     slug: DEMO_ORG_SLUG,
//     ownerId: adminId,
//     description: 'Demo organization for Postman testing',
//     industry: 'Technology',
//     size: 'small',
//     isActive: true,
//   });

//   return orgRepo.save(created);
// }

// async function ensureDemoMember(
//   userRepo: Repository<User>,
// ): Promise<User> {
//   const existing = await userRepo.findOne({
//     where: { email: DEMO_MEMBER_EMAIL },
//   });

//   if (existing) return existing;

//   const user = userRepo.create({
//     email: DEMO_MEMBER_EMAIL,
//     passwordHash: await hashString('Member@123456'),
//     firstName: 'Demo',
//     lastName: 'Member',
//     provider: 'local',
//     isActive: true,
//     isVerified: true,
//     emailVerifiedAt: new Date(),
//   });

//   return userRepo.save(user);
// }

// async function ensureOrgMember(
//   memberRepo: Repository<OrganizationMember>,
//   organizationId: string,
//   userId: string,
//   isOwner: boolean,
//   invitedBy?: string,
// ): Promise<void> {
//   const existing = await memberRepo.findOne({
//     where: { organizationId, userId },
//   });

//   if (existing) {
//     if (!existing.isActive || existing.isDeleted) {
//       existing.isActive = true;
//       existing.isDeleted = false;
//       existing.leftAt = undefined;
//       await memberRepo.save(existing);
//     }
//     return;
//   }

//   const member = memberRepo.create({
//     organizationId,
//     userId,
//     invitedBy,
//     isActive: true,
//     isOwner,
//     isDeleted: false,
//   });

//   await memberRepo.save(member);
// }

// async function ensureDemoProject(
//   projectRepo: Repository<Project>,
//   organizationId: string,
//   adminId: string,
// ): Promise<Project> {
//   const existing = await projectRepo.findOne({
//     where: { organizationId, code: DEMO_PROJECT_CODE },
//   });

//   if (existing) return existing;

//   const project = projectRepo.create({
//     organizationId,
//     name: 'Demo Project Management',
//     description: 'Sample project for testing CRUD APIs in Postman',
//     code: DEMO_PROJECT_CODE,
//     status: ProjectStatus.ACTIVE,
//     priority: ProjectPriority.MEDIUM,
//     managerId: adminId,
//     createdBy: adminId,
//     progress: 25,
//     isActive: true,
//   });

//   return projectRepo.save(project);
// }

// async function ensureDemoTasks(
//   taskRepo: Repository<Task>,
//   projectId: string,
//   organizationId: string,
//   adminId: string,
//   memberId: string,
// ): Promise<void> {
//   const existingTasks = await taskRepo.find({
//     where: { projectId, organizationId },
//   });

//   if (existingTasks.length > 0) {
//     console.log(
//       `Project tasks already seeded (${existingTasks.length} found), skipping...`,
//     );
//     return;
//   }

//   const tasks = taskRepo.create([
//     {
//       projectId,
//       organizationId,
//       title: 'Setup project scope and milestones',
//       description: 'Define sprint milestones and API delivery scope',
//       status: TaskStatus.IN_PROGRESS,
//       priority: TaskPriority.HIGH,
//       assignedTo: adminId,
//       createdBy: adminId,
//       startedAt: new Date(),
//     },
//     {
//       projectId,
//       organizationId,
//       title: 'Implement Project CRUD APIs',
//       description: 'Create/Read/Update/Delete endpoints for projects',
//       status: TaskStatus.TODO,
//       priority: TaskPriority.URGENT,
//       assignedTo: adminId,
//       createdBy: adminId,
//     },
//     {
//       projectId,
//       organizationId,
//       title: 'Prepare Postman collection',
//       description: 'Export sample requests for QA and FE teams',
//       status: TaskStatus.REVIEW,
//       priority: TaskPriority.MEDIUM,
//       assignedTo: memberId,
//       createdBy: adminId,
//     },
//   ]);

//   await taskRepo.save(tasks);
//   console.log('Seeded demo project and 3 sample tasks.');
// }

// async function ensureProjectMember(
//   projectMemberRepo: Repository<ProjectMember>,
//   projectId: string,
//   organizationId: string,
//   userId: string,
// ): Promise<void> {
//   const existing = await projectMemberRepo.findOne({
//     where: { projectId, organizationId, userId },
//   });

//   if (existing) {
//     if (!existing.isActive) {
//       existing.isActive = true;
//       await projectMemberRepo.save(existing);
//     }
//     return;
//   }

//   const member = projectMemberRepo.create({
//     projectId,
//     organizationId,
//     userId,
//     isActive: true,
//   });

//   await projectMemberRepo.save(member);
// }

// async function ensureOrgUserRole(
//   roleRepo: Repository<Role>,
//   userRoleRepo: Repository<UserRole>,
//   organizationId: string,
//   userId: string,
//   assignedBy: string,
// ): Promise<void> {
//   const role =
//     (await roleRepo.findOne({
//       where: { name: 'employee', organizationId },
//     })) ||
//     (await roleRepo.findOne({
//       where: { name: SYSTEM_ROLES.USER, isSystemRole: true },
//     }));

//   if (!role) {
//     console.log('No suitable role found for demo member role assignment.');
//     return;
//   }

//   const existing = await userRoleRepo.findOne({
//     where: {
//       userId,
//       organizationId,
//       roleId: role.id,
//       scopeType: ScopeType.ORGANIZATION,
//     },
//   });

//   if (existing) return;

//   const userRole = userRoleRepo.create({
//     userId,
//     organizationId,
//     roleId: role.id,
//     scopeType: ScopeType.ORGANIZATION,
//     assignedBy,
//   });
//   await userRoleRepo.save(userRole);
// }
