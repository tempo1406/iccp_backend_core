import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LandingPageDraftSource = 'active' | 'template' | 'scratch';
export type LandingPageDraftMode = 'generate' | 'modify';
export type LandingPageDraftMessageRole = 'user' | 'assistant';
export type LandingPageDraftMessageStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface LandingPageDraftConversationMessageRecord {
  id: string;
  role: LandingPageDraftMessageRole;
  content: string;
  mode?: LandingPageDraftMode;
  status?: LandingPageDraftMessageStatus;
  tokensUsed?: number;
}

export interface LandingPagePendingDraftRecord {
  messageId: string;
  mode: LandingPageDraftMode;
  html: string;
  partial: boolean;
  tokensUsed?: number;
}

@Entity({ schema: 'tenant', name: 'organization_landing_page_drafts' })
@Index('uq_org_lp_drafts_org_user', ['organizationId', 'userId'], { unique: true })
export class OrganizationLandingPageDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_org_lp_drafts_org_id')
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index('idx_org_lp_drafts_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'raw_html', type: 'text', nullable: true })
  rawHtml?: string | null;

  @Column({ name: 'project_data', type: 'text', nullable: true })
  projectData?: string | null;

  @Column({
    name: 'ai_conversation',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  aiConversation: LandingPageDraftConversationMessageRecord[];

  @Column({ name: 'current_template_id', type: 'uuid', nullable: true })
  currentTemplateId?: string | null;

  @Column({ name: 'source', type: 'varchar', length: 32, default: 'scratch' })
  source: LandingPageDraftSource;

  @Column({ name: 'pending_draft', type: 'jsonb', nullable: true })
  pendingDraft?: LandingPagePendingDraftRecord | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
