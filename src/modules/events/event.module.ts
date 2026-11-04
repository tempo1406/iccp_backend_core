import { Module } from '@nestjs/common';
import { UserEventsListener } from './listeners/user-event.listener';
import { CustomCacheModule } from '@modules/cache/cache.module';
@Module({
  imports: [CustomCacheModule],
  providers: [UserEventsListener],
})
export class EventsModule {}
