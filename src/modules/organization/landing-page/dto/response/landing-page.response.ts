import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationLandingPage } from '../../entities/organization-landing-page.entity';

export class LandingPageResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  rawHtml?: string;

  @ApiPropertyOptional()
  projectData?: string;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: OrganizationLandingPage): LandingPageResponse {
    const res = new LandingPageResponse();
    res.id = entity.id;
    res.organizationId = entity.organizationId;
    res.isPublished = entity.isPublished;
    res.createdAt = entity.createdAt;
    res.updatedAt = entity.updatedAt;

    // Prefer dedicated columns (new schema)
    if (entity.rawHtml) {
      res.rawHtml = entity.rawHtml;
    } else if (
      entity.blocks?.length === 1 &&
      entity.blocks[0].type === 'custom_html'
    ) {
      // Backward compat: old data stored html inside blocks jsonb
      res.rawHtml = entity.blocks[0].props['html'] as string | undefined;
    }

    res.projectData = entity.projectData;

    return res;
  }
}
