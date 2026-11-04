import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationLandingPageTemplate } from '../../entities/organization-landing-page-template.entity';

export class LandingPageTemplateResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  html?: string;

  @ApiPropertyOptional()
  projectData?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: OrganizationLandingPageTemplate,
  ): LandingPageTemplateResponse {
    const res = new LandingPageTemplateResponse();
    res.id = entity.id;
    res.organizationId = entity.organizationId;
    res.name = entity.name;
    res.html = entity.html;
    res.projectData = entity.projectData;
    res.thumbnailUrl = entity.thumbnailUrl;
    res.createdAt = entity.createdAt;
    res.updatedAt = entity.updatedAt;
    return res;
  }
}
