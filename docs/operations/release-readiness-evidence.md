# Release Readiness Evidence

## Purpose
Capture the real execution evidence that is still missing from the repository before pilot onboarding.

## Current RAG
- **Green:** codebase foundations and backend automated regression coverage
- **Amber:** operational readiness is only partially proven until staging and performance checks are executed
- **Red:** there is no recorded evidence yet for successful staging validation, measured performance, or completed pilot onboarding

## Active execution record
- Current staging validation record: `docs/operations/staging-validation-execution-2026-09-14.md`
- Current state: **Blocked** (staging runtime access and deployment evidence not yet available in this session)
- Rule: do not start performance checks or pilot onboarding until the staging validation execution record is fully passed.

## Evidence still required

### 1. Staging validation
- [ ] Login evidence captured
- [ ] Password reset evidence captured
- [ ] Reminder generation and acknowledgement evidence captured
- [ ] General and HACCP manual document upload/download evidence captured
- [ ] CSV export evidence captured
- [ ] PDF export evidence captured

### 2. Performance checks
- [ ] Dashboard timing recorded
- [ ] Report summary timing recorded
- [ ] CSV export timing recorded
- [ ] PDF export timing recorded
- [ ] Document upload timing recorded
- [ ] Document download timing recorded

### 3. Beta onboarding
- [ ] Pilot businesses selected
- [ ] Sample data prepared
- [ ] First pilot onboarding completed
- [ ] Weekly feedback loop started

## Exit gate
Do not mark beta rollout ready until all staging and performance evidence above is recorded and the first pilot onboarding is completed without engineering intervention.
