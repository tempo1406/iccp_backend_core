import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const protocol = redisConfig.tls ? 'rediss' : 'redis';
        const url = `${protocol}://${redisConfig.username}:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`;
        const keyvRedis = new KeyvRedis(url);
        return {
          stores: [keyvRedis],
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CustomCacheModule {}
