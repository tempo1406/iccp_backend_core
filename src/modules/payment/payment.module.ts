import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayosClient } from './clients/payos.client';
import { PaymentWsListener } from './listeners/payment-ws.listener';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Invoice } from '@modules/billing/entities/invoice.entity';
import { Subscription } from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { BillingModule } from '@modules/billing/billing.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import payosConfig from './configs/payos.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentTransaction,
      Invoice,
      Subscription,
      SubscriptionPlan,
    ]),
    ConfigModule.forFeature(payosConfig),
    BillingModule,
    WebsocketModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PayosClient, PaymentWsListener],
  exports: [PaymentService],
})
export class PaymentModule {}
