import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogStatus, LogType } from './entities/log-entry.entity';

describe('LogsService', () => {
  const transactionSave = jest.fn(async (_entity, entries) => entries);
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: value.id ?? 'log-1',
      createdAt: value.createdAt ?? new Date('2026-01-01T00:00:00Z'),
      ...value,
    })),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn(async (callback) => callback({ save: transactionSave })),
    },
    createQueryBuilder: jest.fn(),
  };
  const documents = { findOne: jest.fn() };

  let service: LogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogsService(repo as any, documents as any);
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

  it('filters historical source months exclusively and otherwise prefers measured dates', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo.createQueryBuilder.mockReturnValue(query);
    const dateFrom = new Date('2026-01-01T00:00:00Z');
    const dateTo = new Date('2026-12-31T23:59:59Z');

    await service.findAll('org-1', undefined, undefined, undefined, dateFrom, dateTo);

    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("log.fields->>'Source month' IS NOT NULL AND log.fields->>'Source month' BETWEEN"),
      expect.objectContaining({ sourcePeriodFrom: '2026-01', sourcePeriodTo: '2026-12' }),
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE(log.measured_at, log.occurred_at, log.created_at)'),
      expect.any(Object),
    );
    expect(query.orderBy).toHaveBeenCalledWith(
      expect.stringContaining("to_date(log.fields->>'Source month', 'YYYY-MM')::timestamptz, log.measured_at, log.occurred_at"),
      'DESC',
    );
  });

  it('requires all weekly cleaning outcomes and corrective action for NC', async () => {
    const fields: Record<string, string> = Object.fromEntries([
      'Machinery and equipment',
      'Work surfaces',
      'Sinks',
      'Walls and ceilings',
      'Floors',
      'Dishwashing area and utensils',
      'Fridges and freezers',
      'Waste containers',
      'Personal hygiene',
      'Staff facilities',
      'Shelves and cupboards',
    ].map((category) => [`Cleaning outcome — ${category}`, 'C']));
    fields['Weekly check'] = '1';

    expect(() => service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { ...fields, 'Cleaning outcome — Floors': 'NC' },
    })).toThrow(BadRequestException);

    await expect(service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { ...fields, 'Cleaning outcome — Floors': 'NC', 'Corrective action': 'Re-cleaned floor' },
    })).resolves.toEqual(expect.objectContaining({ type: LogType.CLEANING }));
  });

  it('accepts Cleaning & Disinfection Schedule ticks with an area and a calendar date', async () => {
    await expect(service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { 'Area / Item': 'Ice Machine (Bar)', 'Cleaning date': '2026-10-05' },
    })).resolves.toEqual(expect.objectContaining({
      type: LogType.CLEANING,
      occurredAt: new Date('2026-10-05T00:00:00.000Z'),
    }));

    expect(() => service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { 'Area / Item': ' ', 'Cleaning date': '2026-10-05' },
    })).toThrow(BadRequestException);
    expect(() => service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { 'Area / Item': 'Ice Machine (Bar)', 'Cleaning date': '05/10/2026' },
    })).toThrow(BadRequestException);
    expect(() => service.create('org-1', 'user-1', {
      type: LogType.CLEANING,
      fields: { 'Area / Item': 'Ice Machine (Bar)', 'Cleaning date': '2026-02-30' },
    })).toThrow(BadRequestException);
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

  it('keeps scheduled checks pending until a person records an actual performed check', async () => {
    const entry = {
      id: 'scheduled-1',
      orgId: 'org-1',
      scheduleKey: 'schedule:date:fridge',
      status: LogStatus.PENDING,
      fields: { category: 'fridge', limit: 4, 'Workstation / unit': 'Fridge 1' },
      submittedBy: null,
      submittedAt: null,
    };
    repo.findOne.mockResolvedValue(entry);

    await expect(service.completeScheduledCheck('scheduled-1', 'org-1', 'staff-1', {
      performed: true,
      temperature: 8,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();

    await service.completeScheduledCheck('scheduled-1', 'org-1', 'staff-1', {
      performed: true,
      temperature: 8,
      exceptionReason: 'Unit above limit',
      correctiveAction: 'Moved food to backup fridge',
    });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: LogStatus.CONFIRMED,
      submittedBy: 'staff-1',
      submittedAt: expect.any(Date),
      measuredAt: expect.any(Date),
      isException: true,
      exceptionReason: 'Unit above limit',
      fields: expect.objectContaining({ temperature: 8, 'Corrective action': 'Moved food to backup fridge' }),
    }));
  });

  it('leaves unperformed scheduled checks unchanged', async () => {
    const entry = { id: 'scheduled-1', orgId: 'org-1', scheduleKey: 'key', status: LogStatus.PENDING, fields: {} };
    repo.findOne.mockResolvedValue(entry);

    await expect(service.completeScheduledCheck('scheduled-1', 'org-1', 'staff-1', { performed: false }))
      .resolves.toBe(entry);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('imports only explicitly classified browser readings and rejects competing server records', async () => {
    repo.find.mockResolvedValue([]);
    repo.findOne.mockResolvedValue(null);
    const result = await service.importBrowserTemperatures('org-1', 'admin-1', [{
      date: '2026-11-11',
      unit: 'Fridge 1',
      category: 'fridge',
      temperature: 3.5,
      measuredAt: '2026-11-11T08:30:00.000Z',
      classification: 'real',
    }]);

    expect(result).toEqual({ imported: 1, duplicates: 0 });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      importKey: 'browser-temperature:2026-11-11:Fridge 1',
      status: LogStatus.PENDING,
      dataClassification: 'real',
      submittedBy: null,
    }));
    expect(repo.save.mock.calls[0][0].fields['Browser import reviewed by']).toBe('admin-1');

    repo.find.mockResolvedValue([{
      id: 'server-log',
      fields: { 'Workstation / unit': 'Fridge 1' },
      occurredAt: new Date('2026-11-11T00:00:00.000Z'),
      importKey: null,
    }]);
    repo.findOne.mockResolvedValue(null);
    await expect(service.importBrowserTemperatures('org-1', 'admin-1', [{
      date: '2026-11-11',
      unit: 'Fridge 1',
      category: 'fridge',
      temperature: 3.5,
      measuredAt: '2026-11-11T08:30:00.000Z',
      classification: 'real',
    }])).rejects.toBeInstanceOf(ConflictException);
  });

  it('isolates demo and unreviewed data from the default log query', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo.createQueryBuilder.mockReturnValue(query);

    await service.findAll('org-1');
    expect(query.andWhere).toHaveBeenCalledWith(
      'log.data_classification IN (:...classifications)',
      { classifications: ['real', 'historical'] },
    );

    query.andWhere.mockClear();
    await service.findAll('org-1', undefined, undefined, undefined, undefined, undefined, true);
    expect(query.andWhere).toHaveBeenCalledWith(
      'log.data_classification = :classification',
      { classification: 'demo' },
    );
  });

  it('throws when a log entry is missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('imports source C/NC marks with immutable PDF provenance and skips Sundays', async () => {
    documents.findOne.mockResolvedValue({
      id: 'pdf-1',
      orgId: 'org-1',
      name: 'Temp 2020.pdf',
      mimeType: 'application/pdf',
    });
    repo.find.mockResolvedValue([]);

    const result = await service.importHistoricalTemperatures('org-1', 'admin-1', 'pdf-1', [
      { date: '2020-11-02', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'C', page: 1 },
      { date: '2020-11-03', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'NC', page: 1 },
      { date: '2020-11-01', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'C', page: 1 },
    ]);

    expect(result).toEqual({ imported: 2, skippedSundays: 1, duplicates: 0 });
    const entries = transactionSave.mock.calls[0][1];
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(expect.objectContaining({
      status: LogStatus.CONFIRMED,
      submittedBy: 'admin-1',
      recordOrigin: 'historical_transcription',
      sourceDocumentId: 'pdf-1',
      sourcePage: 1,
      occurredAt: new Date('2020-11-02T00:00:00.000Z'),
    }));
    expect(entries[0].fields).toEqual(expect.objectContaining({
      'Original form outcome': 'C',
      'Source PDF': 'Temp 2020.pdf',
    }));
    expect(entries[0].fields).not.toHaveProperty('Measured temperature');
    repo.find.mockResolvedValue(entries);
    await expect(service.importHistoricalTemperatures('org-1', 'admin-1', 'pdf-1', [
      { date: '2020-11-02', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'C', page: 1 },
      { date: '2020-11-03', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'NC', page: 1 },
    ])).resolves.toEqual({ imported: 0, skippedSundays: 0, duplicates: 2 });
    expect(transactionSave).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting source outcomes for the same temperature/day/unit', async () => {
    documents.findOne.mockResolvedValue({
      id: 'pdf-1',
      orgId: 'org-1',
      name: 'Temp 2020.pdf',
      mimeType: 'application/pdf',
    });
    await expect(service.importHistoricalTemperatures('org-1', 'admin-1', 'pdf-1', [
      { date: '2020-11-02', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'C', page: 1 },
      { date: '2020-11-02', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'NC', page: 1 },
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid historical dates and files from another organization', async () => {
    documents.findOne.mockResolvedValue(null);
    await expect(service.importHistoricalTemperatures('org-1', 'admin-1', 'missing', []))
      .rejects.toBeInstanceOf(NotFoundException);

    documents.findOne.mockResolvedValue({ id: 'pdf-1', name: 'Temp.pdf', mimeType: 'application/pdf' });
    await expect(service.importHistoricalTemperatures('org-1', 'admin-1', 'pdf-1', [
      { date: '2020-02-30', unit: 'Banco Refrigerato Bar (n.1)', outcome: 'C', page: 1 },
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('imports weekly cleaning marks without inventing an exact source day or corrective action', async () => {
    documents.findOne.mockResolvedValue({
      id: 'cleaning-pdf',
      orgId: 'org-1',
      name: 'pulizie 2020.pdf',
      mimeType: 'application/pdf',
    });
    repo.find.mockResolvedValue([]);
    const outcomes: Array<'C' | 'A' | 'NC'> = Array(11).fill('C');
    outcomes[4] = 'NC';

    const result = await service.importHistoricalCleaning('org-1', 'admin-1', 'cleaning-pdf', [{
      period: '2020-11',
      week: 2,
      page: 11,
      outcomes,
    }]);

    expect(result).toEqual({ imported: 1, duplicates: 0 });
    const [entry] = transactionSave.mock.calls[0][1];
    expect(entry).toEqual(expect.objectContaining({
      type: LogType.CLEANING,
      status: LogStatus.CONFIRMED,
      submittedBy: 'admin-1',
      occurredAt: null,
      measuredAt: null,
      recordOrigin: 'historical_transcription',
      sourceDocumentId: 'cleaning-pdf',
      sourcePage: 11,
    }));
    expect(entry.fields).toEqual(expect.objectContaining({
      'Source month': '2020-11',
      'Source week': 2,
      'Cleaning outcome — Floors': 'NC',
    }));
    expect(entry.fields).not.toHaveProperty('Corrective action');
  });

  it('does not permit edits to historical source transcriptions', async () => {
    repo.findOne.mockResolvedValue({
      id: 'log-1',
      orgId: 'org-1',
      recordOrigin: 'historical_transcription',
      fields: { 'Original form outcome': 'C' },
    });
    await expect(service.update('log-1', 'org-1', { fields: { 'Original form outcome': 'NC' } }))
      .rejects.toBeInstanceOf(BadRequestException);
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
    expect(service.suggestTemperatureFromCapture('temp-4C.jpg')).toEqual({
      extractedValue: '-4°C',
      confidence: 0.72,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('freezer_-18C.jpg')).toEqual({
      extractedValue: '-18°C',
      confidence: 0.52,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('tempA-4C.jpg')).toEqual({
      extractedValue: '-4°C',
      confidence: 0.72,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('temp -4.5C.jpg')).toEqual({
      extractedValue: '-4.5°C',
      confidence: 0.72,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('temperature--4C.jpg')).toEqual({
      extractedValue: '-4°C',
      confidence: 0.72,
      source: 'filename',
    });
    expect(service.suggestTemperatureFromCapture('kitchen-photo.jpg')).toEqual({
      extractedValue: null,
      confidence: 0.05,
      source: 'none',
    });
    expect(service.suggestTemperatureFromCapture('invoice-2026.jpg')).toEqual({
      extractedValue: null,
      confidence: 0.05,
      source: 'none',
    });
  });
});
