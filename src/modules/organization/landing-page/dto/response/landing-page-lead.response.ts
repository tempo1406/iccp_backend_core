import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationLandingPageLead } from '../../entities/organization-landing-page-lead.entity';

export class LandingPageLeadResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  landingPageId?: string | null;

  @ApiProperty()
  formType: string;

  @ApiPropertyOptional()
  formName?: string | null;

  @ApiPropertyOptional()
  fullName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  message?: string | null;

  @ApiPropertyOptional()
  pageUrl?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields?: Record<string, string> | null;

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    entity: OrganizationLandingPageLead,
  ): LandingPageLeadResponse {
    const response = new LandingPageLeadResponse();
    response.id = entity.id;
    response.organizationId = entity.organizationId;
    response.landingPageId = entity.landingPageId ?? null;
    response.formType = entity.formType;
    response.formName = entity.formName ?? null;
    response.fullName = entity.fullName ?? null;
    response.email = entity.email ?? null;
    response.phone = entity.phone ?? null;
    response.message = entity.message ?? null;
    response.pageUrl = entity.pageUrl ?? null;
    response.fields = entity.fields ?? null;
    response.submittedAt = entity.submittedAt ?? entity.createdAt;
    response.createdAt = entity.createdAt;
    return response;
  }
}
