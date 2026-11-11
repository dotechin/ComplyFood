# ComplyFood

ComplyFood is a web-based HACCP compliance platform for food businesses. It helps teams manage daily operational checks, maintain an auditable record of compliance activity, and prepare reports.

## Features

- Daily logs for temperature, cleaning, receiving, and incidents
- Reusable checklists, reminders, and automation presets
- Role-based access, audit history, and documented overrides
- Compliance reports and organization document storage
- PDF upload, preview, download, and asynchronous text extraction

## Technology

| Layer | Technology |
| --- | --- |
| Web | Next.js, TypeScript, Tailwind CSS |
| API | NestJS, Node.js |
| Database | PostgreSQL |
| Storage | Local filesystem or S3-compatible storage |
| Development and deployment | pnpm workspaces, Docker Compose |

## Local Deployment

### Requirements

- Git
- Docker Engine/Desktop with Docker Compose

Run commands from the repository root. To update and start the local staging stack:

```bash
git pull
bash scripts/staging-up.sh
```

The staging stack builds the web and API images, starts PostgreSQL, runs database migrations, and stores uploaded files in a local Docker volume. The default configuration is intended for local use; it includes development credentials and must not be exposed to the public internet.

When the stack is ready:

- Web app: <http://localhost:3100>
- API: <http://localhost:4100/api/v1>

Optional local deployment commands:

```bash
bash scripts/staging-up.sh --seed  # load demo data
bash scripts/staging-down.sh       # stop the stack and preserve data
bash scripts/staging-down.sh --volumes  # stop the stack and delete its data
```

The seed option provides demo accounts `admin@demo.com` and `staff@demo.com`, both with password `password123`. Do not use these credentials outside a local environment. To override staging defaults, create `.env.staging` in the repository root; see `infra/docker-compose.staging.yml` for the supported variables.

To update and start the full local stack instead, copy `.env.example` to `.env` and set the required backend values, then run:

```bash
./scripts/update-local.sh
```

This command runs `git pull --ff-only`, then rebuilds and starts the API and web app with the production and Tailscale Compose configuration. It preserves existing data volumes. The web app is available at <http://localhost:3100> and the API at <http://localhost:4000/api/v1>.

## Development

Install workspace dependencies with pnpm 9 or later and Node.js 20 or later:

```bash
pnpm install
pnpm dev
```

The development services use the root `infra/docker-compose.yml` configuration; consult that file and `docs/operations/deployment.md` for the required environment and service setup.

Useful workspace checks:

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
```

CI runs install, lint, build, and test workflows. Web tests can be run independently with `pnpm --filter @complyfood/web run test`; API tests with `pnpm --filter @complyfood/api run test`.

## Repository Layout

```text
apps/
  api/       NestJS API and database migrations
  web/       Next.js web application
packages/
  config/    Shared configuration
  shared/    Shared types and utilities
  ui/        Shared UI components
docs/        Product, architecture, user, and operations documentation
infra/       Docker and deployment configuration
scripts/     Local staging and database scripts
tests/       Integration and end-to-end test documentation
```

## Project Status

ComplyFood is a working MVP foundation. Core workflows include authentication, organization setup, daily logs, checklists, overrides, reports, documents, reminders, automation, and HACCP manual workflows. Release readiness still depends on completing staging validation, performance evidence, and beta onboarding.

### Resume the daily-check and Supermode work

The following is a handoff prompt for continuing the unfinished implementation:

```text
Complete the Supermode and daily-check workflow. First inspect the current
checkout and existing changes; do not assume the partial work below is present
or complete. Preserve existing records and unrelated changes.

The goal is to reduce manual registration without inventing official records:
- Provide a PIN-protected Supermode configuration for an opt-in server-side
  daily or weekly schedule, opening days, appliances and temperature limits.
  The schedule must work with the browser closed and survive restarts.
- A daily schedule prepares pending checks; a weekly schedule prepares separate
  pending checks for each opening day in the coming week. Support a chosen time
  and time zone, missed runs, error visibility and duplicate prevention.
- Provide one daily screen where a person confirms checks actually performed,
  enters actual temperature readings, and records exceptions and corrective
  actions. Record who confirmed and when; do not generate official readings or
  completed checks. Unfinished checks remain pending.
- Store temperature readings and settings on the server for use across devices.
  Existing readings are browser-local and not organization-scoped. The sample
  registry may still mark a manually edited reading as sample. Require an
  administrator to review and classify ambiguous existing readings before
  import, retain browser originals, and surface conflicts rather than silently
  overwriting or classifying them.
- Separate simulated data into a clearly labeled demo view within the same
  organization. Exclude it from normal logs, dashboards, compliance reports and
  exports. Review existing sample markers and preserve historical and real
  records; do not assume unmarked records are real or delete ambiguous data.
  Sample removal must not remove real or historical records.
- Show pending, completed and overdue checks appropriately, retain an audit
  trail, enforce organization and role boundaries, and document operation and
  recovery. Add focused tests for scheduling, time zones, concurrency, restart
  recovery, migration, authorization, sample isolation and reports.

Partial work exists in this development session: marked samples are excluded
from report summaries and exports, and clearing samples retains browser
temperature readings for review. These changes do not isolate samples from
normal logs or dashboards, and cannot identify unmarked samples. The scheduler,
daily workflow, server-side temperature migration and demo view are not yet
implemented. Verify all behavior rather than relying on this status note.
```

## PDF and Documents

The Documents feature stores organization files, supports viewing and downloading PDFs, and extracts text from supported PDFs asynchronously. Scanned/image-only PDFs do not currently receive OCR. The PDF API details and limits are implementation-specific and are maintained alongside the document service and tests rather than as a standalone README section.

For operational and product details, see [`docs/`](docs/), especially [`docs/operations/deployment.md`](docs/operations/deployment.md) and [`docs/operations/user-guide.md`](docs/operations/user-guide.md).
