import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum LogType {
  TEMPERATURE = 'temperature',
  CLEANING = 'cleaning',
  RECEIVING = 'receiving',
  CHECKLIST = 'checklist',
  INCIDENT = 'incident',
}

export enum LogStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  OVERRIDDEN = 'overridden',
}

@Entity('log_entries')
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column({ name: 'location_id', nullable: true })
  locationId: string | null;

  @Column({ type: 'enum', enum: LogType })
  type: LogType;

  @Column({ type: 'jsonb', default: {} })
  fields: Record<string, any>;

  @Column({ type: 'enum', enum: LogStatus, default: LogStatus.PENDING })
  status: LogStatus;

  @Column({ name: 'submitted_by', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'preset_id', nullable: true })
  presetId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
