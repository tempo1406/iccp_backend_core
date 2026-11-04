import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import { WorkingTimeModule } from '@modules/organization/working-time/working-time.module';
import { KpiSettingsResolverModule } from './kpi-settings-resolver.module';
import { KpiActualService } from './kpi-actual.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectMember, Task, StatusTask]),
    WorkingTimeModule,
    KpiSettingsResolverModule,
  ],
  providers: [KpiActualService],
  exports: [KpiActualService],
})
export class KpiActualModule {}
