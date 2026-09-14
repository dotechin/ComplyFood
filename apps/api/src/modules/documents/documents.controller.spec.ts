import { BadRequestException } from '@nestjs/common';
import { DocumentCategory } from '@complyfood/shared';
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

  it('rejects HACCP manual files linked to log entries', () => {
    expect(() =>
      controller.upload(
        { orgId: 'org-1', id: 'user-1' },
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
