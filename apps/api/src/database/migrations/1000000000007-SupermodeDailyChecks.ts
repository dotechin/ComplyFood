import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupermodeDailyChecks1000000000007 implements MigrationInterface {
  name = 'SupermodeDailyChecks1000000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE supermode_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        enabled boolean NOT NULL DEFAULT false,
        cadence varchar NOT NULL CHECK (cadence IN ('daily', 'weekly')),
        run_time varchar NOT NULL CHECK (run_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
        timezone varchar NOT NULL,
        weekly_run_day integer CHECK (weekly_run_day BETWEEN 0 AND 6),
        opening_days jsonb NOT NULL DEFAULT '[]'::jsonb,
        appliances jsonb NOT NULL DEFAULT '[]'::jsonb,
        last_run_local_date date,
        last_run_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK ((cadence = 'daily' AND weekly_run_day IS NULL) OR
          (cadence = 'weekly' AND weekly_run_day IS NOT NULL))
      );

      ALTER TABLE log_entries ADD COLUMN schedule_key varchar;
      ALTER TABLE log_entries ADD COLUMN import_key varchar;
      ALTER TABLE log_entries ADD COLUMN data_classification varchar NOT NULL DEFAULT 'unreviewed';
      UPDATE log_entries SET data_classification = 'historical'
        WHERE source_document_id IS NOT NULL OR record_origin = 'historical_transcription';
      UPDATE log_entries SET data_classification = 'demo'
        WHERE data_classification = 'unreviewed'
          AND source_document_id IS NULL
          AND record_origin IS DISTINCT FROM 'historical_transcription'
          AND (fields->>'Sample data' = 'yes' OR fields->>'source' LIKE 'supermode-%');
      ALTER TABLE log_entries ADD CONSTRAINT log_entries_data_classification_check
        CHECK (data_classification IN ('real', 'demo', 'unreviewed', 'historical'));
      CREATE UNIQUE INDEX log_entries_schedule_key_unique
        ON log_entries (org_id, schedule_key) WHERE schedule_key IS NOT NULL;
      CREATE UNIQUE INDEX log_entries_import_key_unique
        ON log_entries (org_id, import_key) WHERE import_key IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX log_entries_import_key_unique;
      DROP INDEX log_entries_schedule_key_unique;
      ALTER TABLE log_entries
        DROP CONSTRAINT log_entries_data_classification_check,
        DROP COLUMN data_classification,
        DROP COLUMN import_key,
        DROP COLUMN schedule_key;
      DROP TABLE supermode_schedules;
    `);
  }
}
