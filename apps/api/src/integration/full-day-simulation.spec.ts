import { DataSource } from 'typeorm';
import { AuthService } from '../modules/auth/auth.service';
import { UsersService } from '../modules/users/users.service';
import { LogsService } from '../modules/logs/logs.service';
import { OverridesService } from '../modules/overrides/overrides.service';
import { ReportsService } from '../modules/reports/reports.service';
import { JwtService } from '@nestjs/jwt';
import { LogEntry, LogType } from '../modules/logs/entities/log-entry.entity';
import { User } from '../modules/users/entities/user.entity';
import { OverrideRecord } from '../modules/overrides/entities/override-record.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { TEST_CONFIG, cleanupTestStorage, createTestDataSource } from '../test-utils/pg-mem';

// Only Date is faked so pg-mem/bcrypt timers keep working.
const ONLY_DATE = [
  'nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'clearImmediate', 'queueMicrotask', 'performance', 'hrtime',
] as const;

describe('Full-day logging simulation', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    ({ dataSource } = await createTestDataSource());
  });

  afterEach(async () => {
    jest.useRealTimers();
    await cleanupTestStorage();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('stamps every reading with the server time and produces a complete report', async () => {
    const usersService = new UsersService(dataSource.getRepository(User));
    const logs = new LogsService(dataSource.getRepository(LogEntry), dataSource.getRepository(Document));
    const overrides = new OverridesService(dataSource.getRepository(OverrideRecord), logs);
    const reports = new ReportsService(logs, overrides);
    const auth = new AuthService(usersService, new JwtService({ secret: TEST_CONFIG.jwtSecret }), dataSource);
    const { user } = await auth.bootstrapOrganization('Trattoria Aurora', 'owner@aurora.example', 'password123');
    const orgId = user.orgId;

    jest.useFakeTimers({ doNotFake: [...ONLY_DATE] });
    const at = (hhmm: string) => jest.setSystemTime(new Date(`2026-10-14T${hhmm}:00.000Z`));

    const unitCheck = (unit: string, temperature: string, target: string) => ({
      Reading: 'ignored-client-value',
      'Workstation / unit': unit,
      'Target (critical limit)': target,
      'Measured temperature': `${temperature} °C`,
    });

    const timeline: Array<[string, () => Promise<LogEntry>]> = [
      ['07:00', () => logs.create(orgId, user.id, { type: LogType.CHECKLIST, fields: { Checklist: 'Opening', Shift: 'AM', 'All items completed': true } })],
      ['07:05', () => logs.create(orgId, user.id, { type: LogType.TEMPERATURE, fields: unitCheck('Bar counter 1', '3.2', 'Chilled ≤ 4°C') })],
      ['07:07', () => logs.create(orgId, user.id, { type: LogType.TEMPERATURE, fields: unitCheck('Bar counter 2', '3.8', 'Chilled ≤ 4°C') })],
      ['07:09', () => logs.create(orgId, user.id, { type: LogType.TEMPERATURE, fields: unitCheck('Kitchen chest freezer 4', '-19.5', 'Frozen ≤ -18°C') })],
      ['09:30', () => logs.create(orgId, user.id, { type: LogType.RECEIVING, fields: { Supplier: 'Fresh Dairy Co.', Product: 'Pasteurised cream', 'Batch / lot number': 'LOT-2291', 'Delivery temperature': '3 °C', 'Packaging condition': 'Acceptable' } })],
      ['10:15', () => logs.create(orgId, user.id, { type: LogType.CLEANING, fields: { 'Area / Item': 'Work surfaces', 'Cleaning date': '2026-10-14' } })],
      ['13:40', () => logs.create(orgId, user.id, { type: LogType.TEMPERATURE, fields: unitCheck('Bar counter 3', '7.5', 'Chilled ≤ 4°C') })],
      ['13:45', () => logs.create(orgId, user.id, { type: LogType.INCIDENT, fields: { 'Description of deviation / problem': 'Bar counter 3 at 7.5°C', 'Corrective action taken': 'Stock moved to counter 1, technician called' } })],
      ['19:00', () => logs.create(orgId, user.id, { type: LogType.TEMPERATURE, fields: unitCheck('Bar counter 1', '3.9', 'Chilled ≤ 4°C') })],
      ['23:30', () => logs.create(orgId, user.id, { type: LogType.CHECKLIST, fields: { Checklist: 'Closing', Shift: 'PM', 'All items completed': true } })],
    ];

    const created: LogEntry[] = [];
    for (const [time, action] of timeline) {
      at(time);
      created.push(await action());
    }

    // 1. Time is stamped automatically (UTC here) for readings and receipts.
    const stamped = created.filter((l) => l.type === LogType.TEMPERATURE || l.type === LogType.RECEIVING);
    expect(stamped.map((l) => l.measuredAt?.toISOString().slice(11, 16))).toEqual(
      ['07:05', '07:07', '07:09', '09:30', '13:40', '19:00'],
    );

    // Confirm everything, then override the out-of-range reading with a reason.
    at('23:45');
    for (const log of created) await logs.confirm(log.id, orgId, user.id);

    const from = new Date('2026-10-14T00:00:00.000Z');
    const to = new Date('2026-10-14T23:59:59.999Z');
    const summary = await reports.getComplianceSummary(orgId, undefined, undefined, undefined, from, to);
    const csv = await reports.generateCsv(orgId, undefined, undefined, undefined, from, to);
    const pdf = await reports.generatePdf(orgId, undefined, undefined, undefined, from, to);

    expect(summary.totalLogs).toBe(10);
    expect(summary.byType).toMatchObject({ temperature: 5, checklist: 2, receiving: 1, cleaning: 1, incident: 1 });
    expect(summary.byStatus.confirmed).toBe(10);
    expect(csv.split('\n')).toHaveLength(11);
    expect(pdf.toString('utf8')).toContain('Total logs: 10');

    // Human-readable report for the simulation.
    const lines = (await logs.findAll(orgId, undefined, undefined, undefined, from, to)).reverse().map((l) => {
      const time = (l.measuredAt ?? l.createdAt).toISOString().slice(11, 16);
      const f = l.fields as Record<string, unknown>;
      const detail = Object.entries(f).filter(([k]) => k !== 'Reading').map(([k, v]) => `${k}=${v}`).join('; ');
      return `${time}  ${l.type.padEnd(11)} ${l.status.padEnd(9)} ${detail}`;
    });
    // eslint-disable-next-line no-console
    console.log(`\n=== DAILY REPORT 2026-10-14 ===\n${lines.join('\n')}\n\nSummary: ${JSON.stringify({ total: summary.totalLogs, byType: summary.byType, byStatus: summary.byStatus, incidents: summary.incidentSummary })}\n`);
  });
});
