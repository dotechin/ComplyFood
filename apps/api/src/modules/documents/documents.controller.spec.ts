import { BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { DocumentCategory } from '@complyfood/shared';
import { UserRole } from '../../common/decorators/roles.decorator';
import { DocumentsController, FindDocumentsQueryDto } from './documents.controller';

describe('DocumentsController', () => {
  const documentsService = {
    upload: jest.fn(),
    findByOrg: jest.fn(),
    findByLogEntry: jest.fn(),
    getDownload: jest.fn(),
    extract: jest.fn(),
    delete: jest.fn(),
  };

  let controller: DocumentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentsController(documentsService as any);
  });

  it('rejects HACCP manual uploads from non-admin users', () => {
    expect(() =>
      controller.upload(
        { orgId: 'org-1', id: 'user-1', role: UserRole.STAFF },
        { originalname: 'manual.pdf' },
        {
          category: DocumentCategory.HACCP_MANUAL,
        },
      ),
    ).toThrow(ForbiddenException);
    expect(documentsService.upload).not.toHaveBeenCalled();
  });

  it('rejects uploads when the file is missing', () => {
    expect(() =>
      controller.upload(
        { orgId: 'org-1', id: 'user-1', role: UserRole.ADMIN },
        undefined,
        {},
      ),
    ).toThrow(BadRequestException);
    expect(documentsService.upload).not.toHaveBeenCalled();
  });

  it('rejects HACCP manual files linked to log entries', () => {
    expect(() =>
      controller.upload(
        { orgId: 'org-1', id: 'user-1', role: UserRole.ADMIN },
        { originalname: 'manual.pdf' },
        {
          category: DocumentCategory.HACCP_MANUAL,
          linkedEntryId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
        },
      ),
    ).toThrow(BadRequestException);
    expect(documentsService.upload).not.toHaveBeenCalled();
  });

  it('rejects invalid category query values', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

    await expect(
      pipe.transform(
        { category: 'invalid-category' },
        { type: 'query', metatype: FindDocumentsQueryDto, data: '' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes valid uploads through to the documents service', () => {
    controller.upload(
      { orgId: 'org-1', id: 'user-1', role: UserRole.ADMIN },
      { originalname: 'permit.pdf', buffer: Buffer.from('pdf') },
      {
        category: DocumentCategory.PERMIT,
        notes: 'Current permit',
      },
    );

    expect(documentsService.upload).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({ originalname: 'permit.pdf' }),
      {
        category: DocumentCategory.PERMIT,
        notes: 'Current permit',
      },
    );
  });

  it('passes organization scoping to extraction', () => {
    controller.extract({ orgId: 'org-1' }, 'doc-1');
    expect(documentsService.extract).toHaveBeenCalledWith('org-1', 'doc-1');
  });

  it('passes the organization, uploader identity and role to deletion', () => {
    controller.delete({ orgId: 'org-1', id: 'user-1', role: UserRole.STAFF }, 'doc-1');
    expect(documentsService.delete).toHaveBeenCalledWith('org-1', 'doc-1', 'user-1', UserRole.STAFF);
  });

  it('delivers recognized PDFs with an application/pdf type and safe caching headers', async () => {
    const pdf = Buffer.from('%PDF-1.7 scanned');
    documentsService.getDownload.mockResolvedValue({ file: pdf, name: 'scan.pdf', contentType: 'application/pdf' });
    const res = { setHeader: jest.fn(), send: jest.fn() };

    await controller.download({ orgId: 'org-1' }, 'doc-1', res as any);

    expect(documentsService.getDownload).toHaveBeenCalledWith('org-1', 'doc-1');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="scan.pdf"');
    expect(res.send).toHaveBeenCalledWith(pdf);
  });

  it('delivers non-PDF files as opaque bytes', async () => {
    documentsService.getDownload.mockResolvedValue({
      file: Buffer.from('<svg/>'), name: 'layout.svg', contentType: 'application/octet-stream',
    });
    const res = { setHeader: jest.fn(), send: jest.fn() };

    await controller.download({ orgId: 'org-1' }, 'doc-1', res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('does not send anything for documents outside the organization', async () => {
    documentsService.getDownload.mockResolvedValue(null);
    const res = { setHeader: jest.fn(), send: jest.fn() };

    await expect(controller.download({ orgId: 'org-2' }, 'doc-1', res as any)).rejects.toThrow(BadRequestException);
    expect(res.send).not.toHaveBeenCalled();
  });
});
