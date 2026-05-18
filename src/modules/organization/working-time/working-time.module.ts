import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgWorkingTimeConfig } from './entities/org-working-time-config.entity';
import { OrgHoliday } from './entities/org-holiday.entity';
import { TicketRequest } from '@modules/ticket-request/core/entities/ticket-request.entity';
import { KpiSettingsResolverModule } from '@modules/analytics/kpi-settings-resolver.module';
import { WorkingTimeService } from './working-time.service';
import { WorkingTimeController } from './working-time.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgWorkingTimeConfig, OrgHoliday, TicketRequest]),
    KpiSettingsResolverModule,
  ],
  controllers: [WorkingTimeController],
  providers: [WorkingTimeService],
  exports: [WorkingTimeService],
})
export class WorkingTimeModule {}
