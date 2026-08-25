import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('preset_rules')
export class PresetRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  schedule: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  defaults: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
