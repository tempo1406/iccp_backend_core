import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from '../core/entities/organization.entity';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import { UpdateOrgGeneralRequest } from './dto/request/update-org-general.request';
import { UpdateOrgBrandingRequest } from './dto/request/update-org-branding.request';
import {
  OrgBrandingResponse,
  OrgBrandingUpdateResponse,
  OrgProfileResponse,
} from './dto/response/org-profile.response';

const SELECT_ORG_PROFILE = `
  SELECT id, name, slug, description,
         logo_url        AS "logoUrl",
         website,
         contact_email   AS "contactEmail",
         industry, size,
         is_active       AS "isActive",
         settings,
         created_at      AS "createdAt",
         updated_at      AS "updatedAt"
  FROM "tenant"."organizations"
`;

@Injectable()
export class OrgProfileService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  private toProfileResponse(row: Record<string, any>): OrgProfileResponse {
    const s: Record<string, any> = row['settings'] ?? {};
    return {
      id: row['id'],
      name: row['name'],
      slug: row['slug'],
      description: row['description'],
      logoUrl: row['logoUrl'],
      website: row['website'],
      contactEmail: row['contactEmail'],
      industry: row['industry'],
      size: row['size'],
      isActive: row['isActive'],
      branding: {
        brandColor: s['brandColor'] ?? null,
        botName: s['botName'] ?? null,
        botPersona: s['botPersona'] ?? null,
      },
      createdAt: row['createdAt'],
      updatedAt: row['updatedAt'],
    } as OrgProfileResponse;
  }

  async getBranding(orgId: string): Promise<OrgBrandingResponse> {
    const rows = await this.orgRepo.manager.query(
      `SELECT settings FROM "tenant"."organizations" WHERE id = $1 AND is_active = true`,
      [orgId],
    );
    if (!rows.length) throw new ValidationException(ErrorCode.O001);
    const s: Record<string, any> = rows[0].settings ?? {};
    return {
      brandColor: s['brandColor'] ?? null,
      botName: s['botName'] ?? null,
      botPersona: s['botPersona'] ?? null,
    } as OrgBrandingResponse;
  }

  async getProfile(orgId: string): Promise<OrgProfileResponse> {
    const rows = await this.orgRepo.manager.query(
      `${SELECT_ORG_PROFILE} WHERE id = $1 AND is_active = true`,
      [orgId],
    );
    if (!rows.length) throw new ValidationException(ErrorCode.O001);
    return this.toProfileResponse(rows[0]);
  }

  async updateGeneral(
    orgId: string,
    dto: UpdateOrgGeneralRequest,
  ): Promise<OrgProfileResponse> {
    const exists = await this.orgRepo.manager.query(
      `SELECT id FROM "tenant"."organizations" WHERE id = $1 AND is_active = true`,
      [orgId],
    );
    if (!exists.length) throw new ValidationException(ErrorCode.O001);

    // Build SET clause động — chỉ update field được gửi, KHÔNG đụng settings
    const setClauses: string[] = ['"updated_at" = NOW()'];
    const params: any[] = [];

    const addField = (col: string, val: any) => {
      params.push(val);
      setClauses.push(`"${col}" = $${params.length}`);
    };

    if (dto.name !== undefined) addField('name', dto.name);
    if (dto.description !== undefined) addField('description', dto.description);
    if (dto.logoUrl !== undefined) addField('logo_url', dto.logoUrl);
    if (dto.website !== undefined) addField('website', dto.website);
    if (dto.contactEmail !== undefined)
      addField('contact_email', dto.contactEmail);

    params.push(orgId);
    await this.orgRepo.manager.query(
      `UPDATE "tenant"."organizations" SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    const rows = await this.orgRepo.manager.query(
      `${SELECT_ORG_PROFILE} WHERE id = $1`,
      [orgId],
    );
    return this.toProfileResponse(rows[0]);
  }

  async updateBranding(
    orgId: string,
    dto: UpdateOrgBrandingRequest,
  ): Promise<OrgBrandingUpdateResponse> {
    const rows = await this.orgRepo.manager.query(
      `SELECT settings FROM "tenant"."organizations" WHERE id = $1 AND is_active = true`,
      [orgId],
    );
    if (!rows.length) throw new ValidationException(ErrorCode.O001);

    const current: Record<string, any> = rows[0].settings ?? {};
    if (dto.brandColor !== undefined) current['brandColor'] = dto.brandColor;
    if (dto.botName !== undefined) current['botName'] = dto.botName;
    if (dto.botPersona !== undefined) current['botPersona'] = dto.botPersona;

    const [[updated]] = await this.orgRepo.manager.query(
      `UPDATE "tenant"."organizations"
       SET "settings" = $1, "updated_at" = NOW()
       WHERE id = $2
       RETURNING settings, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [current, orgId],
    );

    const s: Record<string, any> = updated.settings ?? {};
    return {
      branding: {
        brandColor: s['brandColor'] ?? null,
        botName: s['botName'] ?? null,
        botPersona: s['botPersona'] ?? null,
      },
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    } as OrgBrandingUpdateResponse;
  }
}
