import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('supermode_schedules')
export class SupermodeSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', unique: true })
  orgId: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar' })
  cadence: 'daily' | 'weekly';

  @Column({ name: 'run_time', type: 'varchar' })
  runTime: string;

  @Column({ name: 'timezone', type: 'varchar' })
  timezone: string;

  @Column({ name: 'weekly_run_day', type: 'integer', nullable: true })
  weeklyRunDay: number | null;

  @Column({ name: 'opening_days', type: 'jsonb', default: [] })
  openingDays: number[];

  @Column({ type: 'jsonb', default: [] })
  appliances: Array<{ name: string; category: 'fridge' | 'freezer'; limit: number }>;

  @Column({ name: 'last_run_local_date', type: 'date', nullable: true })
  lastRunLocalDate: string | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
