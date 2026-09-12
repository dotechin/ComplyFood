import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ManualStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
}

@Entity('haccp_manual_versions')
export class HaccpManualVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column({ name: 'business_type' })
  businessType: string;

  @Column({ type: 'enum', enum: ManualStatus, default: ManualStatus.DRAFT })
  status: ManualStatus;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ type: 'jsonb', default: [] })
  sections: Array<{ key: string; title: string; content: string }>;

  @Column({ name: 'linked_document_ids', type: 'jsonb', default: [] })
  linkedDocumentIds: string[];

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

