import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComplianceDocuments1000000000003 implements MigrationInterface {
  name = 'ComplianceDocuments1000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS category VARCHAR NOT NULL DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS notes TEXT;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_category_check') THEN
          ALTER TABLE documents
          ADD CONSTRAINT documents_category_check
          CHECK (category IN (
            'general',
            'haccp_manual',
            'store_layout',
            'permit',
            'certificate',
            'procedure',
            'inspection_evidence'
          ));
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      DROP CONSTRAINT IF EXISTS documents_category_check,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS category;
    `);
  }
}
