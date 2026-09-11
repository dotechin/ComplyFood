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
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: '2',
        type: LogType.INCIDENT,
        status: LogStatus.OVERRIDDEN,
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
    expect(summary.incidentSummary.overridden).toBe(1);
    expect(summary.overridesByField.fields).toBe(1);
  });

  it('generates a PDF buffer', async () => {
    logsService.findAll.mockResolvedValue([]);
    overridesService.findByOrg.mockResolvedValue([]);

    const pdf = await service.generatePdf('org-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('utf8')).toContain('%PDF-1.4');
  });
});
