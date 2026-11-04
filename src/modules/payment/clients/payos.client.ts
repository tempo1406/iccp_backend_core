import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PayOS,
  type ConfirmWebhookResponse,
  type CreatePaymentLinkRequest,
  type CreatePaymentLinkResponse,
  type PaymentLink,
  type Webhook,
  type WebhookData,
} from '@payos/node';
import { PayosConfig } from '../configs/payos.config';

@Injectable()
export class PayosClient {
  private payos: PayOS;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<PayosConfig>('payos')!;
    this.payos = new PayOS({
      clientId: config.clientId,
      apiKey: config.apiKey,
      checksumKey: config.checksumKey,
    });
  }

  async createPaymentLink(
    data: CreatePaymentLinkRequest,
  ): Promise<CreatePaymentLinkResponse> {
    return this.payos.paymentRequests.create(data);
  }

  async getPaymentStatus(orderCode: number): Promise<PaymentLink> {
    return this.payos.paymentRequests.get(orderCode);
  }

  async cancelPayment(
    orderCode: number,
    reason?: string,
  ): Promise<PaymentLink> {
    return this.payos.paymentRequests.cancel(orderCode, reason);
  }

  async verifyWebhookData(webhook: Webhook): Promise<WebhookData> {
    return this.payos.webhooks.verify(webhook);
  }

  async confirmWebhookUrl(
    webhookUrl: string,
  ): Promise<ConfirmWebhookResponse> {
    return this.payos.webhooks.confirm(webhookUrl);
  }
}
