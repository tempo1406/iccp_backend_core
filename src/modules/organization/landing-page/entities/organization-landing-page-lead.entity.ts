import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'tenant', name: 'organization_landing_page_leads' })
export class OrganizationLandingPageLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'landing_page_id', type: 'uuid', nullable: true })
  landingPageId?: string | null;

  @Column({ name: 'form_type', type: 'varchar', length: 100, default: 'lead' })
  formType: string;

  @Column({ name: 'form_name', type: 'varchar', length: 255, nullable: true })
  formName?: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'page_url', type: 'text', nullable: true })
  pageUrl?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  fields?: Record<string, string> | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
