import { BadRequestException, NotFoundException } from '@nestjs/common';
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
