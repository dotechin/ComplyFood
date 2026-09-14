import { ReportsService } from './reports.service';
import { LogStatus, LogType } from '../logs/entities/log-entry.entity';

describe('ReportsService', () => {
  const logsService = {
    findAll: jest.fn(),
  };
  const overridesService = {
    findByOrg: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(logsService as any, overridesService as any);
  });

  it('builds a compliance summary', async () => {
    logsService.findAll.mockResolvedValue([
      {
        id: '1',
        type: LogType.TEMPERATURE,
        status: LogStatus.PENDING,
        isException: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: '2',
        type: LogType.INCIDENT,
        status: LogStatus.OVERRIDDEN,
        isException: true,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    ]);
    overridesService.findByOrg.mockResolvedValue([
      { id: 'override-1', logEntryId: '2', fieldName: 'fields' },
    ]);

    const summary = await service.getComplianceSummary('org-1');

    expect(summary.totalLogs).toBe(2);
    expect(summary.totalOverrides).toBe(1);
    expect(summary.byStatus.pending).toBe(1);
    expect(summary.byType.incident).toBe(1);
    expect(summary.incidentSummary.total).toBe(1);
    expect(summary.incidentSummary.pending).toBe(0);
    expect(summary.incidentSummary.overridden).toBe(1);
    expect(summary.exceptionSummary.total).toBe(1);
    expect(summary.exceptionSummary.byType.incident).toBe(1);
    expect(summary.overridesByField.fields).toBe(1);
    expect(summary.overridesByType.incident).toBe(1);
  });

  it('generates CSV output for exported report data', async () => {
    logsService.findAll.mockResolvedValue([
      {
        id: '1',
        type: LogType.TEMPERATURE,
        status: LogStatus.CONFIRMED,
        locationId: 'location-1',
        submittedBy: 'user-1',
        submittedAt: new Date('2026-01-01T10:00:00Z'),
        createdAt: new Date('2026-01-01T09:00:00Z'),
        occurredAt: new Date('2026-01-01T08:00:00Z'),
        measuredAt: new Date('2026-01-01T08:30:00Z'),
        isException: true,
        exceptionReason: 'Supplier said "delay"',
        fields: { item: 'Fridge "A"', temperature: '4' },
      },
    ]);

    const csv = await service.generateCsv('org-1');

    expect(csv).toContain('id,type,status,locationId');
    expect(csv).toContain('"Supplier said ""delay"""');
    expect(csv).toContain('"{""item"":""Fridge \\""A\\"""",""temperature"":""4""}"');
  });

  it('generates a PDF buffer', async () => {
    logsService.findAll.mockResolvedValue([]);
    overridesService.findByOrg.mockResolvedValue([]);

    const pdf = await service.generatePdf('org-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('utf8')).toContain('%PDF-1.4');
  });
});
