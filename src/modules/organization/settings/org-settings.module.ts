import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgSettings } from './entities/org-settings.entity';
import { OrgSettingsService } from './org-settings.service';
import { OrgSettingsController } from './org-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrgSettings])],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService],
  exports: [OrgSettingsService],
})
export class OrgSettingsModule {}
