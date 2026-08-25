import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('checklist_templates')
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  type: string;

  @Column({ name: 'fields_config', type: 'jsonb' })
  fieldsConfig: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
