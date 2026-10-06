import React from 'react';
import { apiPost } from '../../../lib/api';
import { HistoricalTemperatureImport } from './historical-temperature-import';
import { HistoricalCleaningImport } from './historical-cleaning-import';

jest.mock('../../../lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

function findForm(node: React.ReactNode): React.ReactElement | undefined {
  if (!React.isValidElement(node)) return undefined;
  if (node.type === 'form') return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const form = findForm(child);
    if (form) return form;
  }
  return undefined;
}

function mockImportState(recordsText: string) {
  const values = [[], 'source-pdf', recordsText, false, '', ''];
  jest.spyOn(React, 'useState').mockImplementation(() => [values.shift(), jest.fn()] as any);
  jest.spyOn(React, 'useEffect').mockImplementation(() => {});
}

describe('historical log imports', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('refreshes logs after all temperature batches have finished', async () => {
    const events: string[] = [];
    mockImportState(Array.from({ length: 401 }, () => '2020-11-02 | 1 | 1 | C').join('\n'));
    (apiPost as jest.Mock).mockImplementation(async () => {
      events.push('import');
      return { imported: 1, skippedSundays: 0, duplicates: 0 };
    });
    const onImported = jest.fn(async () => { events.push('refresh'); });
    const form = findForm(HistoricalTemperatureImport({ onImported }))!;

    await form.props.onSubmit({ preventDefault: jest.fn() });

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['import', 'import', 'refresh']);
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('refreshes logs after all cleaning batches have finished', async () => {
    const events: string[] = [];
    const outcomes = Array(11).fill('C').join(',');
    mockImportState(Array.from({ length: 101 }, () => `2020-11 | 2 | 1 | ${outcomes}`).join('\n'));
    (apiPost as jest.Mock).mockImplementation(async () => {
      events.push('import');
      return { imported: 1, duplicates: 0 };
    });
    const onImported = jest.fn(async () => { events.push('refresh'); });
    const form = findForm(HistoricalCleaningImport({ onImported }))!;

    await form.props.onSubmit({ preventDefault: jest.fn() });

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['import', 'import', 'refresh']);
    expect(onImported).toHaveBeenCalledTimes(1);
  });
});
