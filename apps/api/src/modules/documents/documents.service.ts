import { DocumentCategory } from '@complyfood/shared';
import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, PayloadTooLargeException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { dirname, extname, join } from 'path';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Document } from './entities/document.entity';
import { UserRole } from '../../common/decorators/roles.decorator';
import { MAX_DOCUMENT_BYTES, PdfParsingService } from './pdf-parsing.service';

@Injectable()
export class DocumentsService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentsService.name);
  private extractionQueue: Promise<unknown> = Promise.resolve();
  private readonly extractions = new Map<string, Promise<unknown>>();
  private readonly storageDriver = process.env.STORAGE_DRIVER || 's3';
  private readonly bucket = process.env.S3_BUCKET || 'complyfood';
  private bucketReadyPromise: Promise<void> | null = null;
  private readonly s3Client =
    this.storageDriver === 's3'
      ? new S3Client({
          region: process.env.S3_REGION || 'us-east-1',
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true',
          credentials:
            process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
              ? {
                  accessKeyId: process.env.S3_ACCESS_KEY_ID,
                  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                }
              : undefined,
        })
      : null;

  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    private readonly pdfParser: PdfParsingService,
  ) {}

  async onModuleDestroy() {
    await this.extractionQueue;
  }

  async upload(
    orgId: string,
    userId: string,
    file: any,
    options?: { linkedEntryId?: string; category?: DocumentCategory; notes?: string },
  ) {
    if (file.buffer.length > MAX_DOCUMENT_BYTES) {
      throw new PayloadTooLargeException('Documents must be no larger than 20 MB');
    }
    const safeName = this.sanitizeFileName(file.originalname ?? `document${extname(file.mimetype || '')}`);
    const relativePath = join(orgId, `${randomUUID()}-${safeName}`);
    const category = this.normalizeCategory(options?.category);
    const notes = options?.notes?.trim() ? options.notes.trim() : null;

    if (this.storageDriver === 's3' && this.s3Client) {
      await this.ensureBucketExists();
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: relativePath,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );
    } else {
      const absolutePath = join(process.cwd(), 'storage', relativePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file.buffer);
    }

    const doc = await this.repo.save(
      this.repo.create({
        orgId,
        name: safeName,
        s3Key: relativePath,
        category,
        notes,
        linkedEntryId: options?.linkedEntryId ?? null,
        uploadedBy: userId,
        mimeType: file.mimetype || null,
        processingStatus: this.isPdf({ name: safeName, mimeType: file.mimetype }) ? 'pending' : 'completed',
      }),
    );
    if (this.isPdf(doc)) {
      void this.enqueueExtraction(doc).catch(() => {
        this.logger.warn(`PDF extraction failed for document ${doc.id}`);
      });
    }
    return doc;
  }

  findByOrg(orgId: string, category?: DocumentCategory) {
    const where = category ? { orgId, category } : { orgId };
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  findByLogEntry(orgId: string, linkedEntryId: string) {
    return this.repo.find({ where: { orgId, linkedEntryId } });
  }

  async getDownload(orgId: string, id: string) {
    const doc = await this.repo.findOne({ where: { id, orgId } });
    if (!doc) return null;

    // Only recognized PDFs are typed for inline rendering; everything else is
    // delivered as opaque bytes so uploaded HTML/SVG is never interpreted.
    const contentType = this.isPdf(doc) ? 'application/pdf' : 'application/octet-stream';
    return { file: await this.readStoredFile(doc), name: doc.name, contentType };
  }

  private async readStoredFile(doc: Document, limitSize = false): Promise<Buffer> {
    try {
      if (this.storageDriver === 's3' && this.s3Client) {
        const object = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: doc.s3Key,
          }),
        );
        if (limitSize && object.ContentLength > MAX_DOCUMENT_BYTES) {
          (object.Body as { destroy?: () => void })?.destroy?.();
          throw new PayloadTooLargeException('Document exceeds the 20 MB limit');
        }
        const file = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : null;
        if (!file) throw new NotFoundException('Document file not found in storage');
        if (limitSize && file.length > MAX_DOCUMENT_BYTES) throw new PayloadTooLargeException('Document exceeds the 20 MB limit');
        return file;
      }

      const filePath = join(process.cwd(), 'storage', doc.s3Key);
      if (limitSize && (await stat(filePath)).size > MAX_DOCUMENT_BYTES) {
        throw new PayloadTooLargeException('Document exceeds the 20 MB limit');
      }
      const file = await readFile(filePath);
      if (limitSize && file.length > MAX_DOCUMENT_BYTES) throw new PayloadTooLargeException('Document exceeds the 20 MB limit');
      return file;
    } catch (error) {
      if (this.isMissingFileError(error)) throw new NotFoundException('Document file not found in storage');
      throw error;
    }
  }

  async extract(orgId: string, id: string) {
    if (!orgId) throw new ForbiddenException('Organization membership is required');
    const doc = await this.repo.findOne({
      where: { id, orgId },
      select: ['id', 'orgId', 'name', 'mimeType', 's3Key', 'processingStatus', 'extractedText', 'extractedPages', 'metadata'],
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (!this.isPdf(doc)) {
      return { supported: false, text: null, pages: [], metadata: null, processingStatus: 'completed' };
    }
    if (doc.processingStatus === 'completed') {
      return {
        supported: true, text: doc.extractedText, pages: doc.extractedPages,
        metadata: doc.metadata, processingStatus: 'completed',
      };
    }
    if (doc.processingStatus === 'failed') {
      throw new UnprocessableEntityException('PDF extraction failed; the file may be corrupt or password-protected');
    }
    return this.enqueueExtraction(doc);
  }

  private enqueueExtraction(doc: Document) {
    const existing = this.extractions.get(doc.id);
    if (existing) return existing;
    const job = this.extractionQueue.then(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
      let file: Buffer;
      try {
        file = await this.readStoredFile(doc, true);
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof PayloadTooLargeException) throw error;
        throw new ServiceUnavailableException('Could not read the stored file; please retry');
      }
      let result: Awaited<ReturnType<PdfParsingService['parse']>>;
      try {
        result = await this.pdfParser.parse(file);
      } catch {
        await this.repo.update({ id: doc.id, orgId: doc.orgId }, { processingStatus: 'failed' });
        throw new UnprocessableEntityException('PDF extraction failed; the file may be corrupt or password-protected');
      }
      const updated = await this.repo.update({ id: doc.id, orgId: doc.orgId }, {
        extractedText: result.text,
        extractedPages: result.pages,
        metadata: result.metadata,
        processingStatus: 'completed',
      });
      if (!updated.affected) throw new NotFoundException('Document was deleted during extraction');
      return { supported: true, ...result, processingStatus: 'completed' };
    }).finally(() => this.extractions.delete(doc.id));
    this.extractions.set(doc.id, job);
    this.extractionQueue = job.catch(() => undefined);
    return job;
  }

  async delete(orgId: string, id: string, userId: string, role: UserRole) {
    if (!orgId) throw new ForbiddenException('Organization membership is required');
    const doc = await this.repo.findOne({ where: { id, orgId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (role !== UserRole.ADMIN && doc.uploadedBy !== userId) {
      throw new ForbiddenException('Only organization admins or the uploader can delete this document');
    }
    try {
      if (this.storageDriver === 's3' && this.s3Client) {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.s3Key }));
      } else {
        await unlink(join(process.cwd(), 'storage', doc.s3Key));
      }
    } catch (error) {
      if (!this.isMissingFileError(error)) {
        throw new ServiceUnavailableException('Could not delete the stored file; please retry');
      }
    }
    await this.repo.delete({ id, orgId });
  }

  private isPdf(doc: { name: string; mimeType?: string | null }) {
    return doc.mimeType === 'application/pdf' || extname(doc.name).toLowerCase() === '.pdf';
  }

  private isMissingFileError(error: unknown) {
    return this.getS3ErrorName(error) === 'NoSuchKey' || this.getS3ErrorName(error) === 'NotFound' ||
      (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT');
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private normalizeCategory(category?: DocumentCategory) {
    return this.isValidCategory(category) ? category : DocumentCategory.GENERAL;
  }

  private isValidCategory(category: unknown): category is DocumentCategory {
    return Object.values(DocumentCategory).includes(category as DocumentCategory);
  }

  private async ensureBucketExists() {
    if (!this.s3Client) {
      return;
    }

    if (!this.bucketReadyPromise) {
      this.bucketReadyPromise = this.ensureBucketExistsOnce();
    }

    await this.bucketReadyPromise;
  }

  private async ensureBucketExistsOnce() {
    if (!this.s3Client) {
      return;
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      if (!this.isMissingBucketError(error)) {
        throw error;
      }
    }

    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!this.isBucketAlreadyCreatedError(error)) {
        throw error;
      }
    }
  }

  private isMissingBucketError(error: unknown) {
    const errorName = this.getS3ErrorName(error);
    return errorName === 'NotFound' || errorName === 'NoSuchBucket';
  }

  private isBucketAlreadyCreatedError(error: unknown) {
    const errorName = this.getS3ErrorName(error);
    return errorName === 'BucketAlreadyOwnedByYou' || errorName === 'BucketAlreadyExists';
  }

  private getS3ErrorName(error: unknown) {
    return typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name)
      : undefined;
  }
}
