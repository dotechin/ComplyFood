# ComplyFood

## English

### What it is
**ComplyFood** is a web-based HACCP compliance automation platform for small and medium food businesses in Italy. It helps operators digitise daily checks, maintain compliance logs, generate audit-ready reports, and track manual overrides of automated entries.

### Why it exists
Manual HACCP paperwork is time-consuming, error-prone, and hard to audit. ComplyFood reduces that burden by pre-filling routine entries, sending reminders, and keeping a full traceable history of every record — including corrections.

### MVP features
- Business profile and location setup
- Role-based access (Admin / Staff / Auditor)
- Daily operational logs (temperature, cleaning, receiving, incidents)
- Checklist templates by business type
- Automation presets and reminders
- Override system with mandatory reason and full audit trail
- Compliance reporting: PDF / CSV export
- Document storage

### Tech stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | Node.js (NestJS) or Python (FastAPI) |
| Database | PostgreSQL |
| Auth | JWT / role-based |
| Storage | S3-compatible |
| Reports | PDF generation + CSV export |
| Infra | Docker + cloud hosting |

### Repository structure
```
ComplyFood/
├─ apps/
│  ├─ web/          # Frontend (Next.js)
│  └─ api/          # Backend API
├─ packages/
│  ├─ ui/           # Shared UI components
│  ├─ shared/       # Shared types and utilities
│  └─ config/       # Shared configuration
├─ docs/
│  ├─ product/      # Product specs and plans
│  └─ architecture/ # Technical architecture docs
├─ infra/           # Infrastructure configuration
├─ scripts/         # Utility scripts
├─ tests/           # Integration and e2e tests
└─ README.md
```

### Roadmap
1. **Phase 1 – Rebaseline and Foundation Completion:** align docs with implementation, add CI, complete password recovery
2. **Phase 2 – Core Operations Workflow:** daily logs UI, checklists in use, override flow wired end to end
3. **Phase 3 – Automation Execution:** presets, generated daily forms, reminders, dashboard improvements
4. **Phase 4 – Reporting and Storage Completion:** exports, filters, incident summaries, production-grade document storage

### Current status
- Monorepo, NestJS API, and Next.js web app are already in place
- Core modules now include password reset, daily logs, checklists, overrides, reports, documents, audit, reminders, and automation
- CI now runs lint, build, and tests through GitHub Actions
- Current priorities are target-sector definition, staging validation, and beta onboarding
