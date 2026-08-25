---
title: "ComplyFood — Project Plan"
subtitle: "HACCP Compliance Automation Platform"
date: "2026-08-25"
version: "1.0"
status: "Draft"
---

# ComplyFood — Project Plan

**Version:** 1.0 | **Date:** 2026-08-25 | **Status:** Draft

---

## Project Vision

ComplyFood is a web-based HACCP compliance automation platform designed to eliminate the daily burden of manual food safety paperwork for small and medium food businesses in Italy. By automating routine registrations, sending smart reminders, and providing audit-ready reporting, ComplyFood lets operators focus on running their business while staying fully compliant with applicable food safety regulations.

The platform is built around a flexible preset and override model: the system handles routine entries automatically, and any manual correction is tracked with a full audit trail — preserving both operational efficiency and compliance integrity.

---

## Problem Statement

Food businesses subject to HACCP regulations (EU Regulation 852/2004 and Italian national guidelines) must maintain daily logs for temperature checks, cleaning operations, supplier intake, and incidents. In practice, this means:

- Repetitive manual paperwork every day, often across multiple locations
- High risk of missing entries, errors, or incomplete records
- Difficult and time-consuming preparation for audits or inspections
- No structured way to track corrections or exceptions
- Paper records that are hard to search, share, or archive securely

There is currently no affordable, practical, and user-friendly tool tailored to small Italian food businesses that solves all of these problems together.

---

## MVP Goals

The Minimum Viable Product (MVP) must:

1. Allow a food business to register daily HACCP operations digitally
2. Pre-fill routine entries based on configurable preset values
3. Track every manual override with a mandatory reason and full audit trail
4. Generate compliance-ready PDF and CSV reports on demand
5. Support role-based access for owners, staff, and future auditors
6. Store documents (certificates, procedures, inspection files) linked to records
7. Be accessible from any modern browser on desktop, tablet, or mobile

The MVP does **not** include: advanced rule engine calibration, auditor portal, mobile offline mode, multi-tenant billing, or third-party integrations. These are planned for subsequent releases.

---

## Proposed Repository Structure

```
ComplyFood/
├─ apps/
│  ├─ web/              # Frontend — Next.js + TypeScript + Tailwind CSS
│  └─ api/              # Backend — Node.js (NestJS) or Python (FastAPI)
├─ packages/
│  ├─ ui/               # Shared React component library
│  ├─ shared/           # Shared types, utilities, constants
│  └─ config/           # Shared ESLint, Prettier, tsconfig
├─ docs/
│  ├─ product/          # Product specs: MVP scope, vision, this plan
│  └─ architecture/     # Technical architecture documentation
├─ infra/               # Docker, Kubernetes, Terraform configurations
├─ scripts/             # Utility scripts for development and deployment
├─ tests/               # Integration and end-to-end test suites
└─ README.md
```

---

## Core Modules

### 1. Authentication and Access
Email/password login, JWT-based sessions, role-based access control (RBAC), password recovery.

### 2. Business Setup
Company profile, locations/sites, operating category, compliance profile configuration, working hours and schedules.

### 3. Daily HACCP Operations
- **Temperature logs** — equipment, cold storage, receiving checks
- **Cleaning / sanitation logs** — task, product used, responsible person
- **Opening / closing checklists** — daily verification tasks
- **Supplier intake logs** — deliveries, lot numbers, temperature at arrival
- **Incident / anomaly logs** — non-conformities, corrective actions

### 4. Automation Engine
Preset values for recurring tasks, auto-generated daily forms, scheduled reminders, default compliance templates by business type, recurrence rule configuration. Exact calibration of preset values is to be defined in a later phase.

### 5. Override System *(core requirement)*
Manual override of any preset or auto-generated entry, mandatory reason/justification field, user identification, immutable audit log of original vs modified values, optional approval workflow (post-MVP).

### 6. Reporting
Daily and weekly compliance summaries, full history with filters, PDF and CSV export, exception and override reports.

### 7. Document Storage
Upload and archive PDFs, images, certificates, procedures, receipts, and inspection files. Documents linked to specific logs, checklists, or incidents.

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin / Owner** | Full access: configure system, manage users, view all logs and reports, export data |
| **Staff member** | Create and confirm daily entries, apply overrides with mandatory reason |
| **Auditor / Consultant** | Read-only access to logs and reports *(planned — post-MVP)* |

---

## Automation and Override Concept

The automation model is built on three principles:

1. **Preset automation** — the system generates daily entries based on configured templates and schedules, reducing the need for manual input on routine tasks.

2. **Confirmed acceptance** — users review and confirm pre-filled entries. Confirmation without changes requires a single action.

3. **Traceable override** — any change to a preset or auto-generated value requires a mandatory reason. The system stores:
   - Original (preset) value
   - Modified value
   - Reason for the change
   - User identity
   - Timestamp

No entry can be silently altered. This design preserves automation efficiency while maintaining the complete audit trail required for HACCP compliance.

The exact calibration of preset values (temperature thresholds, task frequencies, reminder intervals) will be defined in a dedicated configuration phase after the MVP foundation is in place.

---

## Milestones

### Phase 1 — Foundation *(Weeks 1–4)*
- [ ] Repository setup, tooling, CI/CD pipeline
- [ ] Authentication: login, logout, RBAC, password recovery
- [ ] Organization and user setup
- [ ] Database schema (core entities)
- [ ] Basic UI layout and navigation

### Phase 2 — Operations *(Weeks 5–8)*
- [ ] Daily log modules: temperature, cleaning, receiving, incidents
- [ ] Checklist template engine
- [ ] Override system with audit log
- [ ] Audit history view

### Phase 3 — Automation *(Weeks 9–12)*
- [ ] Preset value configuration
- [ ] Auto-generated daily forms
- [ ] Reminder and notification system
- [ ] Dashboard with today's required actions

### Phase 4 — Reporting and Storage *(Weeks 13–16)*
- [ ] PDF and CSV export
- [ ] Report filters (date, location, task type)
- [ ] Incident summaries
- [ ] Document upload and storage
- [ ] Override / exception reports

### Phase 5 — Hardening and Release *(Weeks 17–20)*
- [ ] Security review and penetration testing
- [ ] Performance optimisation
- [ ] Beta testing with real business users
- [ ] Deployment to production cloud
- [ ] User documentation

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js (NestJS) or Python (FastAPI) |
| Database | PostgreSQL |
| Authentication | JWT, RBAC |
| File Storage | S3-compatible (AWS S3 / Cloudflare R2 / MinIO) |
| PDF Generation | Puppeteer or WeasyPrint |
| Containerisation | Docker, Docker Compose |
| Production Hosting | Cloud (AWS / GCP / Azure) with automated backups |

---

## Next Steps

1. **Confirm tech stack** — choose between Node.js/NestJS and Python/FastAPI for the backend
2. **Define business profile** — select the first target sector (e.g. restaurants, bakeries, small food producers) and map the exact daily forms required
3. **Compliance mapping** — document the specific HACCP forms and registration requirements applicable to the target sector and region (Abruzzo / Chieti Province)
4. **Design database schema** — finalise entity relationships and field definitions before coding begins
5. **Set up repository structure** — initialise `apps/web` and `apps/api` with boilerplate, CI, linting, and test infrastructure
6. **Define automation calibration scope** — schedule a dedicated session to define preset values, temperature thresholds, task frequencies, and reminder rules
7. **Identify first beta users** — recruit 2–3 real food businesses willing to test the MVP

---

*Document prepared for the ComplyFood project. For questions or updates, open an issue in the repository or contact the project owner.*
