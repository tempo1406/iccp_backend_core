import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Public } from '@common/decorators/auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, 'up' | 'down'> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }

    const allUp = Object.values(checks).every((s) => s === 'up');
    return { status: allUp ? 'ok' : 'error', ...checks };
  }

  @Get('liveness')
  liveness() {
    return { status: 'alive' };
  }
}
