import { AppDataSource } from '../data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();

  const [org] = await runner.query(`
    INSERT INTO organizations (name, address, category)
    VALUES ('Demo Restaurant', 'Via Roma 1, Chieti, Italy', 'restaurant')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  if (!org) {
    console.log('Demo org already exists, skipping seed.');
    await AppDataSource.destroy();
    return;
  }

  const hash = await bcrypt.hash('password123', 10);

  await runner.query(`
    INSERT INTO users (email, password_hash, role, org_id)
    VALUES ('admin@demo.com', '${hash}', 'admin', '${org.id}')
    ON CONFLICT (email) DO NOTHING
  `);

  await runner.query(`
    INSERT INTO users (email, password_hash, role, org_id)
    VALUES ('staff@demo.com', '${hash}', 'staff', '${org.id}')
    ON CONFLICT (email) DO NOTHING
  `);

  console.log('Dev seed complete. Org ID:', org.id);
  await AppDataSource.destroy();
}

seed().catch(console.error);
