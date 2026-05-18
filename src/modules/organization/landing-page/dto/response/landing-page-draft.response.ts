import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  LandingPageDraftConversationMessageRecord,
  LandingPagePendingDraftRecord,
  OrganizationLandingPageDraft,
} from '../../entities/organization-landing-page-draft.entity';

export class LandingPageDraftConversationMessageResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  mode?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  tokensUsed?: number;

  static fromRecord(
    record: LandingPageDraftConversationMessageRecord,
  ): LandingPageDraftConversationMessageResponse {
    const response = new LandingPageDraftConversationMessageResponse();
    response.id = record.id;
    response.role = record.role;
    response.content = record.content;
    response.mode = record.mode;
    response.status = record.status;
    response.tokensUsed = record.tokensUsed;
    return response;
  }
}

export class LandingPagePendingDraftResponse {
  @ApiProperty()
  messageId: string;

  @ApiProperty()
  mode: string;

  @ApiProperty()
  html: string;

  @ApiProperty()
  partial: boolean;

  @ApiPropertyOptional()
  tokensUsed?: number;

  static fromRecord(record: LandingPagePendingDraftRecord): LandingPagePendingDraftResponse {
    const response = new LandingPagePendingDraftResponse();
    response.messageId = record.messageId;
    response.mode = record.mode;
    response.html = record.html;
    response.partial = record.partial;
    response.tokensUsed = record.tokensUsed;
    return response;
  }
}

export class LandingPageDraftResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional({ nullable: true })
  rawHtml?: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectData?: string | null;

  @ApiProperty({ type: [LandingPageDraftConversationMessageResponse] })
  aiConversation: LandingPageDraftConversationMessageResponse[];

  @ApiPropertyOptional({ nullable: true })
  currentTemplateId?: string | null;

  @ApiProperty()
  source: string;

  @ApiPropertyOptional({ type: LandingPagePendingDraftResponse, nullable: true })
  pendingDraft?: LandingPagePendingDraftResponse | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: OrganizationLandingPageDraft): LandingPageDraftResponse {
    const response = new LandingPageDraftResponse();
    response.id = entity.id;
    response.organizationId = entity.organizationId;
    response.userId = entity.userId;
    response.rawHtml = entity.rawHtml ?? null;
    response.projectData = entity.projectData ?? null;
    response.aiConversation = (entity.aiConversation ?? []).map(
      LandingPageDraftConversationMessageResponse.fromRecord,
    );
    response.currentTemplateId = entity.currentTemplateId ?? null;
    response.source = entity.source;
    response.pendingDraft = entity.pendingDraft
      ? LandingPagePendingDraftResponse.fromRecord(entity.pendingDraft)
      : null;
    response.createdAt = entity.createdAt;
    response.updatedAt = entity.updatedAt;
    return response;
  }
}
