# KPI Module

> **Cập nhật**: 2026-04-07

Tài liệu KPI được tách thành 2 file:

| File | Dành cho | Nội dung |
|---|---|---|
| [basic-design.md](./basic-design.md) | Product Owner, BA, Tech Lead | Nghiệp vụ, đối tượng, luồng, chỉ số, phân quyền, API list |
| [detail-design.md](./detail-design.md) | Developer | DTOs, SQL queries, service methods, controller, module wiring, error handling |

## Tóm tắt nhanh

- **6 endpoints** — 3 cho Project KPI, 3 cho Org KPI
- **Không tạo bảng mới** — tính real-time từ Task, Project, TicketRequest
- **2 permission mới**: `analytics.kpi.project.view`, `analytics.kpi.org.view`
- **1 module mới**: `src/modules/analytics/`
