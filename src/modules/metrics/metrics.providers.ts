import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics.interceptor';

export const metricsInterceptorProvider = {
  provide: APP_INTERCEPTOR,
  useClass: MetricsInterceptor,
};
