import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseImplementation1000000000001 implements MigrationInterface {
  name = 'PhaseImplementation1000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR,
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

      ALTER TABLE audit_events
      ADD COLUMN IF NOT EXISTS org_id UUID;

      ALTER TABLE reminder_rules
      ADD COLUMN IF NOT EXISTS message VARCHAR,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

      CREATE TABLE IF NOT EXISTS reminder_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        reminder_rule_id UUID NOT NULL REFERENCES reminder_rules(id) ON DELETE CASCADE,
        type VARCHAR NOT NULL,
        message VARCHAR NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS reminder_events_rule_schedule_idx
      ON reminder_events (reminder_rule_id, scheduled_for);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS reminder_events_rule_schedule_idx;
      DROP TABLE IF EXISTS reminder_events;

      ALTER TABLE reminder_rules
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS message;

      ALTER TABLE audit_events
      DROP COLUMN IF EXISTS org_id;

      ALTER TABLE users
      DROP COLUMN IF EXISTS password_reset_expires_at,
      DROP COLUMN IF EXISTS password_reset_token_hash;
    `);
  }
}
