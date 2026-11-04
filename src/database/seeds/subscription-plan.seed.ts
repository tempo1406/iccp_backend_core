import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { DataSource } from 'typeorm';

export async function seedSubscriptionPlans(
  dataSource: DataSource,
): Promise<void> {
  const repo = dataSource.getRepository(SubscriptionPlan);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(
      `Subscription plans already seeded (${existing} found), skipping...`,
    );
    return;
  }

  await repo.save([
    repo.create({
      name: 'Free',
      code: 'free',
      description: 'Gói miễn phí cơ bản',
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 1,
      maxDocuments: 10,
      maxStorageGb: 1,
      maxProjects: 1,
      features: {
        chat: true,
        priority_support: false,
        custom_branding: false,
      },
    }),
    repo.create({
      name: 'Standard',
      code: 'standard',
      description: 'Phù hợp cho đội nhóm đang phát triển',
      priceMonthly: 790000,
      priceYearly: 7900000,
      maxUsers: 20,
      maxDocuments: 500,
      maxStorageGb: 50,
      maxProjects: 20,
      features: {
        chat: true,
        priority_support: true,
        custom_branding: false,
      },
    }),
    repo.create({
      name: 'Enterprise',
      code: 'enterprise',
      description: 'Dành cho doanh nghiệp lớn với nhu cầu tùy chỉnh',
      priceMonthly: 2900000,
      priceYearly: 29000000,
      maxUsers: 9999, // Đại diện vô hạn
      maxDocuments: 999999,
      maxStorageGb: 9999,
      maxProjects: 9999,
      features: {
        chat: true,
        priority_support: true,
        custom_branding: true,
      },
    }),
  ]);

  console.log('Seeded 3 subscription plans: Free, Standard, Enterprise.');
}
