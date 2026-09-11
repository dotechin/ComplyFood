import { ChecklistsService } from './checklists.service';
import { LogType } from '../logs/entities/log-entry.entity';

describe('ChecklistsService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'template-1', ...value })),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const logsService = {
    create: jest.fn(async (_orgId, _userId, value) => ({ id: 'log-1', ...value })),
  };

  let service: ChecklistsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChecklistsService(repo as any, logsService as any);
  });

  it('creates a checklist log from a template', async () => {
    repo.findOne.mockResolvedValue({
      id: 'template-1',
      orgId: 'org-1',
      name: 'Opening checklist',
      type: 'opening',
      fieldsConfig: { items: ['Check fridge'] },
    });

    const result = await service.generateLog('template-1', 'org-1', 'user-1');

    expect(logsService.create).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({ type: LogType.CHECKLIST }),
    );
    expect(result.fields.templateName).toBe('Opening checklist');
  });
});
