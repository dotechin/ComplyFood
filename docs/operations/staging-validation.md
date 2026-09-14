# Staging Validation Runbook

## Objective
Verify the release candidate in a production-like environment before pilot onboarding.

## Preconditions
- Deployment completed with the environment variables from `/home/runner/work/ComplyFood/ComplyFood/docs/operations/deployment.md`
- Database migrations applied from `/home/runner/work/ComplyFood/ComplyFood/apps/api`
- S3-compatible storage reachable
- At least one pilot-like organization available for testing

## Environment checklist
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WEB_URL`
- `NEXT_PUBLIC_API_URL`
- `STORAGE_DRIVER`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

## Evidence to capture
| Area | Evidence |
|------|----------|
| Login | Successful sign-in and `/auth/me` result |
| Password reset | Reset request result, reset confirmation result, successful login with new password |
| Reminders | Reminder rule, generated reminder event, dashboard visibility, acknowledgement result |
| Documents | Upload result, stored metadata, successful download |
| Reports | Summary response, CSV export, PDF export |
| Deployment parity | Confirmed env values, storage driver, and URLs used by the deployed stack |

## Validation flow

### 1. Authentication
1. Create the first organization with the public bootstrap flow.
2. Sign in as the admin user.
3. Confirm the admin can open Settings, Reports, Documents, Checklists, and Dashboard.
4. Request a password reset and complete the reset flow.
5. Sign in again with the new password.

### 2. Onboarding and reminders
1. Add one location.
2. Add at least two staff users.
3. Create one preset and one reminder rule for temperature tasks.
4. Generate today’s tasks.
5. Confirm pending tasks and due reminders appear on the dashboard.
6. Acknowledge one reminder and confirm it disappears from the due list.

### 3. Daily workflow and documents
1. Create a temperature log.
2. Confirm the log as a staff user.
3. Submit one override with a mandatory reason.
4. Upload one general document and one HACCP manual document as an admin.
5. Download both files and confirm the stored names and categories are correct.

### 4. Reporting
1. Open the reports screen with and without filters.
2. Export CSV and confirm the file contains the created log entries.
3. Export PDF and confirm the summary matches the visible report data.
4. Confirm incident, exception, and override counts match the seeded activity.

## Exit criteria
- All scenarios above pass without manual database intervention
- Storage uses the intended driver and persists uploaded files
- Report exports complete successfully
- No critical auth, authorization, or data-loss issue is found

## If validation fails
- Record the failing step, affected user role, and exact API/UI error
- Capture the relevant environment setting, job log, or server log
- Block pilot onboarding until the issue is fixed and the scenario is re-run
