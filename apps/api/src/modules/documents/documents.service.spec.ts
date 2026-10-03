import { DocumentCategory } from '@complyfood/shared';
import { DocumentsService } from './documents.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ForbiddenException, NotFoundException, PayloadTooLargeException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { UserRole } from '../../common/decorators/roles.decorator';
import { MAX_DOCUMENT_BYTES } from './pdf-parsing.service';

describe('DocumentsService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'doc-1', ...value })),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn(),
  };
  const parser = { parse: jest.fn() };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    parser.parse.mockReset();
    service = new DocumentsService(repo as any, parser as any);
    (service as any).ensureBucketExists = jest.fn().mockResolvedValue(undefined);
    (service as any).s3Client = {
      send: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('stores compliance category and notes on upload', async () => {
    const result = await service.upload(
      'org-1',
      'user-1',
      {
        originalname: 'Manual 2026.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf'),
      },
      {
        category: DocumentCategory.HACCP_MANUAL,
        notes: ' Existing manual ',
      },
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        name: 'Manual_2026.pdf',
        uploadedBy: 'user-1',
        category: DocumentCategory.HACCP_MANUAL,
        notes: 'Existing manual',
        linkedEntryId: null,
      }),
    );
    expect(result.category).toBe(DocumentCategory.HACCP_MANUAL);
  });

  it('defaults missing categories to general on upload', async () => {
    const result = await service.upload('org-1', 'user-1', {
      originalname: 'layout.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('pdf'),
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: DocumentCategory.GENERAL,
        notes: null,
      }),
    );
    expect(result.category).toBe(DocumentCategory.GENERAL);
  });

  it('filters organization documents by category', async () => {
    repo.find.mockResolvedValue([]);

    await service.findByOrg('org-1', DocumentCategory.PERMIT);

    expect(repo.find).toHaveBeenCalledWith({
      where: { orgId: 'org-1', category: DocumentCategory.PERMIT },
      order: { createdAt: 'DESC' },
    });
  });

  it('lists all organization documents when no category filter is provided', async () => {
    repo.find.mockResolvedValue([]);

    await service.findByOrg('org-1');

    expect(repo.find).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('falls back to the general category for invalid input', async () => {
    await service.upload('org-1', 'user-1', {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('notes'),
    }, {
      category: 'not-real' as any,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: DocumentCategory.GENERAL,
      }),
    );
  });

  const doc = {
    id: 'doc-1', orgId: 'org-1', name: 'manual.pdf', s3Key: 'org-1/manual.pdf',
    uploadedBy: 'user-1', processingStatus: 'pending',
  };
  const extraction = {
    text: 'Food safety', pages: [{ pageNumber: 1, text: 'Food safety', structure: [] }],
    metadata: { title: 'Manual', author: 'Chef', creationDate: null, pageCount: 1 },
  };

  it('returns upload before extraction and stores results asynchronously', async () => {
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('pdf') },
    });
    parser.parse.mockResolvedValue(extraction);
    const result = await service.upload('org-1', 'user-1', {
      originalname: 'manual.pdf', mimetype: 'application/pdf', buffer: Buffer.from('pdf'),
    });
    expect(result.processingStatus).toBe('pending');
    expect(parser.parse).not.toHaveBeenCalled();
    await service.onModuleDestroy();
    expect(repo.update).toHaveBeenCalledWith({ id: 'doc-1', orgId: 'org-1' }, {
      extractedText: extraction.text, extractedPages: extraction.pages,
      metadata: extraction.metadata, processingStatus: 'completed',
    });
  });

  it('returns cached extraction without reading storage or parsing', async () => {
    repo.findOne.mockResolvedValue({
      ...doc, processingStatus: 'completed', extractedText: extraction.text,
      extractedPages: extraction.pages, metadata: extraction.metadata,
    });
    expect(await service.extract('org-1', doc.id)).toEqual({
      supported: true, ...extraction, processingStatus: 'completed',
    });
    expect(parser.parse).not.toHaveBeenCalled();
    expect((service as any).s3Client.send).not.toHaveBeenCalled();
    expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: doc.id, orgId: 'org-1' } }));
  });

  it('deduplicates concurrent extraction requests', async () => {
    repo.findOne.mockResolvedValue(doc);
    parser.parse.mockResolvedValue(extraction);
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('pdf') },
    });
    await Promise.all([service.extract('org-1', doc.id), service.extract('org-1', doc.id)]);
    expect(parser.parse).toHaveBeenCalledTimes(1);
  });

  it('marks corrupt PDFs failed and returns a meaningful error', async () => {
    repo.findOne.mockResolvedValue(doc);
    parser.parse.mockRejectedValue(new Error('Invalid PDF'));
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('corrupt') },
    });
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(UnprocessableEntityException);
    expect(repo.update).toHaveBeenCalledWith({ id: doc.id, orgId: 'org-1' }, { processingStatus: 'failed' });
  });

  it('does not repeatedly parse known failed PDFs', async () => {
    repo.findOne.mockResolvedValue({ ...doc, processingStatus: 'failed' });
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(UnprocessableEntityException);
    expect(parser.parse).not.toHaveBeenCalled();
  });

  it('types organization-scoped PDF downloads as application/pdf', async () => {
    repo.findOne.mockResolvedValue({ ...doc, mimeType: null });
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('%PDF-1.4') },
    });
    const result = await service.getDownload('org-1', doc.id);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: doc.id, orgId: 'org-1' } });
    expect(result).toEqual({ file: Buffer.from('%PDF-1.4'), name: 'manual.pdf', contentType: 'application/pdf' });
  });

  it('never types uploaded HTML or SVG for inline rendering on download', async () => {
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('<script>') },
    });
    for (const file of [{ name: 'evil.html', mimeType: 'text/html' }, { name: 'evil.svg', mimeType: 'image/svg+xml' }]) {
      repo.findOne.mockResolvedValue({ ...doc, ...file });
      expect((await service.getDownload('org-1', doc.id))?.contentType).toBe('application/octet-stream');
    }
  });

  it('handles non-PDF files without parsing', async () => {
    repo.findOne.mockResolvedValue({ ...doc, name: 'photo.jpg', mimeType: 'image/jpeg' });
    expect(await service.extract('org-1', doc.id)).toEqual({
      supported: false, text: null, pages: [], metadata: null, processingStatus: 'completed',
    });
    expect(parser.parse).not.toHaveBeenCalled();
  });

  it('returns not found for missing stored PDFs', async () => {
    repo.findOne.mockResolvedValue(doc);
    (service as any).s3Client.send.mockRejectedValue({ name: 'NoSuchKey' });
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(NotFoundException);
  });

  it('keeps transient storage failures retryable', async () => {
    repo.findOne.mockResolvedValue(doc);
    (service as any).s3Client.send.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(ServiceUnavailableException);
    expect(repo.update).not.toHaveBeenCalled();
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('pdf') },
    });
    parser.parse.mockResolvedValue(extraction);
    expect(await service.extract('org-1', doc.id)).toEqual({
      supported: true, ...extraction, processingStatus: 'completed',
    });
  });

  it('does not recreate a document deleted during extraction', async () => {
    repo.findOne.mockResolvedValue(doc);
    repo.update.mockResolvedValueOnce({ affected: 0 });
    parser.parse.mockResolvedValue(extraction);
    (service as any).s3Client.send.mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('pdf') },
    });
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects oversized uploads before writing to storage', async () => {
    await expect(service.upload('org-1', 'user-1', {
      buffer: { length: MAX_DOCUMENT_BYTES + 1 },
    })).rejects.toThrow(PayloadTooLargeException);
    expect((service as any).s3Client.send).not.toHaveBeenCalled();
  });

  it('rejects oversized stored PDFs before buffering them', async () => {
    repo.findOne.mockResolvedValue(doc);
    const read = jest.fn();
    const destroy = jest.fn();
    (service as any).s3Client.send.mockResolvedValue({
      ContentLength: MAX_DOCUMENT_BYTES + 1, Body: { transformToByteArray: read, destroy },
    });
    await expect(service.extract('org-1', doc.id)).rejects.toThrow(PayloadTooLargeException);
    expect(read).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it.each([
    ['user-1', UserRole.STAFF],
    ['other-admin', UserRole.ADMIN],
  ])('allows deletion by %s with role %s', async (userId, role) => {
    repo.findOne.mockResolvedValue(doc);
    await service.delete('org-1', doc.id, userId, role);
    expect((service as any).s3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(repo.delete).toHaveBeenCalledWith({ id: doc.id, orgId: 'org-1' });
  });

  it('rejects deletion by non-uploaders without touching storage', async () => {
    repo.findOne.mockResolvedValue(doc);
    await expect(service.delete('org-1', doc.id, 'other-user', UserRole.STAFF)).rejects.toThrow(ForbiddenException);
    expect((service as any).s3Client.send).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('scopes deletion to the organization and handles already deleted records', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.delete('other-org', doc.id, 'user-1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: doc.id, orgId: 'other-org' } });
    expect(repo.delete).not.toHaveBeenCalled();
    await expect(service.extract('other-org', doc.id)).rejects.toThrow(NotFoundException);
  });

  it('rejects extraction and deletion without organization membership', async () => {
    await expect(service.extract(undefined, doc.id)).rejects.toThrow(ForbiddenException);
    await expect(service.delete(undefined, doc.id, 'user-1', UserRole.ADMIN)).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('deletes the record when the S3 object is already missing', async () => {
    repo.findOne.mockResolvedValue(doc);
    (service as any).s3Client.send.mockRejectedValue({ name: 'NoSuchKey' });
    await service.delete('org-1', doc.id, 'user-1', UserRole.STAFF);
    expect(repo.delete).toHaveBeenCalledWith({ id: doc.id, orgId: 'org-1' });
  });

  it('preserves the record when S3 deletion fails', async () => {
    repo.findOne.mockResolvedValue(doc);
    (service as any).s3Client.send.mockRejectedValue(new Error('Storage unavailable'));
    await expect(service.delete('org-1', doc.id, 'user-1', UserRole.STAFF)).rejects.toThrow(ServiceUnavailableException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
