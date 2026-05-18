import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TraceIdMiddleware } from './trace-id.middleware';

@Module({})
export class TraceIdModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
