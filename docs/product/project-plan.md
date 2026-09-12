---
title: "ComplyFood — Project Plan"
subtitle: "HACCP Compliance Automation Platform"
date: "2026-08-25"
version: "1.1"
status: "Active working plan"
---

# ComplyFood — Project Plan

**Version:** 1.1 | **Date:** 2026-08-25 | **Status:** Active working plan

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
│  └─ api/              # Backend — Node.js (NestJS)
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

## Current Delivery Status

The repository is no longer at the concept-only stage. The monorepo, NestJS API, Next.js web app, shared packages, database migration, and initial domain modules are already implemented. The current project need is to rebaseline delivery status, close the highest-value workflow gaps, and start using this plan as a live execution document instead of a draft.

### Current status summary

| Area | Status | Notes |
|------|--------|-------|
| Repository and workspace | In place | pnpm + Turborepo monorepo with web, api, shared UI, and shared config |
| Backend stack decision | Implemented | NestJS is already the working backend |
| Frontend shell and navigation | In place | Main authenticated app pages and auth pages exist |
| Core schema and modules | In place | Organizations, users, logs, overrides, documents, audit, reports, automation |
| CI/CD | Implemented | GitHub Actions runs lint, build, and tests |
| Password recovery | Implemented foundation | Request and confirm reset flows exist; production delivery details still need operational verification |
| Daily operations workflow | Implemented foundation | Daily logs UI, checklist task generation, and override submission are available |
| Reporting and storage | Implemented foundation | Summary, filtered exports, incident/override summaries, and S3-compatible storage are in place |
| Hardening and release readiness | In progress | Automated tests and delivery docs exist, but staging verification and beta execution are still pending |

---

## Milestones

### Phase 1 — Rebaseline and Foundation Completion
- [x] Repository setup and workspace tooling
- [x] CI/CD pipeline
- [x] Authentication: login, logout, JWT, RBAC
- [x] Password recovery completion
- [x] Organization and user setup foundations
- [x] Database schema (core entities)
- [x] Basic UI layout and navigation
- [x] Phase output: roadmap and architecture docs aligned with implemented system

### Phase 2 — Core Operations Workflow
- [x] Daily log management UI
- [x] Log creation/edit flows for temperature, cleaning, receiving, and incidents
- [x] Checklist template management and usage workflow
- [x] Override submission flow wired into the UI
- [x] Override persistence with audit trail in the backend
- [x] Audit history view foundation

### Phase 3 — Automation Execution
- [x] Preset value configuration foundation
- [x] Auto-generated daily forms foundation
- [x] Reminder and notification delivery
- [x] Dashboard with today's required actions foundation
- [x] Automation calibration rules and recurrence depth

### Phase 4 — Reporting and Storage Completion
- [x] PDF and CSV export foundation
- [x] Report filters (date, location, task type, status)
- [x] Incident summaries
- [x] Document upload and download foundation
- [x] S3-compatible storage integration
- [x] Override / exception reports

### Phase 5 — Hardening and Release
- [x] Security review and authorization hardening
- [ ] Performance optimisation
- [ ] Beta testing with real business users
- [x] Deployment preparation documentation
- [x] User documentation

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js (NestJS) |
| Database | PostgreSQL |
| Authentication | JWT, RBAC |
| File Storage | S3-compatible object storage (with MinIO-compatible development setup) |
| PDF Generation | Puppeteer or WeasyPrint |
| Containerisation | Docker, Docker Compose |
| Production Hosting | Cloud (AWS / GCP / Azure) with automated backups |

---

## Phase-by-Phase Action Plan

1. **Phase 1 — Rebaseline and foundation completion**
   - Update roadmap, README, and architecture documentation to match the codebase
   - Add CI workflows and define required quality gates
   - Finish password reset end to end
   - Confirm that auth, organization, and role-management flows are complete enough to support daily use

2. **Phase 2 — Core operations workflow**
   - Deliver the missing daily logs UI
   - Connect override creation to real user actions in the web app
   - Expand checklist workflows from template listing to operational use
   - Close gaps between backend capability and operator-facing flows

3. **Phase 3 — Automation execution**
   - Turn reminder rules into actual reminders
   - Define preset calibration and recurrence behavior by business type
   - Improve dashboard actionability and daily task generation visibility

4. **Phase 4 — Reporting and storage completion**
   - Add reporting filters and exception-focused views
   - Extend incident and override summaries
   - Replace local document persistence with the planned S3-compatible storage model

5. **Phase 5 — Hardening and release**
   - Add integration and end-to-end tests for critical flows
   - Run security and authorization review
   - Prepare beta rollout, production deployment, and user documentation

## Immediate Next Steps

1. [x] Define the first target business profile and map its required HACCP forms (`docs/product/target-sector-definition.md`)
2. [ ] Validate reminder timing and document storage against a real staging environment
3. [ ] Expand test coverage from unit tests to integration and end-to-end scenarios
4. [ ] Prepare pilot data and onboard the first beta businesses
5. [ ] Profile performance of report generation, dashboard loading, and document transfer

---

*Document prepared for the ComplyFood project. For questions or updates, open an issue in the repository or contact the project owner.*
