# KPI Module

> **Updated**: 2026-04-07

Documentation is split into 2 files:

| File | Audience | Contents |
|---|---|---|
| [basic-design.md](./basic-design.md) | Product Owner, BA, Tech Lead | Business logic, actors, flows, metrics, permissions, API list |
| [detail-design.md](./detail-design.md) | Developer | DTOs, SQL queries, service methods, controller, module wiring, error handling |

## Quick Summary

- **6 endpoints** — 3 for Project KPI, 3 for Org KPI
- **No new tables** — computed real-time from Task, Project, TicketRequest
- **2 new permissions**: `analytics.kpi.project.view`, `analytics.kpi.org.view`
- **1 new module**: `src/modules/analytics/`
