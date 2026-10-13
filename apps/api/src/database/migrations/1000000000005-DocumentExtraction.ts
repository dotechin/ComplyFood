import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentExtraction1000000000005 implements MigrationInterface {
  name = 'DocumentExtraction1000000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      ADD COLUMN mime_type VARCHAR,
      ADD COLUMN extracted_text TEXT,
      ADD COLUMN metadata JSONB,
      ADD COLUMN extracted_pages JSONB,
      ADD COLUMN processing_status VARCHAR NOT NULL DEFAULT 'pending',
      ADD CONSTRAINT documents_processing_status_check
        CHECK (processing_status IN ('pending', 'completed', 'failed'));
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE documents
      DROP CONSTRAINT documents_processing_status_check,
      DROP COLUMN processing_status,
      DROP COLUMN extracted_pages,
      DROP COLUMN metadata,
      DROP COLUMN extracted_text,
      DROP COLUMN mime_type;
    `);
  }
}
