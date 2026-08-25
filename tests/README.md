# ComplyFood Integration & E2E Tests

This directory contains integration and end-to-end test suites.

## Structure

- `integration/` — Supertest API integration tests (runs against a real DB)
- `e2e/` — Playwright browser end-to-end tests

## Running

```bash
# Integration tests (from repo root)
pnpm test

# E2E tests (requires the app to be running)
pnpm test:e2e
```
