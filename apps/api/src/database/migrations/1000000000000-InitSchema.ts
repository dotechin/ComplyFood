import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1000000000000 implements MigrationInterface {
  name = 'InitSchema1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('admin', 'staff', 'auditor');
      CREATE TYPE log_type_enum AS ENUM ('temperature', 'cleaning', 'receiving', 'checklist', 'incident');
      CREATE TYPE log_status_enum AS ENUM ('pending', 'confirmed', 'overridden');

      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        address VARCHAR,
        category VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        address VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        role user_role_enum NOT NULL DEFAULT 'staff',
        org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE checklist_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        type VARCHAR,
        fields_config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE log_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        type log_type_enum NOT NULL,
        fields JSONB NOT NULL DEFAULT '{}',
        status log_status_enum NOT NULL DEFAULT 'pending',
        submitted_by UUID,
        submitted_at TIMESTAMPTZ,
        preset_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE override_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
        field_name VARCHAR NOT NULL,
        original_value JSONB,
        new_value JSONB NOT NULL,
        reason TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        s3_key VARCHAR NOT NULL,
        linked_entry_id UUID,
        uploaded_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR NOT NULL,
        entity_id UUID,
        action VARCHAR NOT NULL,
        user_id UUID,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE preset_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR NOT NULL,
        schedule JSONB,
        defaults JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE reminder_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR NOT NULL,
        cron_expression VARCHAR NOT NULL,
        last_triggered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS reminder_rules;
      DROP TABLE IF EXISTS preset_rules;
      DROP TABLE IF EXISTS audit_events;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS override_records;
      DROP TABLE IF EXISTS log_entries;
      DROP TABLE IF EXISTS checklist_templates;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS locations;
      DROP TABLE IF EXISTS organizations;
      DROP TYPE IF EXISTS log_status_enum;
      DROP TYPE IF EXISTS log_type_enum;
      DROP TYPE IF EXISTS user_role_enum;
    `);
  }
}
