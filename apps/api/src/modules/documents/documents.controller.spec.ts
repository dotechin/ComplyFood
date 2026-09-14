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
});
