import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyReport } from './entities/daily-report.entity';
import { DailyReportItem } from './entities/daily-report-item.entity';
import { DailyReportComment } from './entities/daily-report-comment.entity';
import { DailyReportService } from './daily-report.service';
import { DailyReportController } from './daily-report.controller';
import { TaskWorklog } from '@modules/project/task-management/entities/task-worklog.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectCoreModule } from '@modules/project/core/project-core.module';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { ProjectConfig } from '@modules/project/settings/entities/project-config.entity';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { DailyReportNotificationListener } from './daily-report-notification.listener';
import { DailyReportReminderScheduleService } from './daily-report-reminder-schedule.service';

@Module({
  imports: [
    ProjectCoreModule,
    NotificationCoreModule,
    MaillerModule,
    TypeOrmModule.forFeature([
      DailyReport,
      DailyReportItem,
      DailyReportComment,
      TaskWorklog,
      Task,
      Project,
      ProjectMember,
      ProjectConfig,
      User,
      Organization,
    ]),
  ],
  controllers: [DailyReportController],
  providers: [
    DailyReportService,
    DailyReportNotificationListener,
    DailyReportReminderScheduleService,
  ],
  exports: [DailyReportReminderScheduleService],
})
export class DailyReportModule {}
