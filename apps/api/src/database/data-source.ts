import { DataSource } from 'typeorm';
import { join } from 'path';

const extension = __filename.endsWith('.ts') ? 'ts' : 'js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '..', `**/*.entity.${extension}`)],
  migrations: [join(__dirname, 'migrations', `*.${extension}`)],
  synchronize: false,
});
