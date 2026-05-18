# ICCP Monitoring — Setup

## Stack (11 containers trong 1 file)

```
Grafana           :3000
Prometheus        :9090
Loki              :3100
Promtail          :9080
Jaeger            :16686
Node Exporter     :9100
cAdvisor          :8080
Postgres Exporter :9187
Redis Exporter    :9121
MongoDB Exporter  :9216
Blackbox Exporter :9115
```

## 1. Cài package cho app

### iccp_be_core

```bash
cd iccp_be_core
npm install @willsoto/nestjs-prometheus prom-client
```

Thêm vào `src/app.module.ts`:
```typescript
import { HealthModule } from '@modules/health/health.module';
import { MetricsModule } from '@modules/metrics/metrics.module';
import { TraceIdModule } from '@common/middleware/trace-id.module';

@Module({
  imports: [
    // ... các module cũ
    HealthModule,
    MetricsModule,
    TraceIdModule,
  ],
})
```

Sửa `src/main.ts`:
```typescript
app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });
```

### iccp_be_ai

```bash
cd iccp_be_ai
pip install prometheus-fastapi-instrumentator
```

Thêm vào `app/main.py` (sau `app.include_router(v1_router)`):
```python
from app.core.metrics import setup_metrics
setup_metrics(app)
```

## 2. Chạy monitoring

```bash
cd iccp_be_core/observability

cp .env.example .env
# sửa GRAFANA_ADMIN_PASSWORD trong .env

docker network create iccp-network 2>/dev/null || true
docker compose up -d
```

## 3. Truy cập

| URL | Dùng gì |
|-----|---------|
| http://localhost:3000 | Grafana (admin / password trong .env) |
| http://localhost:9090 | Prometheus |
| http://localhost:16686 | Jaeger |
| http://localhost:3333/health | Health check be_core |
| http://localhost:3333/metrics | Metrics be_core |
| http://localhost:8001/metrics | Metrics be_ai |

## 4. Import dashboards Grafana

Grafana → Dashboards → Import → nhập ID:

| ID | Tên |
|----|-----|
| 1860 | Node Exporter Full |
| 193 | Docker Monitoring |
| 9628 | PostgreSQL Database |
| 763 | Redis Dashboard |
| 2583 | MongoDB Overview |

Dashboard custom `ICCP Application Overview` và `ICCP Infrastructure Overview` đã auto-load sẵn.

## 5. Query logs (Loki trong Grafana)

```
{container="iccp-be-core"}
{container="iccp-be-ai"}
{container=~"iccp-.*"} |= "ERROR"
```

## 6. Dừng / xóa

```bash
cd iccp_be_core/observability
docker compose down

# Xóa data
docker volume rm \
  observability_prometheus_data \
  observability_grafana_data \
  observability_loki_data
```
