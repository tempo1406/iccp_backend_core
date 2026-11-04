import { Module } from '@nestjs/common';

import { RequestAccessModule } from './request-access/request-access.module';

@Module({
  imports: [RequestAccessModule],
})
export class PlatformModule {}
