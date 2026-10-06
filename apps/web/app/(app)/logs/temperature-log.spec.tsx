import { renderToStaticMarkup } from 'react-dom/server';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import LogsPage from './page';
import { TEMPERATURE_UNITS, TemperatureLog } from './temperature-log';

function reading(temperature: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: LogType.TEMPERATURE,
    status: LogStatus.CONFIRMED,
    fields: { 'Workstation / unit': TEMPERATURE_UNITS[0].value, 'Measured temperature': temperature },
    createdAt: '2026-01-01T12:00:00Z',
    ...overrides,
  } as LogEntry;
}

function renderLog(logs: LogEntry[] = [], year = 2026) {
  return renderToStaticMarkup(<TemperatureLog logs={logs} year={year} loading={false} onRecord={jest.fn()} />);
}

function monthCells(html: string, month: string) {
  const row = html.split(`>${month}</th>`)[1].split('</tr>')[0];
  return Array.from(row.matchAll(/<td[^>]*>(.*?)<\/td>/g), (match) => match[1]);
}

describe('temperature log sheets', () => {
  it('renders all source-form units and weekly cleaning controls on Daily Logs', () => {
    const html = renderToStaticMarkup(<LogsPage />);
    expect(html).toContain('Temperature Log — Bar counter 1');
    expect(html).toContain('Temperature Log — Bar counter 2');
    expect(html).toContain('Temperature Log — Bar counter 3');
    expect(html).toContain('Temperature Log — Kitchen chest freezer 4');
    expect(html).toContain('Import verified historical temperature outcomes');
    expect(html).toContain('Week 1');
    expect(html).toContain('C — Compliant');
    expect(html).toContain('A — Acceptable');
    expect(html).toContain('NC — Non-compliant');
    expect(html).toContain('Save reading');
  });

  it('renders annual grids for each unit and marks Sundays as closed', () => {
    const html = renderLog();
    expect(html.match(/<table/g)).toHaveLength(4);
    expect(html).toContain('Year: 2026');
    expect(html).toContain('November');
    expect(html).toContain('Off');
    expect(monthCells(html, 'February').slice(28)).toEqual(['—', '—', '—']);
    expect(monthCells(renderLog([], 2028), 'February')[28]).toBe('Off');
  });

  it('uses explicit historical C/NC outcomes and ignores Sundays', () => {
    const html = renderLog([
      reading('', {
        fields: {
          'Workstation / unit': TEMPERATURE_UNITS[0].value,
          'Original form outcome': 'C',
        },
        occurredAt: '2026-01-05T00:00:00.000Z',
      }),
      reading('', {
        fields: {
          'Workstation / unit': TEMPERATURE_UNITS[0].value,
          'Original form outcome': 'NC',
        },
        occurredAt: '2026-01-06T00:00:00.000Z',
      }),
      reading('', {
        fields: {
          'Workstation / unit': TEMPERATURE_UNITS[0].value,
          'Original form outcome': 'NC',
        },
        occurredAt: '2026-01-04T00:00:00.000Z',
      }),
    ]);
    const cells = monthCells(html, 'January');
    expect(cells[4]).toBe('C');
    expect(cells[5]).toBe('NC');
    expect(cells[3]).toBe('Off');
  });

  it('uses the equipment-specific limits for new numeric readings', () => {
    const bar = renderLog([reading('4 °C')]);
    const freezer = renderLog([reading('-18 °C', {
      fields: { 'Workstation / unit': TEMPERATURE_UNITS[3].value, 'Measured temperature': '-18 °C' },
    })]);
    expect(monthCells(bar, 'January')[0]).toBe('C');
    expect(monthCells(freezer, 'January')[0]).toBe('C');
    expect(monthCells(renderLog([reading('-17 °C', {
      fields: { 'Workstation / unit': TEMPERATURE_UNITS[3].value, 'Measured temperature': '-17 °C' },
    })]), 'January')[0]).toBe('NC');
  });

  it('retains a non-compliant result when multiple readings exist for one day', () => {
    const logs = [
      reading('4 °C', { occurredAt: '2026-01-05T00:00:00.000Z' }),
      reading('5 °C', { occurredAt: '2026-01-05T00:00:00.000Z' }),
    ];
    expect(monthCells(renderLog(logs), 'January')[4]).toBe('NC');
  });

  it('excludes unsupported units, other types, pending entries, invalid values and other years', () => {
    const html = renderLog([
      reading('4 °C', { fields: { 'Workstation / unit': 'Kitchen Fridge 5', 'Measured temperature': '4 °C' } }),
      reading('4 °C', { type: LogType.RECEIVING }),
      reading('4 °C', { status: LogStatus.PENDING }),
      reading('unknown'),
      reading('4 °C', { createdAt: '2025-01-01T12:00:00Z' }),
    ]);
    expect(monthCells(html, 'January')[0]).toBe('');
  });
});
