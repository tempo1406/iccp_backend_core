import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '@modules/cache/cache.service';
import { USER_EVENTS } from '../constants/user-events.constant';
import { USER_CACHE } from '@modules/cache/constants/user-cache.constant';

@Injectable()
export class UserEventsListener {
  constructor(private cacheService: CacheService) {}

  @OnEvent(USER_EVENTS.CREATED)
  async handleUserCreated() {
    await this.cacheService.del(USER_CACHE.ALL);
  }

  @OnEvent(USER_EVENTS.UPDATED)
  async handleUserUpdated(payload: { id: string }) {
    await this.cacheService.del(USER_CACHE.ONE(payload.id));
    await this.cacheService.del(USER_CACHE.ALL);
  }

  @OnEvent(USER_EVENTS.DELETED)
  async handleUserDeleted(payload: { id: string }) {
    await this.cacheService.del(USER_CACHE.ONE(payload.id));
    await this.cacheService.del(USER_CACHE.ALL);
  }
}
