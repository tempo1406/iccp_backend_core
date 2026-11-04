import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { KpiActualModule } from '@modules/analytics/kpi-actual.module';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiTargetSnapshot } from './entities/kpi-target-snapshot.entity';
import { AuditLog } from './entities/audit-log.entity';
import { KpiTargetService } from './kpi-target.service';
import { KpiTargetController } from './kpi-target.controller';
import { KpiTargetNotificationListener } from './kpi-target-notification.listener';
import { KpiTargetArchiveService } from './kpi-target-archive.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiTarget,
      KpiTargetSnapshot,
      AuditLog,
      ProjectMember,
      User,
      UserRole,
      RolePermission,
      Permission,
      Role,
      Organization,
    ]),
    NotificationCoreModule,
    MaillerModule,
    KpiActualModule,
  ],
  controllers: [KpiTargetController],
  providers: [
    KpiTargetService,
    KpiTargetNotificationListener,
    KpiTargetArchiveService,
  ],
  exports: [KpiTargetService, TypeOrmModule],
})
export class KpiTargetModule {}
