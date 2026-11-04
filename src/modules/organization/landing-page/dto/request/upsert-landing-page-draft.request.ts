import {  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const LANDING_PAGE_DRAFT_SOURCES = ['active', 'template', 'scratch'] as const;
const LANDING_PAGE_DRAFT_MODES = ['generate', 'modify'] as const;
const LANDING_PAGE_DRAFT_ROLES = ['user', 'assistant'] as const;
const LANDING_PAGE_DRAFT_STATUSES = ['streaming', 'done', 'error', 'stopped'] as const;

export class LandingPageDraftConversationMessageRequest {
  @ApiPropertyOptional()
  @IsString()
  id: string;

  @ApiPropertyOptional({ enum: LANDING_PAGE_DRAFT_ROLES })
  @IsIn(LANDING_PAGE_DRAFT_ROLES)
  role: (typeof LANDING_PAGE_DRAFT_ROLES)[number];

  @ApiPropertyOptional()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: LANDING_PAGE_DRAFT_MODES })
  @IsOptional()
  @IsIn(LANDING_PAGE_DRAFT_MODES)
  mode?: (typeof LANDING_PAGE_DRAFT_MODES)[number];

  @ApiPropertyOptional({ enum: LANDING_PAGE_DRAFT_STATUSES })
  @IsOptional()
  @IsIn(LANDING_PAGE_DRAFT_STATUSES)
  status?: (typeof LANDING_PAGE_DRAFT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tokensUsed?: number;
}

export class LandingPagePendingDraftRequest {
  @ApiPropertyOptional()
  @IsString()
  messageId: string;

  @ApiPropertyOptional({ enum: LANDING_PAGE_DRAFT_MODES })
  @IsIn(LANDING_PAGE_DRAFT_MODES)
  mode: (typeof LANDING_PAGE_DRAFT_MODES)[number];

  @ApiPropertyOptional()
  @IsString()
  html: string;

  @ApiPropertyOptional()
  @IsBoolean()
  partial: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tokensUsed?: number;
}

export class UpsertLandingPageDraftRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  rawHtml?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  projectData?: string | null;

  @ApiPropertyOptional({ type: [LandingPageDraftConversationMessageRequest] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LandingPageDraftConversationMessageRequest)
  aiConversation?: LandingPageDraftConversationMessageRequest[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  currentTemplateId?: string | null;

  @ApiPropertyOptional({ enum: LANDING_PAGE_DRAFT_SOURCES })
  @IsOptional()
  @IsIn(LANDING_PAGE_DRAFT_SOURCES)
  source?: (typeof LANDING_PAGE_DRAFT_SOURCES)[number];

  @ApiPropertyOptional({ type: LandingPagePendingDraftRequest, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LandingPagePendingDraftRequest)
  pendingDraft?: LandingPagePendingDraftRequest | null;
}


