# MVP Scope — ComplyFood

## English

### Purpose
This document defines the scope of the Minimum Viable Product (MVP) for ComplyFood. The MVP aims to deliver core HACCP compliance automation functionality that can be used, tested, and iterated upon quickly.

---

### User roles

| Role | Description |
|------|-------------|
| **Admin / Owner** | Full access: setup, configuration, all logs, reports, user management |
| **Staff member** | Daily operations: create and confirm entries, use override with reason |
| **Auditor / Consultant** | Read-only access to logs and reports (planned for a later phase) |

---

### Core modules

#### A. Authentication and access
- Email/password login and logout
- Role-based access control (RBAC)
- Password recovery flow
- Basic organization and user setup

#### B. Business setup
- Company name, address, operating category
- Location / site management
- Compliance profile configuration
- Working hours and schedule settings

#### C. Daily HACCP operations
- **Temperature logs** — equipment, storage, receiving
- **Cleaning / sanitation logs** — tasks, products, responsible person
- **Opening / closing checklists** — daily verification tasks
- **Supplier intake logs** — deliveries, lot numbers, temperature at arrival
- **Incident / anomaly logs** — non-conformities, corrective actions

#### D. Automation engine
- Preset values for recurring tasks (exact calibration to be defined later)
- Auto-generated daily forms based on business profile
- Scheduled reminders for pending tasks
- Default compliance templates by business type
- Recurrence rule configuration

#### E. Override system *(key MVP requirement)*
- Manual override of any preset or auto-generated value
- Mandatory reason / justification field
- Timestamp and user identification for every override
- Audit log: original value → overridden value, reason, user, time
- Optional approval workflow (post-MVP)

#### F. Reporting
- Daily and weekly compliance summaries
- Full compliance history with date and type filters
- Export to PDF and CSV
- Exception and override reports

#### G. Document storage
- Upload PDFs, images, and documents
- Store certificates, procedures, receipts, inspection files
- Link documents to specific logs, checklists, or incidents

---

### MVP boundaries (out of scope for v1)
- Multi-language UI (English-only in v1)
- Advanced rule engine calibration (framework is built; values TBD)
- Auditor / consultant portal
- Mobile offline mode
- Multi-tenant / SaaS billing
- Third-party integrations (ERP, supplier systems)

---

### Key MVP user flows

#### Flow 1 — Daily use
1. User logs in
2. Dashboard shows today's required tasks
3. System pre-fills standard values based on presets
4. User confirms entries or overrides values with a reason
5. Entries are saved with full audit history
6. Reports are available for review and export

#### Flow 2 — Override
1. System proposes a preset entry
2. User modifies a value
3. User enters a mandatory reason
4. System records: original value, new value, user, timestamp
5. Entry remains fully traceable in audit log

#### Flow 3 — Compliance review
1. Admin opens the reports section
2. Filters by date range, location, or task type
3. Downloads PDF or CSV
4. Reviews exceptions and override history
