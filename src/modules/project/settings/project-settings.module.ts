import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectConfig } from './entities/project-config.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { ProjectCoreModule } from '@modules/project/core/project-core.module';
import { KpiSettingsResolverModule } from '@modules/analytics/kpi-settings-resolver.module';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectSettingsController } from './project-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectConfig,
      OrgSettings,
      Project,
      ProjectMember,
    ]),
    KpiSettingsResolverModule,
    ProjectCoreModule,
  ],
  controllers: [ProjectSettingsController],
  providers: [ProjectSettingsService],
  exports: [ProjectSettingsService],
})
export class ProjectSettingsModule {}
