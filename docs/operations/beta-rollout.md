# Beta Rollout Checklist

## Objective
Validate the MVP with a small number of food businesses before production rollout.

## Entry criteria
- CI passes on every change
- Password reset, logs, overrides, checklists, reminders, reports, and document upload work end to end
- Core authorization rules are verified for admin, staff, and auditor access
- Staging validation is executed with `docs/operations/staging-validation.md`
- Performance checks are executed with `docs/operations/performance-checks.md`

## Pilot group
- 2–3 food businesses in the initial target segment (independent restaurants/trattorie)
- At least 1 admin user and 2 staff users per business
- One auditor or consultant account for read-only verification where applicable
- Target-sector definition and HACCP form mapping are documented in `docs/product/target-sector-definition.md`
- Sample pilot records are prepared in `docs/operations/pilot-sample-data.json`
- The onboarding flow is captured in `docs/operations/pilot-onboarding.md`

## Test scenarios
- Sign in and recover password
- Update organization profile and locations
- Create and confirm daily logs
- Submit an override with a reason
- Generate checklist tasks and complete them
- Review dashboard reminders
- Export reports and upload documents

## Feedback capture
- Weekly review of usability issues
- Track missing fields, confusing workflows, and reporting gaps
- Record any compliance-specific edge cases raised by pilot users

## Exit criteria
- No critical auth, authorization, or data-loss defects
- Daily workflows can be completed without manual repository intervention
- Pilot users confirm the reports and audit trail are usable for inspections
