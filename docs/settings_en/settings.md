# Settings Module

> **Updated**: 2026-04-07

| File | Audience | Contents |
|---|---|---|
| [basic-design.md](./basic-design.md) | PO, BA, Tech Lead | Business logic, config groups, flows, permissions, API list |
| [detail-design.md](./detail-design.md) | Developer | DB schema, entities, KpiSettingsResolver, DTOs, controllers, migrations |

## Quick Summary

- **2 new tables**: `project.project_configs`, `tenant.org_settings`
- **2 endpoint groups**: `/v1/projects/:id/settings`, `/v1/org-config/settings`
- **1 shared service**: `KpiSettingsResolver` — resolves dynamic weights for the KPI formula
- **KPI weights fully dynamic**: Project override → Org default → System default (50/30/20)
- **Bonus points system**: Configurable bonus points, toggleable per-project or per-org
- **Related**: KPI module reads config from here; working-time module (holidays/working hours) remains separate
