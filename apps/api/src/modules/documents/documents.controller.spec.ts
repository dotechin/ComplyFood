import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentCategory } from '@complyfood/shared';
import { UserRole } from '../../common/decorators/roles.decorator';
import { DocumentsController } from './documents.controller';

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
});
