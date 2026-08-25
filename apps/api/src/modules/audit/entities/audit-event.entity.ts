import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column()
  action: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
