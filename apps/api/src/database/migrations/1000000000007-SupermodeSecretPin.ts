import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupermodeSecretPin1000000000007 implements MigrationInterface {
  name = 'SupermodeSecretPin1000000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS supermode_secret_pin_hash VARCHAR;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS supermode_secret_pin_hash;`);
  }
}
