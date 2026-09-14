import { NotFoundException } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogStatus, LogType } from './entities/log-entry.entity';

describe('LogsService', () => {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: value.id ?? 'log-1',
      createdAt: value.createdAt ?? new Date('2026-01-01T00:00:00Z'),
      ...value,
    })),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  let service: LogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogsService(repo as any);
  });

  it('creates pending log entries', async () => {
    const result = await service.create('org-1', 'user-1', {
      type: LogType.TEMPERATURE,
      fields: { item: 'Fridge', temperature: '4' },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        status: LogStatus.PENDING,
        submittedBy: null,
      }),
    );
    expect(result.status).toBe(LogStatus.PENDING);
  });

  it('confirms a log entry', async () => {
    repo.findOne.mockResolvedValue({
      id: 'log-1',
      orgId: 'org-1',
      status: LogStatus.PENDING,
      fields: {},
      createdAt: new Date(),
    });

    const result = await service.confirm('log-1', 'org-1', 'user-1');

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'log-1',
        status: LogStatus.CONFIRMED,
        submittedBy: 'user-1',
      }),
    );
    expect(result.status).toBe(LogStatus.CONFIRMED);
  });

  it('throws when a log entry is missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('applies exception metadata and can unlock the log status', async () => {
    repo.findOne.mockResolvedValue({
      id: 'log-1',
      orgId: 'org-1',
      status: LogStatus.CONFIRMED,
      fields: { item: 'Fridge 1' },
      isException: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      occurredAt: null,
      measuredAt: null,
    });

    const result = await service.applyException(
      'log-1',
      'org-1',
      'admin-1',
      'Backdated supplier receipt',
      {
        occurredAt: new Date('2026-01-02T00:00:00Z'),
        measuredAt: new Date('2026-01-02T01:00:00Z'),
        unlockToStatus: LogStatus.PENDING,
      },
    );

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'log-1',
        status: LogStatus.PENDING,
        isException: true,
        exceptionReason: 'Backdated supplier receipt',
        exceptionBy: 'admin-1',
      }),
    );
    expect(result.isException).toBe(true);
    expect(result.exceptionAt).toBeInstanceOf(Date);
  });

  it('extracts temperature hints from capture file names', () => {
    expect(service.suggestTemperatureFromCapture('fridge-temp-4.5C.jpg')).toEqual({
      extractedValue: '4.5°C',
      confidence: 0.72,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('freezer_-18C.jpg')).toEqual({
      extractedValue: '-18°C',
      confidence: 0.52,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('kitchen-photo.jpg')).toEqual({
      extractedValue: null,
      confidence: 0.05,
      source: 'none',
    });
  });
});
