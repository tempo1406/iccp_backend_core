import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { Role } from '@modules/rbac/entities/role.entity';
import { DataSource } from 'typeorm';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Role);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`Roles already seeded (${existing} found), skipping...`);
    return;
  }

  await repo.save([
    repo.create({
      name: SYSTEM_ROLES.SYSTEM_ADMIN,
      description: 'Super admin — full system access',
      isSystemRole: true,
    }),
    repo.create({
      name: SYSTEM_ROLES.ORG_ADMIN,
      description: 'Admin template for each organization',
      isSystemRole: true,
    }),
    repo.create({
      name: SYSTEM_ROLES.USER,
      description: 'Regular user',
      isSystemRole: true,
    }),
  ]);

  console.log('Seeded 3 system roles: system_admin, org_admin, user.');
}
