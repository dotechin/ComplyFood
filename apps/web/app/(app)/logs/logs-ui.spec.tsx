import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';
import ChecklistsPage from '../checklists/page';
import { HaccpPackage } from '../compliance/haccp-package';
import AppLayout from '../layout';
import LogsPage from './page';
import { logTypeFromSearch } from './log-type-from-search';
import { CLEANING_SCHEDULE, CleaningSchedule, weekStartOf } from './cleaning-schedule';
import { IncidentLog } from './incident-log';
import { TEMPERATURE_UNITS, TemperatureLog } from './temperature-log';

jest.mock('../../../lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

jest.mock('../sidebar-nav', () => ({ SidebarNav: () => <aside>Sidebar</aside> }));
jest.mock('../logout-button', () => ({ LogoutButton: () => <button>Logout</button> }));

const base: LogEntry = {
  id: 'log-1',
  orgId: 'org-1',
  locationId: null,
  type: LogType.CLEANING,
  fields: {},
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
  createdAt: '2026-10-06T12:00:00.000Z',
};

function renderPageAs(type: LogType) {
  jest.spyOn(React, 'useState').mockImplementation((initial?: unknown) => [
    initial === LogType.TEMPERATURE ? type : typeof initial === 'function' ? initial() : initial,
    jest.fn(),
  ]);
  jest.spyOn(React, 'useMemo').mockImplementation((factory) => factory());
  jest.spyOn(React, 'useEffect').mockImplementation(() => {});
  return renderToStaticMarkup(<LogsPage />);
}

describe('Daily Logs UI', () => {
  afterEach(() => jest.restoreAllMocks());

  it('prints the checklist with full weekday names available to assistive technology', () => {
    const html = renderToStaticMarkup(<ChecklistsPage />);
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      expect(html).toContain(`<abbr title="${day}">`);
    }
    expect(html).toContain('print:hidden');
    expect(html).toContain('print:overflow-visible');
  });

  it('removes the application shell and restores overflow when printing', () => {
    const html = renderToStaticMarkup(<AppLayout><p>Checklist content</p></AppLayout>);
    expect(html).toContain('<div class="print:hidden"><aside>Sidebar</aside></div>');
    expect(html).toContain('print:block print:h-auto print:overflow-visible');
    expect(html).toContain('print:max-w-none');
    expect(html).toContain('print:overflow-visible print:px-0 print:py-0');
  });

  it('links each HACCP package record to its matching log category', () => {
    const html = renderToStaticMarkup(<HaccpPackage />);
    for (const type of ['receiving', 'temperature', 'cleaning', 'incident']) {
      expect(html).toContain(`href="/logs?type=${type}"`);
    }
  });

  it('resolves valid log category query parameters and ignores unknown values', () => {
    expect(logTypeFromSearch('?type=receiving')).toBe(LogType.RECEIVING);
    expect(logTypeFromSearch('?type=incident')).toBe(LogType.INCIDENT);
    expect(logTypeFromSearch('?type=unknown')).toBeNull();
  });

  it('shows one Temperature Log sheet with a log selector and no historical import or entry-mode choices', () => {
    const html = renderToStaticMarkup(<LogsPage />);
    expect(html).toContain('Daily Logs');
    expect(html).toContain('>Temperature Log</h2>');
    expect(html).not.toContain('CCP 2/3');
    expect(html.match(/aria-label="Temperature log"/g)).toHaveLength(1);
    for (const unit of TEMPERATURE_UNITS) expect(html).toContain(`>${unit.label}</option>`);
    expect(html).toContain('aria-label="Add temperature unit"');
    expect(html).toContain('aria-label="Unit type"');
    expect(html).toContain('aria-label="Delete Bar counter 1"');
    expect(html).toContain('aria-label="Save reading"');
    expect(html).not.toMatch(/Import verified historical|Phone camera|Coming soon|Manual entry/);
  });

  it('renders the selected temperature log as a blank sheet', () => {
    const html = renderToStaticMarkup(
      <TemperatureLog
        units={[...TEMPERATURE_UNITS]}
        unit={TEMPERATURE_UNITS[3].value}
        year={2025}
        onUnitsChange={jest.fn()}
        onUnitChange={jest.fn()}
        onYearChange={jest.fn()}
      />,
    );
    expect(html).toContain(`<option value="${TEMPERATURE_UNITS[3].value}" selected="">`);
    expect(html).toContain('Temperature Log — Kitchen chest freezer 4, 2025 (blank sheet)');
    expect(html).not.toContain('<table');
  });

  it('supports fridge and freezer unit categories and protects the final unit from deletion', () => {
    const html = renderToStaticMarkup(
      <TemperatureLog
        units={[TEMPERATURE_UNITS[0]]}
        unit={TEMPERATURE_UNITS[0].value}
        year={2025}
        onUnitsChange={jest.fn()}
        onUnitChange={jest.fn()}
        onYearChange={jest.fn()}
      />,
    );
    expect(TEMPERATURE_UNITS[0].category).toBe('fridge');
    expect(TEMPERATURE_UNITS[3].category).toBe('freezer');
    expect(html).toContain('<option value="fridge" selected="">Fridge</option>');
    expect(html).toContain('<option value="freezer">Freezer</option>');
    expect(html).toContain('aria-label="Delete Bar counter 1"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Delete Bar counter 1"/);
  });

  it('renders the Cleaning & Disinfection Schedule with the legend, columns and areas', () => {
    const html = renderPageAs(LogType.CLEANING);
    expect(html).toContain('Cleaning &amp; Disinfection Schedule');
    expect(html).not.toContain('Sheet 3');
    expect(html).toContain('D = Daily, W = Weekly, M = Monthly, TW = Twice Weekly');
    for (const heading of ['Area / Item', 'Freq.', 'Cleaning Method &amp; Chemicals Used', 'Responsibility']) {
      expect(html).toContain(heading);
    }
    for (const row of CLEANING_SCHEDULE) expect(html).toContain(row.responsibility);
    expect(html).not.toMatch(/Import verified historical|Weekly check|Phone camera/);
  });

  it('marks completed days, allows undo only while pending and disables future days', () => {
    const weekStart = weekStartOf(new Date(2026, 9, 7));
    const html = renderToStaticMarkup(
      <CleaningSchedule
        logs={[
          { ...base, fields: { 'Area / Item': 'Ice Machine (Bar)', 'Cleaning date': '2026-10-05' } },
          { ...base, id: 'log-2', status: LogStatus.CONFIRMED, fields: { 'Area / Item': 'Barista', 'Cleaning date': '2026-10-06' } },
          { ...base, id: 'log-3', status: LogStatus.CONFIRMED, fields: { 'Area / Item': 'Handwash Stations & Soap Dispensers', 'Cleaning date': '2026-10-06' } },
        ]}
        weekStart={weekStart}
        today="2026-10-07"
        busyKey={null}
        onWeekChange={jest.fn()}
        onTick={jest.fn()}
        onUndo={jest.fn()}
      />,
    );
    expect(html).toContain('Ice Machine (Bar) — Monday 2026-10-05: done (pending review, click to undo)');
    expect(html).toContain('Handwash Stations &amp; Soap Dispensers — Tuesday 2026-10-06: done"');
    expect(html.match(/✓/g)).toHaveLength(2);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Ice Machine \(Bar\) — Thursday 2026-10-08: mark as done"/);
  });

  it('records a cleaning tick through the schedule API format', async () => {
    (apiGet as jest.Mock).mockResolvedValue([]);
    (apiPost as jest.Mock).mockResolvedValue(base);
    jest.spyOn(React, 'useState').mockImplementation((initial?: unknown) => [
      initial === LogType.TEMPERATURE ? LogType.CLEANING : typeof initial === 'function' ? initial() : initial,
      jest.fn(),
    ]);
    jest.spyOn(React, 'useMemo').mockImplementation((factory) => factory());
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});

    const page = LogsPage();
    const schedule = (page.props.children as React.ReactElement[]).find((child) => child?.type === CleaningSchedule)!;
    schedule.props.onTick('Ice Machine (Bar)', '2026-10-05');
    await new Promise((resolve) => setImmediate(resolve));

    expect(apiPost).toHaveBeenCalledWith('/logs', {
      type: LogType.CLEANING,
      fields: { 'Area / Item': 'Ice Machine (Bar)', 'Cleaning date': '2026-10-05' },
    });
  });

  it('renders the Corrective Action & Deviation Log sheet with an inline entry row', () => {
    const html = renderToStaticMarkup(
      <IncidentLog
        logs={[{
          ...base,
          type: LogType.INCIDENT,
          fields: {
            'Description of deviation / problem': 'Walk-in fridge at 9°C',
            'Immediate correction taken': 'Moved stock',
            'Product disposition': 'Retained',
            'Preventative action to avoid repeat': '<script>x</script>',
          },
        }, {
          ...base,
          id: 'confirmed-incident',
          type: LogType.INCIDENT,
          status: LogStatus.CONFIRMED,
        }]}
        saving={false}
        onCreate={jest.fn()}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    for (const column of ['Date / Time', 'Deviation / Problem Detected', 'Immediate Correction Taken', 'Product Disposition', 'Preventative Action', 'Status']) {
      expect(html).toContain(column);
    }
    expect(html).toContain('confirmed');
    expect(html).toContain('Walk-in fridge at 9°C');
    expect(html).toContain('aria-label="Add entry"');
    expect(html).toContain('aria-label="Confirm"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('saves a temperature reading for the selected log with unchanged stored field names', async () => {
    jest.spyOn(React, 'useState').mockImplementation((initial?: unknown) => {
      let value = typeof initial === 'function' ? initial() : initial;
      if (value && typeof value === 'object' && 'temperature' in value) {
        value = { target: 'Chilled ≤ 4°C', temperature: '0', corrective: 'Checked seal' };
      }
      return [value, jest.fn()];
    });
    jest.spyOn(React, 'useMemo').mockImplementation((factory) => factory());
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    (apiGet as jest.Mock).mockResolvedValue([]);
    (apiPost as jest.Mock).mockResolvedValue(base);

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
