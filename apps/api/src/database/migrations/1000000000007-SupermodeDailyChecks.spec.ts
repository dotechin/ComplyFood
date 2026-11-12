import { SupermodeDailyChecks1000000000007 } from './1000000000007-SupermodeDailyChecks';

describe('SupermodeDailyChecks migration', () => {
  it('keeps unknown legacy records unreviewed and classifies only explicit demo markers or historical provenance', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new SupermodeDailyChecks1000000000007();

    await migration.up({ query } as any);

    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("DEFAULT 'unreviewed'");
    expect(sql).toContain("data_classification = 'historical'");
    expect(sql).toContain('source_document_id IS NOT NULL OR record_origin =');
    expect(sql).toContain("fields->>'Sample data' = 'yes'");
    expect(sql).toContain("fields->>'source' LIKE 'supermode-%'");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+log_entries/i);
    expect(sql).toContain('CREATE UNIQUE INDEX log_entries_schedule_key_unique');
    expect(sql).toContain('CREATE UNIQUE INDEX log_entries_import_key_unique');
  });

  it('removes only the added schema on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new SupermodeDailyChecks1000000000007();

    await migration.down({ query } as any);

    expect(query.mock.calls[0][0]).toContain('DROP TABLE supermode_schedules');
    expect(query.mock.calls[0][0]).toContain('DROP COLUMN data_classification');
  });
});
