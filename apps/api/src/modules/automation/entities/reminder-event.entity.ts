import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reminder_events')
export class ReminderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column({ name: 'reminder_rule_id' })
  reminderRuleId: string;

  @Column()
  type: string;

  @Column()
  message: string;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
