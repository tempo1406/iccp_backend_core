import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

export class BullConnectionSingleton {
  private static instance: ConnectionOptions | null = null;

  private constructor() {}

  public static getInstance(configService: ConfigService): ConnectionOptions {
    if (!BullConnectionSingleton.instance) {
      const redisConfig = configService.get('redis');
      BullConnectionSingleton.instance = {
        host: redisConfig.host,
        port: redisConfig.port,
        username: redisConfig.username,
        password: redisConfig.password,
        tls: redisConfig.tls ? {} : undefined,
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
      };

      console.log('Shared BullMQ RedisConnection initialized (Singleton)');
    }

    return BullConnectionSingleton.instance;
  }
}
