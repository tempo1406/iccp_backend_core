# Settings Module

> **Cập nhật**: 2026-04-07

| File | Dành cho | Nội dung |
|---|---|---|
| [basic-design.md](./basic-design.md) | PO, BA, Tech Lead | Nghiệp vụ, các nhóm config, luồng, phân quyền, API list |
| [detail-design.md](./detail-design.md) | Developer | DB schema, entities, KpiSettingsResolver, DTOs, controllers, migrations |

## Tóm tắt nhanh

- **2 bảng mới**: `project.project_configs`, `tenant.org_settings`
- **2 endpoint groups**: `/v1/projects/:id/settings`, `/v1/org-config/settings`
- **1 shared service**: `KpiSettingsResolver` — resolve trọng số động cho KPI formula
- **Trọng số KPI hoàn toàn động**: Project override → Org default → System default (50/30/20)
- **Bonus points system**: Điểm thưởng cấu hình được, bật/tắt per-project hoặc per-org
- **Liên quan**: KPI module đọc config từ đây; Working-time module (ngày lễ/giờ làm) vẫn tách riêng
