import {
  flattenPermissions,
  PERMISSIONS,
} from '@modules/rbac/constant/permission.constant';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { DataSource } from 'typeorm';

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Permission);

  const existing = await repo.count();
  if (existing > 0) {
    console.log('Permission already seeded');
    return;
  }

  const codes = flattenPermissions(PERMISSIONS);

  const permissions = codes.map((code) => {
    const modules = code.split('.')[0]; // tenant, documents, projects, users, chatbot, analytics, billing, system, rbac
    const name = code.split('.')[1]; // organizations, members, invitations, etc.
    return {
      code,
      name,
      module: modules,
      description: `Permission for ${modules} module`,
    };
  });

  await repo.insert(permissions);
  console.log(`Seeded ${permissions.length} permissions.`);
}
