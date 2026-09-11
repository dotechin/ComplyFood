import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reminder_rules')
export class ReminderRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  type: string;

  @Column({ name: 'cron_expression' })
  cronExpression: string;

  @Column({ nullable: true })
  message: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
