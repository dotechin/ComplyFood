import { DocumentCategory } from '@complyfood/shared';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import type { PdfMetadata, PdfPage } from '../pdf-parsing.service';

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

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string | null;

  @Column({ name: 'extracted_text', type: 'text', nullable: true, select: false })
  extractedText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: PdfMetadata | null;

  @Column({ name: 'extracted_pages', type: 'jsonb', nullable: true, select: false })
  extractedPages: PdfPage[] | null;

  @Column({ name: 'processing_status', default: 'pending' })
  processingStatus: 'pending' | 'completed' | 'failed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
