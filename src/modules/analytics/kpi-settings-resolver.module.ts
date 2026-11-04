import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectConfig } from '@modules/project/settings/entities/project-config.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { KpiTarget } from './kpi-target/entities/kpi-target.entity';
import { KpiSettingsResolver } from './kpi-settings-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectConfig, OrgSettings, KpiTarget, UserRole]),
  ],
  providers: [KpiSettingsResolver],
  exports: [KpiSettingsResolver],
})
export class KpiSettingsResolverModule {}
