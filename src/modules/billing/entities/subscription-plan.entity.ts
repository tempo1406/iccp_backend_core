import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'billing', name: 'subscription_plans' })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 12, scale: 2 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 12, scale: 2 })
  priceYearly: number;

  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers?: number;

  @Column({ name: 'max_documents', type: 'int', nullable: true })
  maxDocuments?: number;

  @Column({ name: 'max_storage_gb', type: 'int', nullable: true })
  maxStorageGb?: number;

  @Column({ name: 'max_projects', type: 'int', nullable: true })
  maxProjects?: number;

  @Column({ type: 'jsonb', nullable: true })
  features?: any;

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
