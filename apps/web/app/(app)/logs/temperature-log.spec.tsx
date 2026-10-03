import { renderToStaticMarkup } from 'react-dom/server';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import LogsPage from './page';
import { KITCHEN_FRIDGE_5, KITCHEN_FRIDGE_5_TITLE, TemperatureLog } from './temperature-log';

function reading(temperature: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: LogType.TEMPERATURE,
    status: LogStatus.CONFIRMED,
    fields: { 'Workstation / unit': KITCHEN_FRIDGE_5, 'Measured temperature': temperature },
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

describe('Kitchen Fridge 5 temperature log', () => {
  it('is accessible alongside the compact daily temperature form', () => {
    const html = renderToStaticMarkup(<LogsPage />);
    expect(html).toContain(KITCHEN_FRIDGE_5_TITLE);
    expect(html).toContain('Record reading');
    expect(html).toContain('>Unit<span');
    expect(html).toContain('Save reading');
    expect(html).toContain('Cleaning');
  });

  it('renders a compact English annual grid without fabricating readings', () => {
    const html = renderLog();
    expect(html).toContain(KITCHEN_FRIDGE_5_TITLE);
    expect(html).toContain('Year: 2026');
    expect(html).toContain('December');
    expect(html).toContain('C = Compliant');
    expect(monthCells(html, 'January')).toEqual(Array(31).fill(''));
    expect(monthCells(html, 'February').slice(28)).toEqual(['—', '—', '—']);
    expect(monthCells(renderLog([], 2028), 'February')[28]).toBe('');
  });

  it('uses the fridge limit and retains any non-compliant reading for a day', () => {
    expect(monthCells(renderLog([reading('4 °C')]), 'January')[0]).toBe('C');
    expect(monthCells(renderLog([reading('4 °C'), reading('5 °C')]), 'January')[0]).toBe('NC');
    expect(monthCells(renderLog([reading('5 °C'), reading('4 °C')]), 'January')[0]).toBe('NC');
  });

  it('accepts decimal and scientific notation from the existing number input', () => {
    expect(monthCells(renderLog([reading('.5 °C')]), 'January')[0]).toBe('C');
    expect(monthCells(renderLog([reading('1e1 °C')]), 'January')[0]).toBe('NC');
    expect(monthCells(renderLog([reading(''), reading('Infinity °C')]), 'January')[0]).toBe('');
  });

  it('excludes other units, types, pending readings, invalid values and other years', () => {
    const html = renderLog([
      reading('4 °C', { fields: { 'Workstation / unit': 'Bar 1', 'Measured temperature': '4 °C' } }),
      reading('4 °C', { type: LogType.RECEIVING }),
      reading('4 °C', { status: LogStatus.PENDING }),
      reading('unknown'),
      reading('4 °C', { createdAt: '2025-01-01T12:00:00Z' }),
    ]);
    expect(monthCells(html, 'January')[0]).toBe('');
  });

  it('uses the measurement date before the occurrence and creation dates', () => {
    const html = renderLog([reading('3 °C', {
      measuredAt: '2026-02-02T12:00:00Z',
      occurredAt: '2026-03-03T12:00:00Z',
    })]);
    expect(monthCells(html, 'January')[0]).toBe('');
    expect(monthCells(html, 'February')[1]).toBe('C');
    expect(monthCells(html, 'March')[2]).toBe('');
  });
});
