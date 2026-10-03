# ComplyFood Automated Test Coverage

This repository has unit, integration, and API end-to-end coverage for the backend, plus Jest unit and render tests for the web app.

## Structure

- `apps/api/src/**/*.spec.ts` — Jest unit and pg-mem-backed integration tests
- `apps/web/**/*.spec.ts(x)` — Jest tests for web helpers, stores, and server-rendered components (Node environment, no browser)
- `apps/api/test/*.e2e-spec.ts` — Jest API end-to-end smoke tests against a Nest app backed by pg-mem
- `tests/` — shared test documentation and future cross-app test assets

## Running

```bash
# Unit + integration tests (from repo root)
pnpm test

# API E2E smoke tests
pnpm test:e2e
```
