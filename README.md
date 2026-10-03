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
- Document storage, PDF text reading, and authorized document deletion

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

### Current status
- Monorepo, NestJS API, and Next.js web app are implemented and wired together
- Core modules include authentication/bootstrap, organization and user setup, daily logs, checklists, overrides, reports, documents, audit, reminders, automation, and HACCP manual workflows
- CI runs install, lint, build, and test through GitHub Actions
- Backend automated coverage includes unit tests, pg-mem-backed integration tests, and API end-to-end smoke coverage
- The product is a working MVP foundation, but release readiness still depends on captured staging validation evidence, performance results, and live beta onboarding outcomes

### PDF documents
- Run database migrations before deploying: `cd apps/api && pnpm exec typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts`.
- PDF uploads are queued for asynchronous text extraction. `GET /api/v1/documents/:id/extract` returns cached full text, page text, basic heading/list detection, and metadata; document lists include `metadata` and `processingStatus`. This is a backend API capability; the Documents page no longer shows extracted text.
- The Documents page is a single library list with a category filter, a collapsible **Upload** panel (category, notes, optional linked log entry, multi-file), and a **Refresh** button. Each row has labeled icon actions:
  - **Show** opens an in-app preview of the original stored PDF (an authenticated fetch rendered as an `application/pdf` object URL), so scanned/image-only PDFs display too. Other file types show a "preview unavailable" message instead of being rendered.
  - **Download** saves the original file under its stored name. It is separate from Show.
  - **Delete** is shown only to the uploader or an organization admin, and it asks for confirmation. `DELETE /api/v1/documents/:id` removes storage and the database record. Linked log entries are preserved.
- The list refreshes after uploads and deletes, when the window regains focus, and on **Refresh**. It polls briefly while PDFs are still being indexed. Out-of-order responses cannot restore deleted rows or drop new uploads.
- `GET /api/v1/documents/:id/download` is organization-scoped. It returns `application/pdf` for recognized PDFs and `application/octet-stream` for everything else, with `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. The document list is also served with `no-store`.
- Uploads are limited to 20 MB; extraction supports up to 1,000 pages and 5 million text characters. Scanned/image-only PDFs return empty text (no OCR); corrupt or password-protected PDFs are marked `failed`. Other file types remain downloadable and return `supported: false` from extraction.
- The extraction queue runs in the API process and reads files from storage one at a time. Pending documents after a restart can be extracted on demand; successful extraction is cached in PostgreSQL.
- Focused checks: `pnpm --filter @complyfood/api run test --runInBand documents`, `pnpm --filter @complyfood/api run test:e2e --runInBand`, and `pnpm --filter @complyfood/web run test` (Documents UI, preview, and library-store tests). Jest uses native ESM support for PDF.js.
