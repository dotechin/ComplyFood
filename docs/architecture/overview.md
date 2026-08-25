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

---

## Italiano

### Panoramica del sistema
ComplyFood è una piattaforma web per l'automazione della conformità HACCP. Il sistema adotta un'architettura client-server con una netta separazione tra l'applicazione frontend, l'API backend e il livello dati. È progettato per essere ospitato in cloud, containerizzato e scalabile orizzontalmente.

---

### Architettura ad alto livello

```
┌─────────────────────────────────────────────────────┐
│                  Client (Browser)                    │
│            Next.js + TypeScript + Tailwind           │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / REST o GraphQL
┌────────────────────────▼────────────────────────────┐
│                   Livello API                         │
│           Node.js (NestJS) / FastAPI                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │   Auth   │ │   Log    │ │Automazione│ │Report │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
└───────────┬────────────────────────────┬────────────┘
            │                            │
┌───────────▼──────────┐   ┌─────────────▼───────────┐
│    Database PostgreSQL│   │ Archiviazione File (S3) │
└──────────────────────┘   └─────────────────────────┘
```

---

### Descrizione dei componenti

#### Frontend — `apps/web`
- Framework: **Next.js** (React, TypeScript)
- Stile: **Tailwind CSS**
- Stato: React Query / Zustand
- Autenticazione: cookie di sessione o JWT memorizzato in modo sicuro
- Pagine principali: Dashboard, Log giornalieri, Report, Impostazioni, Centro override

#### Backend API — `apps/api`
- Runtime: **Node.js con NestJS** (o Python FastAPI come alternativa)
- API REST con risposte JSON
- Autenticazione JWT con middleware RBAC
- Moduli: Auth, Utenti, Organizzazioni, Log, Checklist, Automazione, Override, Report, Documenti

#### Database — PostgreSQL
- Datastore relazionale principale
- Entità principali: `users`, `organizations`, `locations`, `roles`, `checklist_templates`, `checklist_entries`, `daily_logs`, `override_records`, `documents`, `incidents`, `audit_events`, `reminder_rules`
- Ogni operazione di scrittura genera un record `audit_event`

#### Archiviazione file
- Object storage compatibile S3 (AWS S3, Cloudflare R2 o MinIO self-hosted)
- Archivia PDF caricati, immagini e file di report generati
- I riferimenti ai file sono salvati nel database; i file vengono serviti tramite URL firmati

#### Servizio di reportistica
- Generazione PDF: Puppeteer o WeasyPrint
- Export CSV: generazione in streaming per dataset di grandi dimensioni
- Attivato su richiesta o tramite job pianificati

---

### Decisioni architetturali principali

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Stile API | REST (v1) | Semplice, ampiamente conosciuto, facile da testare |
| Autenticazione | JWT + RBAC | Stateless, controllo dei ruoli, standard |
| DB | PostgreSQL | Integrità relazionale, flessibilità JSONB, ecosistema solido |
| Containerizzazione | Docker / Docker Compose | Ambienti riproducibili, deployment semplice |
| Report PDF | Generazione lato server | Formattazione consistente, nessuna dipendenza client |
| Tracciamento override | Audit log immutabile | Requisito di conformità — i record non devono essere eliminati |

---

### Considerazioni sulla sicurezza
- Tutti gli endpoint API richiedono autenticazione (eccetto login e recupero password)
- RBAC applicato a livello API su ogni route
- I record di override e gli audit event sono solo in append; nessun endpoint di eliminazione esposto
- I file caricati vengono scansionati per virus e limitati in dimensione
- HTTPS obbligatorio in produzione
- I segreti sono gestiti tramite variabili d'ambiente; nessuna credenziale nel codice sorgente

---

### Topologia di deployment (target)
```
Internet → Load Balancer → [Container Web] → [Container API] → [PostgreSQL]
                                                              → [Storage S3]
```
- Containerizzato con Docker
- Orchestrato con Docker Compose (sviluppo) o Kubernetes (produzione)
- Backup del database automatizzati giornalmente
- Log inviati a un sistema di logging centralizzato (es. CloudWatch, Loki)

---

### Struttura del repository
```
ComplyFood/
├─ apps/
│  ├─ web/              # Frontend Next.js
│  └─ api/              # API Backend (NestJS o FastAPI)
├─ packages/
│  ├─ ui/               # Libreria di componenti React condivisi
│  ├─ shared/           # Tipi TypeScript e utilità condivisi
│  └─ config/           # ESLint, Prettier, tsconfig condivisi
├─ docs/
│  ├─ product/          # Specifiche di prodotto (MVP scope, vision, piano)
│  └─ architecture/     # Documentazione architettura tecnica
├─ infra/               # Configurazioni Docker, Kubernetes, Terraform
├─ scripts/             # Script di utilità per sviluppo e deployment
├─ tests/               # Test di integrazione e end-to-end
└─ README.md
```
