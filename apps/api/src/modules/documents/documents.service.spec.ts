import { DocumentCategory } from '@complyfood/shared';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'doc-1', ...value })),
    find: jest.fn(),
  };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentsService(repo as any);
    (service as any).ensureBucketExists = jest.fn().mockResolvedValue(undefined);
    (service as any).s3Client = {
      send: jest.fn().mockResolvedValue(undefined),
    };
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

  it('ignores invalid category filters and lists all organization documents', async () => {
    repo.find.mockResolvedValue([]);

    await service.findByOrg('org-1', 'invalid-category' as DocumentCategory);

    expect(repo.find).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      order: { createdAt: 'DESC' },
    });
  });
});
