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

  @Column({ name: 'last_triggered_at', nullable: true })
  lastTriggeredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
