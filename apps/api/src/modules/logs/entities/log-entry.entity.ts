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

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ name: 'measured_at', type: 'timestamptz', nullable: true })
  measuredAt: Date | null;

  @Column({ name: 'is_exception', type: 'boolean', default: false })
  isException: boolean;

  @Column({ name: 'exception_reason', type: 'text', nullable: true })
  exceptionReason: string | null;

  @Column({ name: 'exception_by', nullable: true })
  exceptionBy: string | null;

  @Column({ name: 'exception_at', type: 'timestamptz', nullable: true })
  exceptionAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
