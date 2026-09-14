# Staging Validation Execution — 2026-09-14

## Objective
Execute the staging validation cycle defined in `docs/operations/staging-validation.md` and capture release-readiness evidence before performance profiling or pilot onboarding.

## Execution status
- **State:** Blocked
- **Reason:** No staging endpoint, runtime access, and deployment evidence were provided in this repository session.
- **Policy applied:** Performance checks and pilot onboarding remain blocked until this run is completed and all exit criteria pass.

## Preconditions check
| Precondition | Status | Evidence / note |
|---|---|---|
| Deployment completed with `/home/runner/work/ComplyFood/ComplyFood/docs/operations/deployment.md` variables | Blocked | Deployment target and runtime values not available in this session |
| Database migrations applied from `apps/api` | Blocked | Staging database access not available in this session |
| S3-compatible storage reachable | Blocked | Staging storage endpoint/credentials not available in this session |
| Pilot-like organization available for test | Blocked | Staging org data and access not available in this session |

## Validation flow execution log

### 1) Authentication
| Step | Role | Result | Evidence |
|---|---|---|---|
| Bootstrap first organization | Admin | Blocked | Pending staging API/UI access |
| Sign in as admin | Admin | Blocked | Pending staging API/UI access |
| Verify admin app access (Settings/Reports/Documents/Checklists/Dashboard) | Admin | Blocked | Pending staging API/UI access |
| Request + confirm password reset | Admin | Blocked | Pending staging API/UI access |
| Sign in with new password | Admin | Blocked | Pending staging API/UI access |

### 2) Onboarding and reminders
| Step | Role | Result | Evidence |
|---|---|---|---|
| Add one location | Admin | Blocked | Pending staging API/UI access |
| Add at least two staff users | Admin | Blocked | Pending staging API/UI access |
| Create one preset + one reminder rule | Admin | Blocked | Pending staging API/UI access |
| Generate today’s tasks | Admin | Blocked | Pending staging API/UI access |
| Verify pending tasks + due reminders on dashboard | Admin/Staff | Blocked | Pending staging API/UI access |
| Acknowledge one reminder and verify removal | Staff | Blocked | Pending staging API/UI access |

### 3) Daily workflow and documents
| Step | Role | Result | Evidence |
|---|---|---|---|
| Create temperature log | Staff/Admin | Blocked | Pending staging API/UI access |
| Confirm log as staff | Staff | Blocked | Pending staging API/UI access |
| Submit one override with mandatory reason | Staff | Blocked | Pending staging API/UI access |
| Upload one general + one HACCP manual document | Admin | Blocked | Pending staging API/UI access |
| Download both files and verify name/category | Admin | Blocked | Pending staging API/UI access |

### 4) Reporting
| Step | Role | Result | Evidence |
|---|---|---|---|
| Open reports with and without filters | Admin | Blocked | Pending staging API/UI access |
| Export CSV and verify created entries | Admin | Blocked | Pending staging API/UI access |
| Export PDF and verify summary alignment | Admin | Blocked | Pending staging API/UI access |
| Verify incident/exception/override counts | Admin | Blocked | Pending staging API/UI access |

## Required evidence mapping
| Release-readiness item | Status | Evidence location |
|---|---|---|
| Login evidence captured | Blocked | Add staging run output here |
| Password reset evidence captured | Blocked | Add staging run output here |
| Reminder generation and acknowledgement evidence captured | Blocked | Add staging run output here |
| General and HACCP manual document upload/download evidence captured | Blocked | Add staging run output here |
| CSV export evidence captured | Blocked | Add staging run output here |
| PDF export evidence captured | Blocked | Add staging run output here |
| Deployment parity confirmed | Blocked | Add env parity snapshot here |

## Strict fail handling log
Use this table immediately when any step fails during the live run.

| Timestamp | Run step | Role | Error | Environment/log reference | Action |
|---|---|---|---|---|---|
| _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | Block performance checks and pilot onboarding until fixed and re-run |

## Completion gate for this step
This staging validation step is complete only when:
1. All preconditions are satisfied in staging.
2. All runbook scenarios pass end to end without manual DB intervention.
3. Evidence for login, password reset, reminders, documents, CSV export, PDF export, and deployment parity is captured.
4. Any failures are fixed and re-validated.

Only after these conditions are met can the next step begin: `docs/operations/performance-checks.md`.
