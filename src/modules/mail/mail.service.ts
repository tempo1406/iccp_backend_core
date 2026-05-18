import { Injectable } from '@nestjs/common';
import { MailerService } from '@modules/mailer/mailer.service';
import * as dayjs from 'dayjs';
import { WelcomeMailDTO } from './dto/create-mailler.dto';
import * as path from 'path';
import * as fs from 'node:fs';
import * as nodemailer from 'nodemailer';

type MailAttachments = NonNullable<nodemailer.SendMailOptions['attachments']>;
type MailLabelValueRow = { label: string; value: string };

@Injectable()
export class MaillerService {
  constructor(private readonly mailerService: MailerService) {}

  private resolveTemplatePath(fileName: string): string {
    const candidates = [
      path.join(
        process.cwd(),
        'dist',
        'modules',
        'mail',
        'templates',
        fileName,
      ),
      path.join(process.cwd(), 'src', 'modules', 'mail', 'templates', fileName),
      path.join(__dirname, 'templates', fileName),
    ];

    const found = candidates.find((templatePath) =>
      fs.existsSync(templatePath),
    );
    if (!found) {
      throw new Error(
        `Mail template not found: ${fileName}. Checked: ${candidates.join(', ')}`,
      );
    }

    return found;
  }

  sendMailWelcome(welcomeMailDto: WelcomeMailDTO): void {
    try {
      void this.mailerService.sendMail({
        to: welcomeMailDto.email,
        subject: `Welcome to BoilerDay, ${welcomeMailDto.username}!`,
        templatePath: this.resolveTemplatePath('welcome.hbs'),
        context: {
          username: welcomeMailDto.username,
          email: welcomeMailDto.email,
          url: 'https://boilerday.ai/start',
          dateTime: dayjs().format('HH:mm - DD/MM/YYYY'),
          year: dayjs().format('YYYY'),
        },
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  sendMailOtp(
    email: string,
    username: string,
    otp: string,
    type: 'verify' | 'reset',
  ): void {
    try {
      const subject =
        type === 'verify'
          ? 'Verify your ICCP account'
          : 'ICCP password reset code';

      void this.mailerService.sendMail({
        to: email,
        subject,
        templatePath: this.resolveTemplatePath('otp.hbs'),
        context: {
          username,
          otp,
          type,
          expiryMinutes: 1, // displayed value in the email
          year: dayjs().format('YYYY'),
        },
      });
    } catch (error) {
      console.error(`Failed to send OTP email (${type}):`, error);
      throw error;
    }
  }

  async sendMailNotification(
    email: string,
    recipientName: string,
    title: string,
    message: string,
    content: string,
    senderName: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: title,
        templatePath: this.resolveTemplatePath('notification.hbs'),
        context: {
          recipientName,
          title,
          message,
          content,
          senderName,
          year: dayjs().format('YYYY'),
        },
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
      throw error;
    }
  }

  async sendKpiTargetAssignedEmail(payload: {
    email: string;
    recipientName: string;
    title: string;
    message: string;
    senderName: string;
    periodLabel: string;
    scopeLabel: string;
    statusLabel: string;
    metricRows: MailLabelValueRow[];
    note?: string | null;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: payload.title,
        templatePath: this.resolveTemplatePath('kpi-target-assigned.hbs'),
        context: {
          recipientName: payload.recipientName,
          title: payload.title,
          message: payload.message,
          senderName: payload.senderName,
          periodLabel: payload.periodLabel,
          scopeLabel: payload.scopeLabel,
          statusLabel: payload.statusLabel,
          metricRows: payload.metricRows,
          note: payload.note,
          year: dayjs().format('YYYY'),
        },
      });
    } catch (error) {
      console.error('Failed to send KPI target email:', error);
      throw error;
    }
  }

  async sendMailInvitation(
    email: string,
    organizationName: string,
    acceptUrl: string,
    expiresAt: string,
    invitationMessage?: string | null,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `You're invited to join organization "${organizationName}" on ICCP`,
        templatePath: this.resolveTemplatePath('invitation.hbs'),
        context: {
          email,
          organizationName,
          acceptUrl,
          expiresAt,
          invitationMessage,
          year: dayjs().format('YYYY'),
        },
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw error;
    }
  }

  async sendTicketRequestNotification(
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        templatePath: '',
        context: {},
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>${message}</p>
          <p style="color:#6b7280;font-size:12px;">ICCP Notification</p>
        </div>`,
      });
    } catch (error) {
      console.error('Failed to send ticket request notification email:', error);
      throw error;
    }
  }

  async sendKpiDigestEmail(payload: {
    email: string;
    recipientName: string;
    organizationName: string;
    periodLabel: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `[${payload.organizationName}] Weekly KPI Digest – ${payload.periodLabel}`,
        templatePath: this.resolveTemplatePath('kpi-digest.hbs'),
        context: {
          ...payload.context,
          recipientName: payload.recipientName,
        },
      });
    } catch (error) {
      console.error('Failed to send KPI digest email:', error);
      throw error;
    }
  }

  async sendPeriodicReportEmail(payload: {
    email: string;
    subject: string;
    context: Record<string, unknown>;
    attachments?: MailAttachments;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: payload.subject,
        templatePath: this.resolveTemplatePath('periodic-report.hbs'),
        context: payload.context,
        attachments: payload.attachments,
      });
    } catch (error) {
      console.error('Failed to send periodic report email:', error);
      throw error;
    }
  }
}
