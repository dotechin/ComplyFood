import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    private readonly config: ConfigService,
  ) {}

  async getUploadUrl(orgId: string, userId: string, fileName: string, linkedEntryId?: string) {
    const s3Key = `${orgId}/${Date.now()}-${fileName}`;
    // In production, generate a presigned S3/R2 URL here
    // For MVP, return the key and a placeholder URL
    const uploadUrl = `${this.config.get('STORAGE_BASE_URL') || 'http://localhost:9000'}/${s3Key}`;
    const doc = await this.repo.save(
      this.repo.create({ orgId, name: fileName, s3Key, linkedEntryId, uploadedBy: userId }),
    );
    return { uploadUrl, document: doc };
  }

  findByOrg(orgId: string) {
    return this.repo.find({ where: { orgId }, order: { createdAt: 'DESC' } });
  }

  findByLogEntry(linkedEntryId: string) {
    return this.repo.find({ where: { linkedEntryId } });
  }
}
