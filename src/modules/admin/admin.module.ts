import { Module } from '@nestjs/common';
import { ManageOrganizationModule } from './manage-organization/manage-organization.module';

@Module({
  imports: [ManageOrganizationModule],
})
export class AdminModule {}
