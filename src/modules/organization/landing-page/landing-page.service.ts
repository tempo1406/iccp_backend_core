import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@modules/mailer/mailer.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { Repository } from 'typeorm';

import { Organization } from '../core/entities/organization.entity';
import { CreateTemplateRequest } from './dto/request/create-template.request';
import { SubmitLandingPageLeadRequest } from './dto/request/submit-landing-page-lead.request';
import { UpdateTemplateRequest } from './dto/request/update-template.request';
import { UpsertLandingPageDraftRequest } from './dto/request/upsert-landing-page-draft.request';
import { UpsertLandingPageRequest } from './dto/request/upsert-landing-page.request';
import { LandingPageDraftResponse } from './dto/response/landing-page-draft.response';
import { LandingPageLeadResponse } from './dto/response/landing-page-lead.response';
import { LandingPageResponse } from './dto/response/landing-page.response';
import { LandingPageTemplateResponse } from './dto/response/landing-page-template.response';
import { OrganizationLandingPage } from './entities/organization-landing-page.entity';
import { OrganizationLandingPageDraft } from './entities/organization-landing-page-draft.entity';
import { OrganizationLandingPageLead } from './entities/organization-landing-page-lead.entity';
import { OrganizationLandingPageTemplate } from './entities/organization-landing-page-template.entity';

type LeadNotificationRecipient = {
  userId: string;
  email: string;
  fullName: string;
};

type LandingPageLookupRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  isPublished: boolean;
};

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTemplateName(value: string | null | undefined): string {
  if (typeof value !== 'string') return 'Untitled Page';
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 30);
  return normalized || 'Untitled Page';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

@Injectable()
export class LandingPageService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationLandingPage)
    private readonly landingPageRepo: Repository<OrganizationLandingPage>,
    @InjectRepository(OrganizationLandingPageDraft)
    private readonly landingPageDraftRepo: Repository<OrganizationLandingPageDraft>,
    @InjectRepository(OrganizationLandingPageLead)
    private readonly landingPageLeadRepo: Repository<OrganizationLandingPageLead>,
    @InjectRepository(OrganizationLandingPageTemplate)
    private readonly templateRepo: Repository<OrganizationLandingPageTemplate>,
    private readonly mailerService: MailerService,
    private readonly notificationCoreService: NotificationCoreService,
  ) {}

  async getLandingPageBySlug(
    slug: string,
  ): Promise<LandingPageResponse | null> {
    const rows = await this.landingPageRepo.query(
      `
      SELECT lp.id, lp.organization_id AS "organizationId",
             lp.blocks, lp.raw_html AS "rawHtml",
             lp.project_data AS "projectData",
             lp.is_published AS "isPublished",
             lp.created_at AS "createdAt", lp.updated_at AS "updatedAt"
      FROM "tenant"."organization_landing_pages" lp
      INNER JOIN "tenant"."organizations" o ON o.id = lp.organization_id
      WHERE o.slug = $1
      LIMIT 1
      `,
      [slug],
    );

    if (!rows || rows.length === 0) return null;
    const row = rows[0] as OrganizationLandingPage;
    return LandingPageResponse.fromEntity(row);
  }

  async getLandingPageByOrgId(
    organizationIdentifier: string,
    scopedOrgId?: string,
  ): Promise<LandingPageResponse | null> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = await this.landingPageRepo.findOne({
      where: { organizationId: orgId },
    });
    if (!entity) return null;
    return LandingPageResponse.fromEntity(entity);
  }

  async submitLandingPageLead(
    slug: string,
    dto: SubmitLandingPageLeadRequest,
  ): Promise<LandingPageLeadResponse> {
    const landingPage = await this.getPublishedLandingPageBySlug(slug);
    const normalizedFields = this.normalizeSubmittedFields(dto.fields);
    const submittedAt = new Date();

    const entity = this.landingPageLeadRepo.create({
      organizationId: landingPage.organizationId,
      landingPageId: landingPage.id,
      formType: normalizeOptionalString(dto.formType) ?? 'lead',
      formName: normalizeOptionalString(dto.formName),
      fullName: this.resolveLeadFullName(dto.fullName, normalizedFields),
      email: normalizeOptionalString(dto.email)?.toLowerCase() ?? null,
      phone: normalizeOptionalString(dto.phone),
      message: normalizeOptionalString(dto.message),
      pageUrl: normalizeOptionalString(dto.pageUrl),
      fields:
        Object.keys(normalizedFields).length > 0 ? normalizedFields : null,
      submittedAt,
    });

    const saved = await this.landingPageLeadRepo.save(entity);
    const recipients = await this.findLandingPageLeadRecipients(
      landingPage.organizationId,
    );

    if (recipients.length > 0) {
      await this.notifyLandingPageLead(
        recipients,
        landingPage.organizationName,
        saved,
      );
    } else {
      console.warn(
        `[landing-page-lead] No org admin recipient found for organization ${landingPage.organizationId}`,
      );
    }

    return LandingPageLeadResponse.fromEntity(saved);
  }

  async upsertLandingPage(
    organizationIdentifier: string,
    dto: UpsertLandingPageRequest,
    scopedOrgId?: string,
  ): Promise<LandingPageResponse> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    await this.landingPageRepo.query(
      `
      INSERT INTO "tenant"."organization_landing_pages"
        (organization_id, blocks, raw_html, project_data, is_published)
      VALUES ($1, $2::jsonb, $3, $4, $5)
      ON CONFLICT (organization_id)
      DO UPDATE SET
        raw_html     = COALESCE($3, organization_landing_pages.raw_html),
        project_data = COALESCE($4, organization_landing_pages.project_data),
        is_published = COALESCE($5, organization_landing_pages.is_published),
        updated_at   = now()
      `,
      [
        orgId,
        JSON.stringify([]),
        dto.rawHtml ?? null,
        dto.projectData ?? null,
        dto.isPublished ?? false,
      ],
    );

    const entity = await this.landingPageRepo.findOne({
      where: { organizationId: orgId },
    });

    return LandingPageResponse.fromEntity(entity!);
  }

  async getLandingPageDraft(
    organizationIdentifier: string,
    userId: string,
    scopedOrgId?: string,
  ): Promise<LandingPageDraftResponse | null> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = await this.landingPageDraftRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!entity) return null;
    entity.aiConversation = [];
    entity.pendingDraft = null;
    return LandingPageDraftResponse.fromEntity(entity);
  }

  async upsertLandingPageDraft(
    organizationIdentifier: string,
    userId: string,
    dto: UpsertLandingPageDraftRequest,
    scopedOrgId?: string,
  ): Promise<LandingPageDraftResponse> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    let entity = await this.landingPageDraftRepo.findOne({
      where: { organizationId: orgId, userId },
    });

    if (!entity) {
      entity = this.landingPageDraftRepo.create({
        organizationId: orgId,
        userId,
        aiConversation: [],
        source: dto.source ?? 'scratch',
      });
    }

    if (dto.rawHtml !== undefined) entity.rawHtml = dto.rawHtml ?? null;
    if (dto.projectData !== undefined)
      entity.projectData = dto.projectData ?? null;
    entity.aiConversation = [];

    if (dto.currentTemplateId !== undefined) {
      entity.currentTemplateId = dto.currentTemplateId ?? null;
    }
    if (dto.source !== undefined) entity.source = dto.source;
    entity.pendingDraft = null;

    const saved = await this.landingPageDraftRepo.save(entity);
    return LandingPageDraftResponse.fromEntity(saved);
  }

  async listTemplates(
    organizationIdentifier: string,
    scopedOrgId?: string,
  ): Promise<LandingPageTemplateResponse[]> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entities = await this.templateRepo.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) =>
      LandingPageTemplateResponse.fromEntity(entity),
    );
  }

  async getTemplate(
    organizationIdentifier: string,
    templateId: string,
    scopedOrgId?: string,
  ): Promise<LandingPageTemplateResponse> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = await this.templateRepo.findOne({
      where: { id: templateId, organizationId: orgId },
    });
    if (!entity) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return LandingPageTemplateResponse.fromEntity(entity);
  }

  async createTemplate(
    organizationIdentifier: string,
    dto: CreateTemplateRequest,
    scopedOrgId?: string,
  ): Promise<LandingPageTemplateResponse> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = this.templateRepo.create({
      organizationId: orgId,
      name: normalizeTemplateName(dto.name),
      html: dto.html,
      projectData: dto.projectData,
      thumbnailUrl: dto.thumbnailUrl,
    });
    const saved = await this.templateRepo.save(entity);
    return LandingPageTemplateResponse.fromEntity(saved);
  }

  async updateTemplate(
    organizationIdentifier: string,
    templateId: string,
    dto: UpdateTemplateRequest,
    scopedOrgId?: string,
  ): Promise<LandingPageTemplateResponse> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = await this.templateRepo.findOne({
      where: { id: templateId, organizationId: orgId },
    });
    if (!entity) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    if (dto.name !== undefined) entity.name = normalizeTemplateName(dto.name);
    if (dto.html !== undefined) entity.html = dto.html;
    if (dto.projectData !== undefined) entity.projectData = dto.projectData;
    if (dto.thumbnailUrl !== undefined) entity.thumbnailUrl = dto.thumbnailUrl;

    const saved = await this.templateRepo.save(entity);
    return LandingPageTemplateResponse.fromEntity(saved);
  }

  async deleteTemplate(
    organizationIdentifier: string,
    templateId: string,
    scopedOrgId?: string,
  ): Promise<void> {
    const orgId = await this.resolveOrganizationId(
      organizationIdentifier,
      scopedOrgId,
    );
    const entity = await this.templateRepo.findOne({
      where: { id: templateId, organizationId: orgId },
    });
    if (!entity) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    await this.templateRepo.remove(entity);
  }

  private async resolveOrganizationId(
    organizationIdentifier: string,
    scopedOrgId?: string,
  ): Promise<string> {
    const normalizedIdentifier = organizationIdentifier.trim();

    if (scopedOrgId) {
      const scopedOrg = await this.organizationRepo.findOne({
        where: { id: scopedOrgId },
      });

      if (!scopedOrg) {
        throw new NotFoundException(`Organization ${scopedOrgId} not found`);
      }

      if (
        normalizedIdentifier === scopedOrg.id ||
        normalizedIdentifier === scopedOrg.slug
      ) {
        return scopedOrg.id;
      }

      throw new ForbiddenException(
        `Organization scope mismatch for ${normalizedIdentifier}`,
      );
    }

    const where = isUuidLike(normalizedIdentifier)
      ? [{ id: normalizedIdentifier }, { slug: normalizedIdentifier }]
      : [{ slug: normalizedIdentifier }];
    const organization = await this.organizationRepo.findOne({ where });

    if (!organization) {
      throw new NotFoundException(
        `Organization ${normalizedIdentifier} not found`,
      );
    }

    return organization.id;
  }

  private async getPublishedLandingPageBySlug(
    slug: string,
  ): Promise<LandingPageLookupRow> {
    const rows = await this.landingPageRepo.query(
      `
      SELECT lp.id,
             lp.organization_id AS "organizationId",
             lp.is_published AS "isPublished",
             o.name AS "organizationName"
      FROM "tenant"."organization_landing_pages" lp
      INNER JOIN "tenant"."organizations" o ON o.id = lp.organization_id
      WHERE o.slug = $1
        AND lp.is_published = true
      LIMIT 1
      `,
      [slug],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(
        `Published landing page for organization ${slug} not found`,
      );
    }

    return rows[0] as LandingPageLookupRow;
  }

  private normalizeSubmittedFields(
    fields: Record<string, string> | undefined,
  ): Record<string, string> {
    if (!fields || typeof fields !== 'object') return {};

    return Object.entries(fields).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value !== 'string') return acc;
        const normalizedKey = key.trim();
        const normalizedValue = value.trim();
        if (!normalizedKey || !normalizedValue) return acc;
        acc[normalizedKey] = normalizedValue;
        return acc;
      },
      {},
    );
  }

  private resolveLeadFullName(
    fullName: string | undefined,
    fields: Record<string, string>,
  ): string | null {
    const direct = normalizeOptionalString(fullName);
    if (direct) return direct;

    const firstName = normalizeOptionalString(
      fields.firstName ?? fields.firstname ?? fields['first-name'],
    );
    const lastName = normalizeOptionalString(
      fields.lastName ?? fields.lastname ?? fields['last-name'],
    );
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (combined) return combined;

    return normalizeOptionalString(
      fields.name ?? fields.fullName ?? fields.fullname,
    );
  }

  private async findLandingPageLeadRecipients(
    organizationId: string,
  ): Promise<LeadNotificationRecipient[]> {
    const rows = await this.landingPageRepo.query(
      `
      WITH owner_users AS (
        SELECT DISTINCT
          u.id AS "userId",
          u.email AS email,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) AS "fullName"
        FROM "tenant"."organizations" o
        INNER JOIN "auth"."users" u ON u.id = o.owner_id
        WHERE o.id = $1
          AND u.is_active = true
          AND u.deleted_at IS NULL
      ),
      org_admin_users AS (
        SELECT DISTINCT
          u.id AS "userId",
          u.email AS email,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) AS "fullName"
        FROM "tenant"."organization_members" m
        INNER JOIN "auth"."users" u
          ON u.id = m.user_id
        INNER JOIN "rbac"."user_roles" ur
          ON ur.user_id = m.user_id
         AND ur.organization_id = m.organization_id
         AND ur.scope_type = 'organization'
        INNER JOIN "rbac"."roles" r
          ON r.id = ur.role_id
         AND r.name = 'org_admin'
        WHERE m.organization_id = $1
          AND m.is_active = true
          AND m.is_deleted = false
          AND u.is_active = true
          AND u.deleted_at IS NULL
      )
      SELECT DISTINCT "userId", email, "fullName"
      FROM (
        SELECT * FROM owner_users
        UNION ALL
        SELECT * FROM org_admin_users
      ) recipients
      WHERE "userId" IS NOT NULL
        AND email IS NOT NULL
        AND email <> ''
      `,
      [organizationId],
    );

    return (rows as LeadNotificationRecipient[]) ?? [];
  }

  private async notifyLandingPageLead(
    recipients: LeadNotificationRecipient[],
    organizationName: string,
    lead: OrganizationLandingPageLead,
  ): Promise<void> {
    const subject = `[ICCP] Thông tin người cần tư vấn - ${organizationName}`;
    const submittedAt = (lead.submittedAt ?? lead.createdAt).toISOString();
    const detailsHtml = this.renderLeadDetailsHtml(
      lead,
      submittedAt,
      organizationName,
    );
    const notificationTitle = 'Thông tin người cần tư vấn';
    const notificationMessage = this.buildLeadNotificationMessage(lead);
    const notificationContent = this.buildLeadNotificationContent(lead);

    const emailTasks = recipients.map((recipient) =>
      this.mailerService.sendMail({
        to: recipient.email,
        subject,
        templatePath: '',
        context: {},
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin: 0 0 16px; font-size: 20px;">Thông tin người cần tư vấn</h2>
            <p style="margin: 0 0 16px;">Một khách truy cập vừa để lại thông tin trên landing page công khai của <strong>${escapeHtml(organizationName)}</strong>.</p>
            ${detailsHtml}
            <p style="margin: 20px 0 0; color: #64748b; font-size: 12px;">Email này được gửi tới admin của ${escapeHtml(organizationName)} vì họ đang quản lý organization này trong ICCP.</p>
          </div>
        `,
      }),
    );

    const notificationTasks = recipients.map((recipient) =>
      this.notificationCoreService.send({
        userId: recipient.userId,
        senderName: organizationName,
        title: notificationTitle,
        message: notificationMessage,
        content: notificationContent,
        type: 'landing_page.lead',
        idempotencyKey: `landing-page-lead:${lead.id}:${recipient.userId}`,
        data: {
          module: 'landing_page',
          action: 'lead_submitted',
          organizationId: lead.organizationId,
          organizationName,
          landingPageLeadId: lead.id,
          formType: lead.formType,
          lead: {
            name: this.resolveLeadDisplayValue(lead.fullName),
            email: this.resolveLeadDisplayValue(lead.email),
            phone: this.resolveLeadDisplayValue(lead.phone),
            message: this.resolveLeadMessageContent(lead.message),
          },
        },
      }),
    );

    const [emailResults, notificationResults] = await Promise.all([
      Promise.allSettled(emailTasks),
      Promise.allSettled(notificationTasks),
    ]);

    const rejectedEmails = emailResults.filter(
      (result) => result.status === 'rejected',
    );
    if (rejectedEmails.length > 0) {
      console.error(
        `[landing-page-lead] Failed to send ${rejectedEmails.length} notification email(s) for organization ${lead.organizationId}`,
      );
    }

    const rejectedNotifications = notificationResults.filter(
      (result) => result.status === 'rejected',
    );
    if (rejectedNotifications.length > 0) {
      console.error(
        `[landing-page-lead] Failed to create ${rejectedNotifications.length} in-app notification(s) for organization ${lead.organizationId}`,
      );
    }
  }

  private buildLeadNotificationMessage(
    lead: OrganizationLandingPageLead,
  ): string {
    return [
      `Name: ${this.resolveLeadDisplayValue(lead.fullName)}`,
      `Email: ${this.resolveLeadDisplayValue(lead.email)}`,
      `Phone: ${this.resolveLeadDisplayValue(lead.phone)}`,
      `Message: ${this.resolveLeadMessagePreview(lead.message)}`,
    ].join(' | ');
  }

  private buildLeadNotificationContent(
    lead: OrganizationLandingPageLead,
  ): string {
    return [
      `Name: ${this.resolveLeadDisplayValue(lead.fullName)}`,
      `Email: ${this.resolveLeadDisplayValue(lead.email)}`,
      `Phone: ${this.resolveLeadDisplayValue(lead.phone)}`,
      `Message: ${this.resolveLeadMessageContent(lead.message)}`,
    ].join('\n');
  }

  private resolveLeadDisplayValue(value: string | null | undefined): string {
    return normalizeOptionalString(value) ?? '-';
  }

  private resolveLeadMessageContent(value: string | null | undefined): string {
    return normalizeOptionalString(value) ?? '-';
  }

  private resolveLeadMessagePreview(
    value: string | null | undefined,
    maxLength = 120,
  ): string {
    const normalized = this.resolveLeadMessageContent(value).replace(
      /\s+/g,
      ' ',
    );

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private renderLeadDetailsHtml(
    lead: OrganizationLandingPageLead,
    submittedAt: string,
    organizationName: string,
  ): string {
    const rows: string[] = [
      this.renderLeadRow('Organization', organizationName),
      this.renderLeadRow('Submitted at', submittedAt),
    ];

    if (lead.email) rows.push(this.renderLeadRow('Email', lead.email));
    if (lead.fullName)
      rows.push(this.renderLeadRow('Full name', lead.fullName));
    if (lead.phone) rows.push(this.renderLeadRow('Phone', lead.phone));
    if (lead.formType)
      rows.push(this.renderLeadRow('Form type', lead.formType));
    if (lead.formName)
      rows.push(this.renderLeadRow('Form name', lead.formName));
    if (lead.pageUrl) rows.push(this.renderLeadRow('Page URL', lead.pageUrl));
    if (lead.message) rows.push(this.renderLeadRow('Message', lead.message));

    const extraFields = this.renderExtraFieldsHtml(lead.fields ?? null);
    if (extraFields) rows.push(extraFields);

    return `<table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">${rows.join('')}</table>`;
  }

  private renderLeadRow(label: string, value: string): string {
    return `
      <tr>
        <td style="width: 180px; padding: 10px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; vertical-align: top;">${escapeHtml(label)}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; white-space: pre-wrap; word-break: break-word;">${escapeHtml(value)}</td>
      </tr>
    `;
  }

  private renderExtraFieldsHtml(fields: Record<string, string> | null): string {
    if (!fields) return '';

    const entries = Object.entries(fields).filter(([, value]) =>
      Boolean(value),
    );
    if (entries.length === 0) return '';

    const listItems = entries
      .map(
        ([key, value]) =>
          `<li style="margin-bottom: 4px;"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`,
      )
      .join('');

    return `
      <tr>
        <td style="width: 180px; padding: 10px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; vertical-align: top;">Extra fields</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">
          <ul style="margin: 0; padding-left: 18px;">${listItems}</ul>
        </td>
      </tr>
    `;
  }
}
