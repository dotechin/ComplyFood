import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  private readonly storageDriver = process.env.STORAGE_DRIVER || 's3';
  private readonly bucket = process.env.S3_BUCKET || 'complyfood';
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
  ) {}

  async upload(orgId: string, userId: string, file: any, linkedEntryId?: string) {
    const safeName = this.sanitizeFileName(file.originalname ?? `document${extname(file.mimetype || '')}`);
    const relativePath = join(orgId, `${Date.now()}-${safeName}`);

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

    return this.repo.save(
      this.repo.create({
        orgId,
        name: safeName,
        s3Key: relativePath,
        linkedEntryId: linkedEntryId ?? null,
        uploadedBy: userId,
      }),
    );
  }

  findByOrg(orgId: string) {
    return this.repo.find({ where: { orgId }, order: { createdAt: 'DESC' } });
  }

  findByLogEntry(orgId: string, linkedEntryId: string) {
    return this.repo.find({ where: { orgId, linkedEntryId } });
  }

  async getDownload(orgId: string, id: string) {
    const doc = await this.repo.findOne({ where: { id, orgId } });
    if (!doc) return null;

    if (this.storageDriver === 's3' && this.s3Client) {
      const object = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: doc.s3Key,
        }),
      );
      const file = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : null;
      if (!file) {
        return null;
      }
      return { file, name: doc.name };
    }

    const filePath = join(process.cwd(), 'storage', doc.s3Key);
    const file = await readFile(filePath);
    return { file, name: doc.name };
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private async ensureBucketExists() {
    if (!this.s3Client) {
      return;
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
