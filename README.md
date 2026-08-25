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
1. **Phase 1 – Foundation:** auth, org setup, basic UI, DB schema
2. **Phase 2 – Operations:** daily logs, checklists, override support, audit history
3. **Phase 3 – Automation:** presets, reminders, recurring tasks, dashboard
4. **Phase 4 – Reporting:** exports, filters, incident summaries, document attachments

---

## Italiano

### Cos'è
**ComplyFood** è una piattaforma web per l'automazione della conformità HACCP, pensata per piccole e medie imprese alimentari in Italia. Consente agli operatori di digitalizzare i controlli quotidiani, mantenere registri di conformità, generare report pronti per le ispezioni e tracciare le correzioni manuali delle registrazioni automatiche.

### Perché esiste
La documentazione HACCP cartacea è lenta, soggetta a errori e difficile da auditare. ComplyFood riduce questo carico pre-compilando le registrazioni di routine, inviando promemoria e conservando uno storico completo e tracciabile di ogni record — incluse le eventuali modifiche.

### Funzionalità MVP
- Configurazione profilo aziendale e sedi
- Accesso basato sui ruoli (Admin / Operatore / Revisore)
- Registrazioni operative quotidiane (temperatura, pulizie, ricevimento merci, incidenti)
- Modelli di checklist per tipologia di attività
- Preset di automazione e promemoria
- Sistema di override con campo motivazione obbligatorio e audit trail completo
- Report di conformità: esportazione PDF / CSV
- Archiviazione documenti

### Stack tecnologico
| Livello | Tecnologia |
|---------|------------|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | Node.js (NestJS) o Python (FastAPI) |
| Database | PostgreSQL |
| Autenticazione | JWT / basata sui ruoli |
| Archiviazione | Storage compatibile S3 |
| Report | Generazione PDF + export CSV |
| Infrastruttura | Docker + cloud hosting |

### Struttura del repository
```
ComplyFood/
├─ apps/
│  ├─ web/          # Frontend (Next.js)
│  └─ api/          # API Backend
├─ packages/
│  ├─ ui/           # Componenti UI condivisi
│  ├─ shared/       # Tipi e utilità condivisi
│  └─ config/       # Configurazioni condivise
├─ docs/
│  ├─ product/      # Specifiche e piani di prodotto
│  └─ architecture/ # Documentazione architettura tecnica
├─ infra/           # Configurazione infrastruttura
├─ scripts/         # Script di utilità
├─ tests/           # Test di integrazione ed e2e
└─ README.md
```

### Roadmap
1. **Fase 1 – Fondamenta:** autenticazione, setup organizzazione, UI base, schema DB
2. **Fase 2 – Operazioni:** log giornalieri, checklist, override, audit history
3. **Fase 3 – Automazione:** preset, promemoria, attività ricorrenti, dashboard
4. **Fase 4 – Report:** esportazioni, filtri, sommari incidenti, allegati documenti
