import { MigrationInterface, QueryRunner } from 'typeorm';

export class HistoricalLogProvenance1000000000006 implements MigrationInterface {
  name = 'HistoricalLogProvenance1000000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE log_entries
      ADD COLUMN record_origin VARCHAR,
      ADD COLUMN source_document_id UUID,
      ADD COLUMN source_page INTEGER,
      ADD CONSTRAINT log_entries_source_document_fk
        FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE RESTRICT,
      ADD CONSTRAINT log_entries_source_page_check
        CHECK (source_page IS NULL OR source_page > 0),
      ADD CONSTRAINT log_entries_record_origin_check
        CHECK (record_origin IS NULL OR record_origin = 'historical_transcription'),
      ADD CONSTRAINT log_entries_historical_provenance_check
        CHECK (
          (record_origin IS NULL AND source_document_id IS NULL AND source_page IS NULL) OR
          (record_origin = 'historical_transcription' AND source_document_id IS NOT NULL AND source_page IS NOT NULL)
        );

      CREATE UNIQUE INDEX log_entries_historical_temperature_source_idx
      ON log_entries (
        org_id,
        source_document_id,
        occurred_at,
        (fields->>'Workstation / unit')
      )
      WHERE record_origin = 'historical_transcription'
        AND type = 'temperature'
        AND source_document_id IS NOT NULL;

      CREATE UNIQUE INDEX log_entries_historical_cleaning_source_idx
      ON log_entries (
        org_id,
        source_document_id,
        source_page,
        (fields->>'Source month'),
        (fields->>'Source week')
      )
      WHERE record_origin = 'historical_transcription'
        AND type = 'cleaning'
        AND source_document_id IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX log_entries_historical_cleaning_source_idx;
      DROP INDEX log_entries_historical_temperature_source_idx;
      ALTER TABLE log_entries
      DROP CONSTRAINT log_entries_historical_provenance_check,
      DROP CONSTRAINT log_entries_record_origin_check,
      DROP CONSTRAINT log_entries_source_page_check,
      DROP CONSTRAINT log_entries_source_document_fk,
      DROP COLUMN source_page,
      DROP COLUMN source_document_id,
      DROP COLUMN record_origin;
    `);
  }
}
