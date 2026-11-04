import { AllConfigType } from '@configs/config.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import * as fs from 'node:fs/promises';

Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  onModuleInit() {
    const mailConfig = this.configService.get('mail');
    this.transporter = nodemailer.createTransport({
      host: mailConfig.host || 'smtp.gmail.com',
      port: mailConfig.port || 587,
      ignoreTLS: mailConfig.ignoreTLS,
      secure: mailConfig.secure,
      requireTLS: mailConfig.requireTLS,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
      },
    });
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: nodemailer.SendMailOptions & {
    templatePath: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    let html: string | undefined;
    if (templatePath) {
      const template = await fs.readFile(templatePath, 'utf-8');
      html = Handlebars.compile(template, {
        strict: true,
      })(context);
    }

    await this.transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from,
      html: mailOptions.html ? mailOptions.html : html,
    });
  }
}
