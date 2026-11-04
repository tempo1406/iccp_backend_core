// import AppDataSource from '@database/data-source';
// import { config } from 'dotenv';
// import * as path from 'path';
// import { seedRoles } from './role.seed';
// import { seedAdminUser } from './admin-user.seed';

// async function runSeeds() {
//   try {
//     // Load environment variables
//     const envFile = process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env';
//     config({ path: path.resolve(process.cwd(), envFile) });

//     console.log('Starting database seeding...');

//     // Initialize data source
//     await AppDataSource.initialize();
//     console.log('Database connected successfully');

//     // Run role seeding first
//     console.log('Seeding roles...');
//     await seedRoles(AppDataSource);

//     // Run admin user seeding
//     console.log('Seeding admin user...');
//     await seedAdminUser(AppDataSource);

//     console.log('All seeds completed successfully!');
//     console.log('Summary:');
//     console.log('- Roles: admin, user');
//     console.log('- Admin User: admin@petshop.com / Admin@123456');
//   } catch (error) {
//     console.error('Error seeding data:', error);
//     process.exit(1);
//   } finally {
//     // Close database connection
//     if (AppDataSource.isInitialized) {
//       await AppDataSource.destroy();
//       console.log('Database connection closed');
//     }
//     process.exit(0);
//   }
// }

// // Run seeds if this file is executed directly
// if (require.main === module) {
//   // eslint-disable-next-line @typescript-eslint/no-floating-promises
//   runSeeds();
// }

// export default runSeeds;

import { DataSource } from 'typeorm';
import { seedPermissions } from './permission.seed';
import { seedRoles } from './role.seed';
import { seedRolePermissions } from './role-permission.seed';
import { seedAdminUser } from './admin-user.seed';
import { seedSubscriptionPlans } from './subscription-plan.seed';
// import { seedProjectTasks } from './project-task.seed';

export async function runSeeds(dataSource: DataSource): Promise<void> {
  console.log('🌱 Running seeds...');
  await seedPermissions(dataSource);
  await seedRoles(dataSource);
  await seedRolePermissions(dataSource);
  await seedAdminUser(dataSource);
  await seedSubscriptionPlans(dataSource);
  // await seedProjectTasks(dataSource);
  console.log('All seeds completed.');
}
