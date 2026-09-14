import { DocumentCategory } from '@complyfood/shared';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  name: string;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ default: DocumentCategory.GENERAL })
  category: DocumentCategory;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'linked_entry_id', nullable: true })
  linkedEntryId: string | null;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
