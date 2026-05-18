import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface BlockRecord {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

@Entity({ schema: 'tenant', name: 'organization_landing_pages' })
export class OrganizationLandingPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'jsonb', default: [] })
  blocks: BlockRecord[];

  @Column({ name: 'raw_html', type: 'text', nullable: true })
  rawHtml?: string;

  @Column({ name: 'project_data', type: 'text', nullable: true })
  projectData?: string;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
