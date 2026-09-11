import { AutomationService } from './automation.service';

describe('AutomationService', () => {
  const presetRepo = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: value.id ?? 'preset-1', ...value })),
  };
  const reminderRepo = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const reminderEventRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'event-1', ...value })),
  };
  const logsService = {
    findAll: jest.fn(),
    hasPresetEntryForDate: jest.fn(),
    create: jest.fn(async (_orgId, _userId, value) => ({ id: 'log-1', ...value })),
  };

  let service: AutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationService(
      presetRepo as any,
      reminderRepo as any,
      reminderEventRepo as any,
      logsService as any,
    );
  });

  it('creates reminder events for due rules', async () => {
    reminderRepo.find.mockResolvedValue([
      {
        id: 'rule-1',
        orgId: 'org-1',
        type: 'temperature',
        message: 'Complete temperature tasks',
        cronExpression: '* * * * *',
        isActive: true,
        lastTriggeredAt: null,
      },
    ]);
    reminderEventRepo.findOne.mockResolvedValue(null);

    await service.processDueReminders();

    expect(reminderEventRepo.save).toHaveBeenCalled();
    expect(reminderRepo.save).toHaveBeenCalled();
  });

  it('generates daily forms only once per preset per day', async () => {
    presetRepo.find.mockResolvedValue([
      {
        id: 'preset-1',
        orgId: 'org-1',
        type: 'temperature',
        defaults: { item: 'Fridge 1' },
        schedule: { active: true, weekdays: [0, 1, 2, 3, 4, 5, 6] },
      },
    ]);
    logsService.hasPresetEntryForDate.mockResolvedValue(false);

    const result = await service.generateDailyFormsForOrg('org-1');

    expect(logsService.create).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
