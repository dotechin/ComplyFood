import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComplianceDocuments1000000000003 implements MigrationInterface {
  name = 'ComplianceDocuments1000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS category VARCHAR NOT NULL DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS category;
    `);
  }
}
