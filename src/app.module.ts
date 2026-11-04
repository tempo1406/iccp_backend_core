import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '@configs/app.config';
import postgreConfig from '@database/config/postgre.config';
import { UsersModule } from '@modules/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@database/config/type-orm.config';
import redisConfig from '@database/config/redis.config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from '@modules/auth/auth.module';
import jwtConfig from '@modules/auth/configs/jwt.config';
import refreshJwtConfig from '@modules/auth/configs/refresh-jwt.config';
import authConfig from '@modules/auth/configs/auth.config';
import mailConfig from '@modules/mail/configs/mail.config';
import { MaillerModule } from '@modules/mail/mail.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { apiDocs_config } from '@configs/api-docs.config';
import { CustomCacheModule } from '@modules/cache/cache.module';
import { EventsModule } from '@modules/events/event.module';
import { BillingModule } from '@modules/billing/billing.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { TicketRequestModule } from '@modules/ticket-request/ticket-request.module';
import { ImagekitModule } from '@modules/imagekit/imagekit.module';
import { DocumentModule } from '@modules/document/document.module';
import imagekitConfig from '@configs/imagekit.config';
import { ProjectModule } from '@modules/project/project.module';
import { AdminModule } from '@modules/admin/admin.module';
import { ChatBoxModule } from '@modules/chat-box/chat-box.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { DailyReportModule } from '@modules/daily-report/daily-report.module';
import { BullQueueModule } from '@modules/bull/bull.module';
import { PlatformModule } from '@modules/platform/platform.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        postgreConfig,
        redisConfig,
        jwtConfig,
        refreshJwtConfig,
        authConfig,
        apiDocs_config,
        mailConfig,
        imagekitConfig,
      ],
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'single',
          options: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
            username: configService.get<string>('redis.username'),
            password: configService.get<string>('redis.password'),
            tls: configService.get<boolean>('redis.tls') ? {} : undefined,
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    MaillerModule,
    CustomCacheModule,
    EventsModule,
    RbacModule,
    BillingModule,
    OrganizationModule,
    TicketRequestModule,
    ImagekitModule,
    DocumentModule,
    ProjectModule,
    RbacModule,
    AdminModule,
    ChatBoxModule,
    NotificationModule,
    PaymentModule,
    DailyReportModule,
    AnalyticsModule,
    BullQueueModule,
    PlatformModule,
    DashboardModule,
    WebsocketModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
