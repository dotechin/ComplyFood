import { AutomationService } from './automation.service';
import { SupermodeSchedule } from './entities/supermode-schedule.entity';

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
  const supermodeScheduleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
    manager: { transaction: jest.fn() },
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
      supermodeScheduleRepo as any,
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

  it('recovers missed runs after restart and serializes concurrent ticks to avoid duplicates', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-12T10:00:00.000Z'));
    const schedule = {
      id: 'schedule-1',
      orgId: 'org-1',
      enabled: true,
      cadence: 'daily' as const,
      runTime: '06:00',
      timezone: 'UTC',
      weeklyRunDay: null,
      openingDays: [0, 1, 2, 3, 4, 5, 6],
      appliances: [{ name: 'Fridge 1', category: 'fridge' as const, limit: 4 }],
      lastRunLocalDate: '2026-11-09',
      lastRunAt: null,
      lastError: null,
    };
    const savedEntries: any[] = [];
    let transactionQueue = Promise.resolve();
    const manager = {
      getRepository: (entity: unknown) => entity === undefined ? null
        : entity === SupermodeSchedule
          ? {
              findOne: jest.fn(async () => schedule),
              save: jest.fn(async (value) => value),
            }
          : {
              create: (value: any) => value,
              find: jest.fn().mockResolvedValue([]),
              save: jest.fn(async (entries: any[]) => { savedEntries.push(...entries); return entries; }),
            },
    };
    supermodeScheduleRepo.find.mockResolvedValue([schedule]);
    supermodeScheduleRepo.update.mockResolvedValue({ affected: 1 });
    supermodeScheduleRepo.manager.transaction.mockImplementation(async (callback) => {
      const previous = transactionQueue;
      let release = () => {};
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await callback(manager);
      } finally {
        release();
      }
    });

    try {
      await Promise.all([service.processSupermodeSchedules(), service.processSupermodeSchedules()]);
      expect(savedEntries.map((entry) => entry.fields.scheduledDate)).toEqual([
        '2026-11-10', '2026-11-11', '2026-11-12',
      ]);
      expect(new Set(savedEntries.map((entry) => entry.scheduleKey)).size).toBe(3);
      expect(schedule.lastRunLocalDate).toBe('2026-11-12');
      expect(savedEntries.every((entry) => entry.status === 'pending' && entry.submittedBy === null)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
