import { Injectable } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';
import { OverridesService } from '../overrides/overrides.service';
import { LogType } from '../logs/entities/log-entry.entity';

@Injectable()
export class ReportsService {
  constructor(
    private readonly logsService: LogsService,
    private readonly overridesService: OverridesService,
  ) {}

  async getComplianceSummary(orgId: string, type?: LogType, locationId?: string) {
    const logs = await this.logsService.findAll(orgId, type, locationId);
    const overrides = await this.overridesService.findByOrg(orgId);
    return { totalLogs: logs.length, totalOverrides: overrides.length, logs, overrides };
  }

  async generateCsv(orgId: string, type?: LogType) {
    const logs = await this.logsService.findAll(orgId, type);
    const header = 'id,type,status,submittedBy,submittedAt,createdAt
';
    const rows = logs
      .map((l) => `${l.id},${l.type},${l.status},${l.submittedBy},${l.submittedAt},${l.createdAt}`)
      .join('
');
    return header + rows;
  }
}
