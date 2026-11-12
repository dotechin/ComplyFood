# Supermode and Daily Checks

## Configure a schedule

An organization administrator opens **Supermode**, unlocks it with the organization admin account's Supermode PIN, and configures the optional server-side schedule. Select daily or weekly cadence, a 24-hour local run time, an IANA time zone (for example `Europe/Rome`), opening weekdays, appliance names/categories, and Celsius limits. Schedules are disabled until explicitly enabled.

The API checks due schedules every minute; no browser needs to remain open. A weekly run is selected by weekday and prepares separate pending checks for opening days in the following local Monday–Sunday week. Daily runs prepare checks for that local day. The scheduler processes missed occurrences after restarts, serializes work with a database row lock, and uses unique organization-scoped schedule keys to prevent duplicates. Missed past checks remain pending and appear as overdue.

Supermode displays the last successful run and any recorded scheduler error. Correct the schedule or database problem there, then allow the API scheduler to retry. Keep API instances running and connected to the same PostgreSQL database; the database schedule row is the durable source of truth.

## Record a check

**Daily Checks** shows today's checks, overdue pending checks, and completed checks. Staff or administrators enter the actual observed temperature and select **Confirm check performed** only after doing the check. Temperatures outside the configured limit require an exception reason and corrective action. A successful confirmation stores the actual reading, authenticated user ID, server confirmation time, and exception details. Checks that are not submitted remain pending; schedule generation never creates a reading or marks a check complete.

Temperature entries and schedule settings are stored in the organization's database and are available across devices. The temperature calendar is a server-backed view; use **Daily Checks** to enter readings. Standard logs, dashboard summaries, reports, and exports exclude demo and unreviewed records.

## Review existing data safely

The migration does not delete log entries. It classifies records with historical document provenance as historical and explicitly marked sample records as demo. Other pre-existing records are marked unreviewed and withheld from operational views until an administrator classifies them in Supermode. Do not infer that an unmarked record is real; classification changes are organization-scoped and audited.

Browser-local readings remain on their original browser. An administrator reviews each one in Supermode, explicitly chooses real or demo, and confirms the appliance type before importing. A sample-registry marker is shown as a review hint, not silently trusted. Imported readings are pending confirmation, carry the reviewing administrator and import time, and are not deleted from browser storage. If a server reading already exists for the same appliance and date, the API reports a conflict rather than overwriting it. Repeating an identical import is idempotent.

## Demo records

Demo records are available only in the clearly labeled **Demo data** view for the signed-in organization. Operational log queries, dashboard counts, compliance summaries, and CSV/PDF exports do not include them. **Clear Sample Data** removes records explicitly classified as demo; historical records and records explicitly classified as real are protected. Ambiguous unreviewed records are retained unless they carry an explicit legacy sample marker.

## Deployment and recovery

Back up PostgreSQL before applying the Supermode daily-check migration, using the normal deployment migration process. Confirm the API starts after migration and that an administrator can save a schedule, then verify the last-run status and a pending check in the UI. Keep database backups and include the API/database availability and time-zone configuration in operational monitoring.

After an API restart, the scheduler uses the persisted last-run local date to catch up missed daily or weekly occurrences. Unique schedule keys make reruns safe; do not delete pending checks or manually advance the last-run date to recover. If database connectivity fails, inspect API logs and the schedule's **Last scheduler error** after connectivity returns. A database restore should restore both schedule state and log entries from the same backup point.

The migration rollback removes schedule/import keys and classification metadata. Do not roll it back on a live database without a verified backup and a recovery plan, because records that were separated as demo or unreviewed would lose that isolation metadata.
