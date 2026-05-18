import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { DataSource } from 'typeorm';
import {
  ORG_ADMIN_MODULES,
  SYSTEM_ROLES,
  USER_PERMISSIONS,
} from '@modules/rbac/constant/permission.constant';

export async function seedRolePermissions(
  dataSource: DataSource,
): Promise<void> {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rpRepo = dataSource.getRepository(RolePermission);

  const existing = await rpRepo.count();
  if (existing > 0) {
    console.log(
      `Role-permissions already seeded (${existing} found), skipping...`,
    );
    return;
  }

  const [roles, allPermissions] = await Promise.all([
    roleRepo.find(),
    permRepo.find(),
  ]);

  const findRole = (name: string) => roles.find((r) => r.name === name);
  const findPerm = (code: string) =>
    allPermissions.find((p) => p.code === code);

  const systemAdmin = findRole(SYSTEM_ROLES.SYSTEM_ADMIN);
  const orgAdmin = findRole(SYSTEM_ROLES.ORG_ADMIN);
  const user = findRole(SYSTEM_ROLES.USER);

  if (!systemAdmin || !orgAdmin || !user) {
    throw new Error(
      'System admin, org admin, or user role not found. Please run role seeding first.',
    );
  }

  const entries: RolePermission[] = [];

  // system_admin → ALL permissions
  for (const perm of allPermissions) {
    entries.push(
      rpRepo.create({ roleId: systemAdmin.id, permissionId: perm.id }),
    );
  }

  // org_admin → permissions thuộc các module cho phép
  for (const perm of allPermissions) {
    if (ORG_ADMIN_MODULES.some((m) => perm.module === m)) {
      entries.push(
        rpRepo.create({ roleId: orgAdmin.id, permissionId: perm.id }),
      );
    }
  }

  // user → subset cụ thể
  for (const code of USER_PERMISSIONS) {
    const perm = findPerm(code);
    if (perm) {
      entries.push(rpRepo.create({ roleId: user.id, permissionId: perm.id }));
    }
  }
  await rpRepo.save(entries);
  console.log(`Seeded ${entries.length} role-permission mappings.`);
}
