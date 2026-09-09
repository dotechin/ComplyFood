# Architecture Overview — ComplyFood

## English

### System overview
ComplyFood is a web-based HACCP compliance automation platform. The system follows a client-server architecture with a clear separation between the frontend application, the backend API, and the data layer. It is designed to be cloud-hosted, containerised, and horizontally scalable.

---

### High-level architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│              Next.js + TypeScript + Tailwind         │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / REST or GraphQL
┌────────────────────────▼────────────────────────────┐
│                    API Layer                          │
│            Node.js (NestJS) / FastAPI                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │   Auth   │ │   Logs   │ │Automation│ │Reports │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
└───────────┬────────────────────────────┬────────────┘
            │                            │
┌───────────▼──────────┐   ┌─────────────▼───────────┐
│     PostgreSQL DB     │   │  File Storage (S3-compat)│
└──────────────────────┘   └─────────────────────────┘
```

---

### Component breakdown

#### Frontend — `apps/web`
- Framework: **Next.js** (React, TypeScript)
- Styling: **Tailwind CSS**
- State: React Query / Zustand
- Auth: session cookies or JWT stored securely
- Key pages: Dashboard, Daily Logs, Reports, Settings, Override Center

#### Backend API — `apps/api`
- Runtime: **Node.js with NestJS** (or Python FastAPI as alternative)
- REST API with JSON responses
- JWT-based authentication with RBAC middleware
- Modules: Auth, Users, Organizations, Logs, Checklists, Automation, Overrides, Reports, Documents

#### Database — PostgreSQL
- Primary relational datastore
- Main entities: `users`, `organizations`, `locations`, `roles`, `checklist_templates`, `checklist_entries`, `daily_logs`, `override_records`, `documents`, `incidents`, `audit_events`, `reminder_rules`
- All write operations generate an `audit_event` record

#### File storage
- S3-compatible object storage (AWS S3, Cloudflare R2, or self-hosted MinIO)
- Stores uploaded PDFs, images, and generated report files
- File references stored in the database; files served via signed URLs

#### Reporting service
- PDF generation: Puppeteer or WeasyPrint
- CSV export: streaming generation for large datasets
- Triggered on-demand or via scheduled jobs

---

### Key architectural decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| API style | REST (v1) | Simple, widely understood, easy to test |
| Auth | JWT + RBAC | Stateless, role-controlled, standard |
| DB | PostgreSQL | Relational integrity, JSONB flexibility, strong ecosystem |
| Containerisation | Docker / Docker Compose | Reproducible environments, easy deployment |
| PDF reports | Server-side generation | Consistent formatting, no client-side dependency |
| Override tracking | Immutable audit log | Compliance requirement — records must not be deleted |

---

### Security considerations
- All API endpoints require authentication (except login / password reset)
- RBAC enforced at the API layer on every route
- Override records and audit events are append-only; no delete endpoint exposed
- File uploads are virus-scanned and size-limited
- HTTPS enforced in production
- Secrets managed via environment variables; no credentials in source code

---

### Deployment topology (target)
```
Internet → Load Balancer → [Web container] → [API container] → [PostgreSQL]
                                                             → [S3 Storage]
```
- Containerised with Docker
- Orchestrated with Docker Compose (dev) or Kubernetes (production)
- Database backups automated daily
- Logs shipped to centralised logging (e.g. CloudWatch, Loki)

---

### Repository structure
```
ComplyFood/
├─ apps/
│  ├─ web/              # Next.js frontend
│  └─ api/              # Backend API (NestJS or FastAPI)
├─ packages/
│  ├─ ui/               # Shared React component library
│  ├─ shared/           # Shared TypeScript types and utilities
│  └─ config/           # Shared ESLint, Prettier, tsconfig
├─ docs/
│  ├─ product/          # Product specs (MVP scope, vision, plan)
│  └─ architecture/     # Technical architecture docs
├─ infra/               # Docker, Kubernetes, Terraform configs
├─ scripts/             # Dev and deployment utility scripts
├─ tests/               # Integration and end-to-end tests
└─ README.md
```
