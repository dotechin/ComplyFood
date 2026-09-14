import { BadRequestException } from '@nestjs/common';
import { LogStatus } from '../logs/entities/log-entry.entity';
import { OverridesService } from './overrides.service';

describe('OverridesService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'override-1', ...value })),
    find: jest.fn(),
  };
  const logsService = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let service: OverridesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OverridesService(repo as any, logsService as any);
  });

  it('requires a reason for every override', async () => {
    await expect(
      service.create('user-1', 'org-1', {
        logEntryId: 'log-1',
        fieldName: 'temperature',
        newValue: '6',
        reason: '  ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the log entry and persists the override record', async () => {
    logsService.findOne.mockResolvedValue({
      id: 'log-1',
      orgId: 'org-1',
      fields: { temperature: '4', item: 'Fridge 1' },
    });
    logsService.update.mockResolvedValue(undefined);

    const result = await service.create('user-1', 'org-1', {
      logEntryId: 'log-1',
      fieldName: 'temperature',
      originalValue: '4',
      newValue: '6',
      reason: 'Measured again after restocking',
    });

    expect(logsService.update).toHaveBeenCalledWith('log-1', 'org-1', {
      status: LogStatus.OVERRIDDEN,
      fields: { temperature: '6', item: 'Fridge 1' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        logEntryId: 'log-1',
        userId: 'user-1',
        reason: 'Measured again after restocking',
      }),
    );
    expect(result.id).toBe('override-1');
  });

  it('lists overrides for a log entry after validating organization access', async () => {
    logsService.findOne.mockResolvedValue({ id: 'log-1', orgId: 'org-1' });
    repo.find.mockResolvedValue([]);

    await service.findByLogEntry('log-1', 'org-1');

    expect(logsService.findOne).toHaveBeenCalledWith('log-1', 'org-1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { logEntryId: 'log-1' },
      order: { createdAt: 'DESC' },
    });
  });
});
