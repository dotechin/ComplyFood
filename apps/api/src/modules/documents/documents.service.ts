import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

  async upload(orgId: string, userId: string, file: any, linkedEntryId?: string) {
    const safeName = this.sanitizeFileName(file.originalname ?? `document${extname(file.mimetype || '')}`);
    const relativePath = join(orgId, `${Date.now()}-${safeName}`);
    const absolutePath = join(process.cwd(), 'storage', relativePath);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

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
    const filePath = join(process.cwd(), 'storage', doc.s3Key);
    const file = await readFile(filePath);
    return { file, name: doc.name };
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
