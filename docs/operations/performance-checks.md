# Performance Check Plan

## Objective
Measure the highest-risk user flows before pilot rollout and record whether the release candidate is fast enough for daily use.

## Priority flows
1. Dashboard load with pending logs and due reminders
2. Report summary load with filters
3. CSV and PDF export
4. Document upload
5. Document download

## Test conditions
- Use the staging environment, not local development
- Use one pilot-like organization with realistic daily activity
- Run each check at least three times and record the slowest result
- Repeat once with admin access and once with staff access where applicable

## Measurements to capture
| Flow | What to measure |
|------|-----------------|
| Dashboard | Time to first usable view and API response time for dashboard data |
| Report summary | API response time for filtered summary data |
| CSV export | End-to-end download completion time |
| PDF export | End-to-end generation and download completion time |
| Document upload | Upload completion time and storage success |
| Document download | Download completion time and file integrity |

## Execution order
1. Load the dashboard with generated daily tasks in place.
2. Open reports with no filters, then with date and status filters.
3. Export CSV, then export PDF.
4. Upload a compliance document of realistic size.
5. Download the same document.

## Pass / fail guidance
- Pass when each flow completes reliably and remains comfortably usable for pilot staff during repeated runs.
- Fail when the flow times out, blocks user progress, or shows material degradation between repeated runs.

## Follow-up
- Fix the slowest failing flow first.
- Re-run the full checklist after each performance fix that touches reports, dashboard data, or storage handling.
- Keep the captured timings with the release notes for beta-go/no-go review.
