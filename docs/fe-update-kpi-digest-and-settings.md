# FE Integration Guide — KPI Digest & Org Settings Update

> **Date:** 2026-04-18  
> **Branch:** `feat/kpi-target`  
> **Affects:** Org Settings page, new KPI Digest settings section

---

## 1. Summary of Changes

| Area | Change | Impact on FE |
|------|--------|-------------|
| `OrgSettings` API response | New fields: `lastDigestSentAt`, `organizationTimezone` | Display last sent time and bind time pickers to org timezone |
| `OrgSettings` API response | `digestTime`, `quarterlyReportSendTime` now plain `HH:MM` string (was `HH:MM:SS+08`) | No breaking change — same format |
| **New feature** | KPI Digest auto-email (weekly) | New settings section in Org Settings UI |
| Quarterly Report | Auto-send by timezone already existed | No change |

---

## 2. Org Settings API

### `GET /api/v1/org-config/settings`
**Header:** `X-Organization-ID: <orgId>`  
**Auth:** Bearer token, permission `org_config.settings.view`

#### Full Response Shape

```typescript
interface OrgSettingsResponse {
  organizationId: string;
  organizationTimezone: string;      // resolved org timezone, e.g. "Asia/Ho_Chi_Minh" (fallback "UTC")

  // KPI Weights (must sum to 1.0)
  defaultWeightPointCompletion: number;  // 0–1
  defaultWeightOnTime: number;           // 0–1
  defaultWeightOtContribution: number;   // 0–1

  // OT Multipliers
  otMultiplierWeekday: number;
  otMultiplierSaturday: number;
  otMultiplierSunday: number;
  otMultiplierHoliday: number;

  // Bonus
  bonusEnabled: boolean;
  bonusOnTimeTask: number;
  bonusEarlyTaskHours: number;
  bonusEarlyTask: number;
  bonusZeroOverdue: number;
  bonusMaxCap: number;
  bonusOtPerEffectiveHour: number;

  // Notification
  defaultReminderChannels: string[];  // e.g. ["push_notification", "in_app"]

  // ─── KPI Digest (NEW) ────────────────────────────────────────────────────
  digestEnabled: boolean;             // Toggle auto weekly digest
  digestDay: number;                  // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  digestTime: string;                 // "HH:MM" in org's timezone, e.g. "08:00"
  digestRecipients: string[];         // see DigestRecipientGroup enum below
  digestChannels: string[];           // ["email", "in_app"]
  lastDigestSentAt: string | null;    // ISO 8601, null if never sent
  // ─────────────────────────────────────────────────────────────────────────

  // Quarterly Report
  quarterlyReportEnabled: boolean;
  quarterlyReportSendDelayDays: number;   // days after quarter end
  quarterlyReportSendTime: string;        // "HH:MM" in org's timezone
  quarterlyReportRecipientGroups: string[];
  quarterlyReportCustomEmails: string[];
  quarterlyReportChannels: string[];      // ["email"] | ["email", "in_app"] | ["in_app"]
  quarterlyReportScopes: string[];

  updatedAt: string;  // ISO 8601
}
```

FE nen dung `organizationTimezone` de render/edit cac field gio nhu `digestTime` va `periodicReportSchedules[i].sendTime`, thay vi suy ra tu timezone cua browser hay locale hien tai.

---

### `PUT /api/v1/org-config/settings`
**Header:** `X-Organization-ID: <orgId>`  
**Auth:** Bearer token, permission `org_config.settings.manage` (Org Admin only)  
**Body:** All fields optional (partial update)

#### KPI Digest fields in request body

```typescript
interface UpsertOrgSettingsRequest {
  // ... other existing fields ...

  // KPI Digest
  digestEnabled?: boolean;
  digestDay?: number;           // 1–7
  digestTime?: string;          // "HH:MM" format, e.g. "08:00"
  digestRecipients?: DigestRecipientGroup[];
  digestChannels?: string[];    // ["email", "in_app"]
}
```

---

## 3. Enums & Constants

### `DigestRecipientGroup` (reuses same values as Quarterly Report)

```typescript
enum DigestRecipientGroup {
  OWNER           = 'owner',
  ORG_ADMIN       = 'org_admin',
  PROJECT_MANAGER = 'project_manager',
  CONTACT_EMAIL   = 'contact_email',
}
```

### `DigestDay` mapping

```typescript
const DIGEST_DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};
```

---

## 4. KPI Digest Behavior (for FE to display correctly)

### When does the digest send?

The backend cron checks **every minute**:

```
if org.digestEnabled == true
  AND local day-of-week (in org.timezone) == digestDay
  AND local time (in org.timezone) >= digestTime
  AND lastDigestSentAt < this week's Monday 00:00 (in org.timezone)
→ send digest email
```

- **Period covered:** Past 7 days (yesterday back 7 days)
- **Email includes:** Org overview metrics, top 5 projects, top 10 members by performance score
- **Recipients resolved from:** `digestRecipients` groups (members with those roles in the org)

### `lastDigestSentAt` field

| Value | Meaning |
|-------|---------|
| `null` | Digest has never been sent for this org |
| ISO date string | Last time digest was successfully sent |

Use this to show "Last sent: X days ago" or "Never sent" in the UI.

---

## 5. Quarterly Report — No Breaking Change

`digestTime` and `quarterlyReportSendTime` were previously returned as `"08:00:00+08"` (PostgreSQL `TIME` type with connection timezone). They are now returned as plain `"08:00"` (`VARCHAR(5)`).

**If FE was already parsing only the first 5 characters:** no change needed.  
**If FE was parsing the full string:** update to handle `"HH:MM"` format only.

Quarterly report now also supports channel selection similar to KPI Digest:
- `email`
- `in_app`

Backward-compatible default for existing orgs:
- `quarterlyReportChannels = ["email"]`

---

## 6. UI Suggestions — KPI Digest Settings Section

Suggested fields in a new **"KPI Digest"** section within the Org Settings page:

```
┌─ KPI Digest ─────────────────────────────────────────────────────┐
│                                                                   │
│  Enable weekly KPI digest email     [Toggle: ON/OFF]             │
│                                                                   │
│  Send on                            [Select: Monday ▼]           │
│                                                                   │
│  Send at (org timezone)             [TimePicker: 08:00]          │
│                                                                   │
│  Recipients                         [MultiSelect checkboxes]     │
│    ☑ Organization Owner                                          │
│    ☑ Org Admins                                                  │
│    ☐ Project Managers                                            │
│    ☐ Contact Email                                               │
│                                                                   │
│  Last sent                          Apr 11, 2026 at 08:03        │
│                                     (or "Never")                 │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 7. Example API Calls

### Enable KPI Digest (every Friday 08:00, send to admins)

```http
PUT /api/v1/org-config/settings
X-Organization-ID: <orgId>
Authorization: Bearer <token>
Content-Type: application/json

{
  "digestEnabled": true,
  "digestDay": 5,
  "digestTime": "08:00",
  "digestRecipients": ["owner", "org_admin"]
}
```

### Disable KPI Digest

```http
PUT /api/v1/org-config/settings
X-Organization-ID: <orgId>

{
  "digestEnabled": false
}
```

### Read current settings (check lastDigestSentAt)

```http
GET /api/v1/org-config/settings
X-Organization-ID: <orgId>

// Response includes:
// "lastDigestSentAt": "2026-04-11T01:03:42.000Z"  ← UTC ISO string
// "digestDay": 5
// "digestTime": "08:00"
// "digestEnabled": true
```

---

## 8. Migration Notes

Two DB migrations were added (run automatically on deploy):

| Migration | What it does |
|-----------|-------------|
| `1769000000000-FixTimeColumnsToVarchar` | Converts `digest_time` and `quarterly_report_send_time` columns from PostgreSQL `TIME` → `VARCHAR(5)` |
| `1770000000000-AddKpiDigestTracking` | Adds `last_digest_sent_at TIMESTAMPTZ` column to `org_settings` |

No data loss — existing `TIME` values are preserved as `HH:MM` strings.
