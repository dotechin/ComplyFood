# Accounting and HACCP Planning

## Vision

Expand ComplyFood into a single, low-cost operational platform for food businesses: HACCP compliance, purchasing and invoice records, cost control, management checks, and accounting-ready exports in one place.

The first important convergence is invoice-receipt automation: an uploaded invoice or receipt should be extracted, matched to products and suppliers, and used to complete related HACCP receiving records with a human review step.

## Feasibility and budget

This is feasible while keeping infrastructure costs low to zero during an MVP phase, provided the system is built incrementally and avoids paid AI/OCR services until they are necessary.

The lowest-cost approach is:

- Reuse the existing PostgreSQL database, document storage, authentication, audit trail, and asynchronous text-extraction pipeline.
- Support PDFs and clear receipt images first.
- Use local or open-source OCR where practical; keep paid OCR/LLM providers optional behind an adapter.
- Extract structured fields with deterministic parsing and validation before introducing AI.
- Require a user to review and confirm extracted data before it changes HACCP records or accounting totals.
- Store the original document, extracted values, confidence, reviewer, and correction history for auditability.
- Export accounting-ready CSV/CSV-compatible data rather than implementing a complete double-entry accounting system initially.

Zero infrastructure cost cannot guarantee zero operating cost: storage, backups, email, OCR processing, tax integrations, and payment/accounting integrations may create costs as usage grows. The MVP should therefore make external services replaceable and default to local/self-hosted processing.

## Recommended phased scope

### Phase 1: Document inbox

- Upload invoices and receipts.
- Classify document type.
- Store supplier, date, invoice number, totals, VAT/tax, currency, and line items.
- Track processing state: uploaded, extracting, needs review, approved, rejected.
- Preserve the original file and extraction metadata.

### Phase 2: Receiving and HACCP link

- Match invoice line items to known ingredients/products and suppliers.
- Create a proposed receiving record from the invoice.
- Pre-fill receiving date, supplier, product, lot/batch, quantity, expiry/best-before date, and temperature when present.
- Mark missing or ambiguous HACCP fields clearly instead of guessing.
- Require approval before writing the final HACCP form.
- Keep a link from the HACCP entry back to the source invoice.

### Phase 3: Purchasing and stock controls

- Supplier and product master data.
- Purchase history and price changes.
- Optional stock movements and expiry alerts.
- Basic spend summaries by supplier, category, and period.
- Duplicate invoice detection.

### Phase 4: Accounting-ready outputs

- VAT/tax summaries by period.
- Expense categorization.
- Export to CSV and a documented accounting format.
- Reconciliation status and correction workflow.
- Add direct integrations only when a real customer need justifies their maintenance cost.

### Phase 5: Optional assisted automation

- Use OCR/AI only for documents that deterministic parsing cannot handle.
- Return structured extraction with confidence and source references.
- Never silently submit AI-generated values to compliance or accounting records.
- Keep provider choice configurable so the application can use local processing, a low-cost provider, or a customer-managed provider later.

## Core safety and compliance rules

- Automation proposes; a responsible user approves.
- Never infer a temperature, lot number, expiry date, or tax value when it is not present or reliable.
- Every change needs an audit event with actor, timestamp, source document, previous value, and new value.
- Original uploaded documents must remain immutable.
- Use per-organization access controls and server-side authorization on every query.
- Encrypt or restrict sensitive financial documents and define retention/deletion rules.
- Treat accounting exports as records requiring review; ComplyFood should not claim to replace regulated accounting or tax advice without jurisdiction-specific validation.

## Initial technical design

- Add document-processing jobs to the existing API rather than blocking web requests.
- Use idempotency keys and document hashes to prevent duplicate processing.
- Model extraction results separately from approved HACCP/accounting records.
- Add confidence and provenance at field level where possible.
- Keep integrations behind interfaces such as `DocumentExtractor`, `AccountingExporter`, and `ProductMatcher`.
- Process large imports in small batches with progress and retry states so a local PC is not overloaded.
- Add retention-aware storage and backups before relying on local-only files for business records.

## First decision checkpoint

Before implementation, validate with one real workflow:

1. Upload one representative supplier invoice or receipt.
2. Extract only supplier, date, invoice number, line items, quantities, expiry dates, and temperature if printed.
3. Show a review screen with highlighted source values and missing fields.
4. Approve it into one receiving/HACCP form.
5. Export the approved purchase record as CSV.

Success means the workflow saves time while leaving a clear, reviewable audit trail. Only then should broader accounting features or paid automation services be added.
