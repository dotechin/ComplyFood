import { MigrationInterface, QueryRunner } from 'typeorm';

export class ManualAndExceptionMode1000000000002 implements MigrationInterface {
  name = 'ManualAndExceptionMode1000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS manual_status_enum AS ENUM ('draft', 'approved');

      ALTER TABLE log_entries
      ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS measured_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_exception BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS exception_reason TEXT,
      ADD COLUMN IF NOT EXISTS exception_by UUID,
      ADD COLUMN IF NOT EXISTS exception_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS haccp_manual_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        business_type VARCHAR NOT NULL,
        status manual_status_enum NOT NULL DEFAULT 'draft',
        version_number INT NOT NULL,
        sections JSONB NOT NULL DEFAULT '[]'::jsonb,
        linked_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by UUID NOT NULL,
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS haccp_manual_versions_org_version_idx
      ON haccp_manual_versions(org_id, version_number DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS haccp_manual_versions_org_version_idx;
      DROP TABLE IF EXISTS haccp_manual_versions;

      ALTER TABLE log_entries
      DROP COLUMN IF EXISTS exception_at,
      DROP COLUMN IF EXISTS exception_by,
      DROP COLUMN IF EXISTS exception_reason,
      DROP COLUMN IF EXISTS is_exception,
      DROP COLUMN IF EXISTS measured_at,
      DROP COLUMN IF EXISTS occurred_at;

      DROP TYPE IF EXISTS manual_status_enum;
    `);
  }
}

