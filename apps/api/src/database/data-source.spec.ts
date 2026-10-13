import { join } from 'path';
import { AppDataSource } from './data-source';

describe('migration data source', () => {
  it('resolves entities and migrations relative to the data source, not the working directory', () => {
    expect(AppDataSource.options.entities).toEqual([
      join(__dirname, '..', '**/*.entity.ts'),
    ]);
    expect(AppDataSource.options.migrations).toEqual([
      join(__dirname, 'migrations', '*.ts'),
    ]);
    expect(AppDataSource.options.synchronize).toBe(false);
  });
});
