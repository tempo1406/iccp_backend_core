import { AllConfigType } from '@configs/config.type';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@modules/mailer/mailer.service';

import { SubmitRequestAccessRequest } from './dto/request/submit-request-access.request';
import { RequestAccessResponse } from './dto/response/request-access.response';

@Injectable()
export class RequestAccessService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async submit(dto: SubmitRequestAccessRequest): Promise<RequestAccessResponse> {
    const submittedAt = new Date();
    const mailConfig = this.configService.get('mail');
    const systemMailbox = mailConfig?.user;

    if (!systemMailbox) {
      throw new InternalServerErrorException(
        'System mailbox is not configured',
      );
    }

    await this.mailerService.sendMail({
      from: systemMailbox,
      to: systemMailbox,
      replyTo: dto.email,
      subject: `[ICCP] New request access submission - ${dto.email}`,
      templatePath: '',
      context: {},
      html: this.renderEmailHtml(dto, submittedAt),
      text: this.renderEmailText(dto, submittedAt),
    });

    return {
      accepted: true,
      submittedAt: submittedAt.toISOString(),
      source: dto.source,
    };
  }

  private renderEmailHtml(
    dto: SubmitRequestAccessRequest,
    submittedAt: Date,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px; font-size: 20px;">New Request Access submission</h2>
        <p style="margin: 0 0 16px;">
          A visitor submitted the Request Access form on the ICCP platform landing page.
        </p>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          ${this.renderTableRow('Email', dto.email)}
          ${this.renderTableRow('Source', dto.source ?? 'platform-landing-page')}
          ${this.renderTableRow('Page URL', dto.pageUrl ?? '-')}
          ${this.renderTableRow('Submitted at', submittedAt.toISOString())}
        </table>
      </div>
    `;
  }

  private renderEmailText(
    dto: SubmitRequestAccessRequest,
    submittedAt: Date,
  ): string {
    return [
      'New Request Access submission',
      `Email: ${dto.email}`,
      `Source: ${dto.source ?? 'platform-landing-page'}`,
      `Page URL: ${dto.pageUrl ?? '-'}`,
      `Submitted at: ${submittedAt.toISOString()}`,
    ].join('\n');
  }

  private renderTableRow(label: string, value: string): string {
    return `
      <tr>
        <td style="width: 180px; padding: 10px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; vertical-align: top;">
          ${this.escapeHtml(label)}
        </td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; white-space: pre-wrap; word-break: break-word;">
          ${this.escapeHtml(value)}
        </td>
      </tr>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
