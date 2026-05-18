import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Organization } from '../core/entities/organization.entity';
import { OrganizationCoreModule } from '../core/organization-core.module';
import { OrgProfileController } from './org-profile.controller';
import { OrgProfileService } from './org-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    OrganizationCoreModule,
  ],
  controllers: [OrgProfileController],
  providers: [OrgProfileService],
})
export class OrgProfileModule {}
