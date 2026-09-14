import { LogStatus, LogType } from '../logs/entities/log-entry.entity';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  const reportsService = {
    getComplianceSummary: jest.fn(),
    generateCsv: jest.fn(),
    generatePdf: jest.fn(),
  };

  let controller: ReportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportsController(reportsService as any);
  });

  it('parses date filters before loading the summary', () => {
    controller.getSummary(
      { orgId: 'org-1' },
      LogType.TEMPERATURE,
      'location-1',
      LogStatus.CONFIRMED,
      '2026-09-01',
      '2026-09-14',
    );

    expect(reportsService.getComplianceSummary).toHaveBeenCalledWith(
      'org-1',
      LogType.TEMPERATURE,
      'location-1',
      LogStatus.CONFIRMED,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-14T23:59:59.999Z'),
    );
  });

  it('exports CSV responses with download headers', async () => {
    const res = { setHeader: jest.fn(), send: jest.fn() };
    reportsService.generateCsv.mockResolvedValue('id,type\n1,temperature');

    await controller.exportCsv({ orgId: 'org-1' }, res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="compliance-report.csv"',
    );
    expect(res.send).toHaveBeenCalledWith('id,type\n1,temperature');
  });

  it('exports PDF responses with download headers', async () => {
    const res = { setHeader: jest.fn(), send: jest.fn() };
    const pdf = Buffer.from('%PDF-1.4');
    reportsService.generatePdf.mockResolvedValue(pdf);

    await controller.exportPdf({ orgId: 'org-1' }, res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="compliance-report.pdf"',
    );
    expect(res.send).toHaveBeenCalledWith(pdf);
  });
});
