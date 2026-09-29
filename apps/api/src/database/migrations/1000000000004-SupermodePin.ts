import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupermodePin1000000000004 implements MigrationInterface {
  name = 'SupermodePin1000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS supermode_pin_hash VARCHAR,
      ADD COLUMN IF NOT EXISTS supermode_failed_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS supermode_lockouts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS supermode_locked_until TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS supermode_locked_until,
      DROP COLUMN IF EXISTS supermode_lockouts,
      DROP COLUMN IF EXISTS supermode_failed_attempts,
      DROP COLUMN IF EXISTS supermode_pin_hash;
    `);
  }
}
