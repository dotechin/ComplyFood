# ComplyFood

## English

### What it is
**ComplyFood** is a web-based HACCP compliance automation platform focused on independent food businesses, with the current MVP beta centred on Italian restaurants and trattorie. It helps operators digitise daily checks, maintain compliance logs, generate audit-ready reports, and track manual overrides of automated entries.

### Why it exists
Manual HACCP paperwork is time-consuming, error-prone, and hard to audit. ComplyFood reduces that burden by pre-filling routine entries, sending reminders, and keeping a full traceable history of every record — including corrections.

### MVP features
- Business profile and location setup
- Role-based access (Admin / Staff / Auditor)
- Daily operational logs (temperature, cleaning, receiving, incidents)
- Reusable checklist templates and daily task generation
- Automation presets and reminders
- Override system with mandatory reason and full audit trail
- Compliance reporting: PDF / CSV export
- Document storage

### Tech stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | Node.js (NestJS) |
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
1. **Phase 1 – Rebaseline and Foundation Completion:** align docs and status reporting with verified implementation evidence
2. **Phase 2 – Core Operations Workflow:** keep daily logs, checklists, and override workflows covered by automated regression tests
3. **Phase 3 – Automation Execution:** keep presets, generated daily forms, reminders, and dashboard flows covered by automated regression tests
4. **Phase 4 – Reporting and Storage Completion:** keep exports, filters, incident summaries, and document storage covered by automated regression tests
5. **Phase 5 – Release Readiness Proof:** execute staging validation, record performance evidence, and complete beta onboarding only after the proof gates pass

### Local staging
A self-contained, production-like stack you can run on your machine to execute
the Phase 5 staging validation. It builds the same production images used in
deployment but ships its own Postgres and MinIO (S3), runs database migrations
before the API boots, and uses isolated ports/volumes so it can run alongside
the dev stack.

```bash
# Optional: override defaults (JWT secret, DB password, etc.)
cp .env.staging.example .env.staging

# Build images, run migrations, and start the stack
./scripts/staging-up.sh

# Same, but also load demo data
./scripts/staging-up.sh --seed

# Stop (add --volumes to also wipe the Postgres/MinIO data)
./scripts/staging-down.sh
```

Once up:
- Web: http://localhost:3100
- API: http://localhost:4100/api/v1
- MinIO console: http://localhost:9003

### Current status
- Monorepo, NestJS API, and Next.js web app are implemented and wired together
- Core modules include authentication/bootstrap, organization and user setup, daily logs, checklists, overrides, reports, documents, audit, reminders, automation, and HACCP manual workflows
- CI runs install, lint, build, and test through GitHub Actions
- Backend automated coverage includes unit tests, pg-mem-backed integration tests, and API end-to-end smoke coverage
- The product is a working MVP foundation, but release readiness still depends on captured staging validation evidence, performance results, and live beta onboarding outcomes
