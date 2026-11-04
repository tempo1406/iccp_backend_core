import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';
import { hashString } from '@utils/auth';
import { DataSource } from 'typeorm';

export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const existing = await userRepo.findOne({
    where: { email: 'admin@iccp.com' },
  });
  if (existing) {
    console.log('Admin user already exists, skipping...');
    return;
  }

  const adminRole = await roleRepo.findOne({
    where: { name: SYSTEM_ROLES.SYSTEM_ADMIN },
  });

  if (!adminRole)
    throw new Error('system_admin role not found. Run seedRoles first.');

  const admin = userRepo.create({
    email: 'admin@iccp.com',
    passwordHash: await hashString('Admin@123456'),
    firstName: 'System',
    lastName: 'Admin',
    isActive: true,
    isVerified: true,
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    dateOfBirth: new Date('2004-09-05'),
    address: 'Ho Chi Minh City, Vietnam',
    phone: '1234567890',
    provider: 'local',
  });
  await userRepo.save(admin);

  const alreadyAssigned = await userRoleRepo.findOne({
    where: { userId: admin.id, roleId: adminRole.id },
  });

  if (!alreadyAssigned) {
    const adminUserRole = userRoleRepo.create({
      userId: admin.id,
      roleId: adminRole.id,
      organizationId: null,
    });

    await userRoleRepo.save(adminUserRole);
  }

  console.log('Admin user seeded: admin@iccp.com / Admin@123456');
}
