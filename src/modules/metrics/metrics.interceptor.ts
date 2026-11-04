import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as client from 'prom-client';

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const bullmqJobsTotal = new client.Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total BullMQ jobs processed',
  labelNames: ['queue', 'status'],
});

const bullmqJobDuration = new client.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'BullMQ job duration',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
});

export { bullmqJobsTotal, bullmqJobDuration };

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const status = context.switchToHttp().getResponse().statusCode;
          httpRequestsTotal.inc({ method, status: String(status) });
          httpRequestDuration.observe({ method }, (Date.now() - start) / 1000);
        },
        error: (err) => {
          const status = err.status ?? 500;
          httpRequestsTotal.inc({ method, status: String(status) });
          httpRequestDuration.observe({ method }, (Date.now() - start) / 1000);
        },
      }),
    );
  }
}
