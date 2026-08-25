import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('override_records')
export class OverrideRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'log_entry_id' })
  logEntryId: string;

  @Column({ name: 'field_name' })
  fieldName: string;

  @Column({ name: 'original_value', type: 'jsonb', nullable: true })
  originalValue: any;

  @Column({ name: 'new_value', type: 'jsonb' })
  newValue: any;

  @Column()
  reason: string;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
