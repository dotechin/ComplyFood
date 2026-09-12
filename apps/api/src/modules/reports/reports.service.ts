import { Injectable } from '@nestjs/common';
import { LogStatus, LogType } from '../logs/entities/log-entry.entity';
import { LogsService } from '../logs/logs.service';
import { OverridesService } from '../overrides/overrides.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly logsService: LogsService,
    private readonly overridesService: OverridesService,
  ) {}

  async getComplianceSummary(
    orgId: string,
    type?: LogType,
    locationId?: string,
    status?: LogStatus,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const logs = await this.logsService.findAll(orgId, type, locationId, status, dateFrom, dateTo);
    const overrides = await this.overridesService.findByOrg(orgId);
    const logIds = new Set(logs.map((log) => log.id));
    const logById = new Map(logs.map((log) => [log.id, log]));
    const filteredOverrides = overrides.filter((override) => logIds.has(override.logEntryId));
    const exceptionLogs = logs.filter((log) => log.isException);
    const byStatus = {
      pending: logs.filter((log) => log.status === LogStatus.PENDING).length,
      confirmed: logs.filter((log) => log.status === LogStatus.CONFIRMED).length,
      overridden: logs.filter((log) => log.status === LogStatus.OVERRIDDEN).length,
    };
    const byType = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.type] = (acc[log.type] ?? 0) + 1;
      return acc;
    }, {});
    const incidentLogs = logs.filter((log) => log.type === LogType.INCIDENT);
    const overridesByField = filteredOverrides.reduce<Record<string, number>>((acc, override) => {
      acc[override.fieldName] = (acc[override.fieldName] ?? 0) + 1;
      return acc;
    }, {});
    const overridesByType = filteredOverrides.reduce<Record<string, number>>((acc, override) => {
      const logType = logById.get(override.logEntryId)?.type ?? 'unknown';
      acc[logType] = (acc[logType] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalLogs: logs.length,
      totalOverrides: filteredOverrides.length,
      byStatus,
      byType,
      incidentSummary: {
        total: incidentLogs.length,
        pending: incidentLogs.filter((log) => log.status === LogStatus.PENDING).length,
        overridden: incidentLogs.filter((log) => log.status === LogStatus.OVERRIDDEN).length,
      },
      exceptionSummary: {
        total: exceptionLogs.length,
        byType: exceptionLogs.reduce<Record<string, number>>((acc, log) => {
          acc[log.type] = (acc[log.type] ?? 0) + 1;
          return acc;
        }, {}),
      },
      overridesByField,
      overridesByType,
      recentLogs: logs.slice(0, 10),
      recentOverrides: filteredOverrides.slice(0, 10),
    };
  }

  async generateCsv(
    orgId: string,
    type?: LogType,
    locationId?: string,
    status?: LogStatus,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const logs = await this.logsService.findAll(orgId, type, locationId, status, dateFrom, dateTo);
    const header =
      'id,type,status,locationId,submittedBy,submittedAt,createdAt,occurredAt,measuredAt,isException,exceptionReason,fields\n';
    const rows = logs
      .map((log) =>
        [
          log.id,
          log.type,
          log.status,
          log.locationId ?? '',
          log.submittedBy ?? '',
          log.submittedAt?.toISOString?.() ?? '',
          log.createdAt.toISOString?.() ?? '',
          log.occurredAt?.toISOString?.() ?? '',
          log.measuredAt?.toISOString?.() ?? '',
          log.isException ? 'yes' : 'no',
          log.exceptionReason ?? '',
          JSON.stringify(log.fields).replace(/"/g, '""'),
        ]
          .map((value) => `"${String(value)}"`)
          .join(','),
      )
      .join('\n');
    return header + rows;
  }

  async generatePdf(
    orgId: string,
    type?: LogType,
    locationId?: string,
    status?: LogStatus,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const summary = await this.getComplianceSummary(orgId, type, locationId, status, dateFrom, dateTo);
    const lines = [
      'ComplyFood Compliance Report',
      '',
      `Total logs: ${summary.totalLogs}`,
      `Total overrides: ${summary.totalOverrides}`,
      `Pending: ${summary.byStatus.pending}`,
      `Confirmed: ${summary.byStatus.confirmed}`,
      `Overridden: ${summary.byStatus.overridden}`,
      `Incidents: ${summary.incidentSummary.total}`,
      `Exception logs: ${summary.exceptionSummary.total}`,
      '',
      'Logs by type:',
      ...Object.entries(summary.byType).map(([key, value]) => `- ${key}: ${value}`),
      '',
      'Overrides by field:',
      ...Object.entries(summary.overridesByField).map(([key, value]) => `- ${key}: ${value}`),
      '',
      'Recent logs:',
      ...summary.recentLogs.map(
        (log) => `${log.type} | ${log.status} | ${log.createdAt.toISOString?.() ?? log.createdAt}`,
      ),
    ];

    return this.buildPdf(lines);
  }

  private buildPdf(lines: string[]): Buffer {
    const textCommands = lines
      .map((line, index) => `1 0 0 1 50 ${770 - index * 18} Tm (${this.escapePdfText(line)}) Tj`)
      .join('\n');
    const stream = `BT\n/F1 12 Tf\n${textCommands}\nET`;

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
