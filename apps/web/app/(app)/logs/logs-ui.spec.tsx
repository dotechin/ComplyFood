import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';
import LogsPage from './page';
import { TemperatureSheet } from './temperature-sheet';
import { TEMPERATURE_UNITS } from './temperature-log';

jest.mock('../../../lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

const reading: LogEntry = {
  id: 'reading-1',
  orgId: 'org-1',
  locationId: null,
  type: LogType.TEMPERATURE,
  fields: {
    'Workstation / unit': 'Bar fridge 1',
    'Measured temperature': '4 °C',
    'Target (critical limit)': 'Chilled ≤ 4°C',
    'Corrective action / comments': 'Checked seal',
    Reading: '08:00 (AM)',
  },
  status: LogStatus.PENDING,
  submittedBy: null,
  submittedAt: null,
  presetId: null,
  occurredAt: null,
  measuredAt: null,
  recordOrigin: null,
  sourceDocumentId: null,
  sourcePage: null,
  isException: false,
  exceptionReason: null,
  exceptionBy: null,
  exceptionAt: null,
  createdAt: '2026-02-03T12:00:00.000Z',
};

function renderSheet(logs: LogEntry[]) {
  return renderToStaticMarkup(<TemperatureSheet logs={logs} onConfirm={jest.fn()} onCancel={jest.fn()} />);
}

describe('Temperature logs UI', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses short English labels and retains all critical-limit defaults', () => {
    const html = renderToStaticMarkup(<LogsPage />);
    expect(html).toContain('Daily Logs');
    expect(html).toContain('Temperature Log · CCP 2/3');
    expect(html).toContain('>Unit</label>');
    expect(html).toContain('>Critical limit</label>');
    expect(html).toContain('>Temperature<span');
    expect(html).toContain('Save reading');
    expect(html).toContain('<option value="Chilled ≤ 4°C" selected="">Chilled ≤ 4°C</option>');
    expect(html).toContain('<option value="Frozen ≤ -18°C">Frozen ≤ -18°C</option>');
    expect(html).toContain('<option value="Hot holding ≥ 63°C">Hot holding ≥ 63°C</option>');
    expect(html).toContain('<option value="Cooking core ≥ 75°C for 30s">Cooking ≥ 75°C for 30s</option>');
    expect(html).not.toMatch(/Phone camera|Coming soon|European standard package/);
  });

  it('groups readings into English monthly tables with chronological days', () => {
    const logs = [
      { ...reading, id: 'later', createdAt: '2026-02-28T12:00:00.000Z' },
      { ...reading, id: 'previous', createdAt: '2026-01-31T12:00:00.000Z' },
      reading,
    ];
    const html = renderSheet(logs);
    expect(html.match(/<table /g)).toHaveLength(2);
    expect(html.indexOf('February 2026')).toBeLessThan(html.indexOf('January 2026'));
    expect(html.indexOf('>3</td>')).toBeLessThan(html.indexOf('>28</td>'));
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('overflow-x-auto');
    expect(logs[0].id).toBe('later');
  });

  it('keeps readings, notes, times, and pending actions without inventing compliance', () => {
    const html = renderSheet([reading]);
    expect(html).toContain('Bar fridge 1');
    expect(html).toContain('4 °C');
    expect(html).toContain('Chilled ≤ 4°C');
    expect(html).toContain('Checked seal');
    expect(html).toContain('08:00 (AM)');
    expect(html).toContain('<details>');
    expect(html).toContain('Confirm</button>');
    expect(html).toContain('Cancel</button>');
    expect(html).toContain('Status tracks review, not temperature compliance.');
    expect(html).not.toMatch(/>C<|>NC</);
  });

  it('preserves exceptions and custom fields while hiding pending actions for reviewed entries', () => {
    const html = renderSheet([{
      ...reading,
      status: LogStatus.OVERRIDDEN,
      isException: true,
      exceptionReason: 'Late reading',
      occurredAt: '2026-02-03T10:00:00.000Z',
      measuredAt: '2026-02-03T10:05:00.000Z',
      fields: { ...reading.fields, Notes: '<script>alert("test")</script>', Checked: true },
    }]);
    expect(html).toContain('overridden');
    expect(html).toContain('Exception');
    expect(html).toContain('Late reading');
    expect(html).toContain('Occurred');
    expect(html).toContain('Measured');
    expect(html).toContain('Yes');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toMatch(/Confirm<\/button>|Cancel<\/button>/);
    expect(renderSheet([{ ...reading, status: LogStatus.CONFIRMED }])).not.toContain('Confirm</button>');
  });

  it('supports generated and older temperature field names, including zero readings', () => {
    const html = renderSheet([{ ...reading, fields: { item: 'Freezer 1', value: '-18°C', haccpRange: '-25°C – -18°C' } }]);
    expect(html).toContain('Freezer 1');
    expect(html).toContain('-18°C');
    expect(html).toContain('-25°C – -18°C');
    expect(renderSheet([{ ...reading, fields: { item: 'Fridge 2', temperature: 0 } }])).toMatch(/tabular-nums">0<\/td>/);
  });

  it('handles missing fields and empty filtered results', () => {
    expect(renderSheet([{ ...reading, fields: {} }])).toContain('—');
    const html = renderSheet([]);
    expect(html).toContain('No temperature readings match the filters.');
    expect(html).not.toContain('<table');
  });

  it('saves short-labeled inputs using the unchanged stored field names and values', async () => {
    jest.spyOn(React, 'useState').mockImplementation((initial?: unknown) => {
      let value = typeof initial === 'function' ? initial() : initial;
      if (value && typeof value === 'object' && 'unit' in value) {
        value = { unit: TEMPERATURE_UNITS[0].value, target: 'Chilled ≤ 4°C', temperature: '0', corrective: 'Checked seal' };
      }
      return [value, jest.fn()];
    });
    jest.spyOn(React, 'useMemo').mockImplementation((factory) => factory());
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    (apiGet as jest.Mock).mockResolvedValue([]);
    (apiPost as jest.Mock).mockResolvedValue(reading);

    const page = LogsPage();
    const form = (page.props.children as React.ReactElement[]).find((child) => child?.type === 'form')!;
    const preventDefault = jest.fn();
    await form.props.onSubmit({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(apiPost).toHaveBeenCalledWith('/logs', {
      type: LogType.TEMPERATURE,
      fields: {
        Reading: expect.any(String),
        'Workstation / unit': TEMPERATURE_UNITS[0].value,
        'Target (critical limit)': 'Chilled ≤ 4°C',
        'Measured temperature': '0 °C',
        'Corrective action / comments': 'Checked seal',
      },
    });
  });
});
