import { LogStatus, type LogEntry } from '@complyfood/shared';

type TemperatureSheetProps = {
  logs: LogEntry[];
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
};

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function TemperatureSheet({ logs, onConfirm, onCancel }: TemperatureSheetProps) {
  const months = new Map<string, { date: Date; entries: LogEntry[] }>();
  const sourcePeriodDate = (log: LogEntry) => {
    const period = log.recordOrigin === 'historical_transcription' ? log.fields?.['Source month'] : null;
    return typeof period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
      ? new Date(`${period}-01T00:00:00.000Z`)
      : null;
  };
  const occurredDate = (log: LogEntry) => new Date(log.measuredAt ?? log.occurredAt ?? log.createdAt);
  const displayDate = (log: LogEntry) => sourcePeriodDate(log) ?? occurredDate(log);
  for (const log of [...logs].sort((a, b) => displayDate(a).getTime() - displayDate(b).getTime())) {
    const date = displayDate(log);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const month = months.get(key) ?? { date, entries: [] };
    month.entries.push(log);
    months.set(key, month);
  }

  if (logs.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No temperature readings match the filters.</p>;
  }

  return (
    <div className="space-y-4">
      {[...months.entries()].reverse().map(([key, month]) => (
        <div key={key} className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <caption className="p-3 text-left font-semibold text-foreground">
              {month.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </caption>
            <thead className="border-y bg-muted text-foreground">
              <tr>
                {['Date / source period', 'Unit / category', '°C / outcome', 'Critical limit', 'Status', 'Details', 'Actions'].map((heading) => (
                  <th key={heading} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {month.entries.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top tabular-nums">
                    {sourcePeriodDate(log)
                      ? `${log.fields['Source month']} · Week ${log.fields['Source week']}`
                      : occurredDate(log).getUTCDate()}
                  </td>
                  <th scope="row" className="px-3 py-2 align-top font-medium">
                    {valueLabel(log.fields?.['Workstation / unit'] ?? log.fields?.item)}
                  </th>
                  <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums">
                    {valueLabel(log.fields?.['Measured temperature'] ?? log.fields?.value ?? log.fields?.temperature)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">{valueLabel(log.fields?.['Target (critical limit)'] ?? log.fields?.haccpRange)}</td>
                  <td className="px-3 py-2 align-top">
                    {log.status}
                    {log.isException && <span className="block text-warning">Exception</span>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <details>
                      <summary className="cursor-pointer text-muted-foreground">View</summary>
                      <dl className="mt-2 min-w-48 space-y-1">
                        <div>
                          <dt className="font-medium">Recorded</dt>
                          <dd>{new Date(log.createdAt).toLocaleString('en-GB')}</dd>
                        </div>
                        {Object.entries(log.fields ?? {}).map(([name, value]) => (
                          <div key={name}>
                            <dt className="font-medium">{name}</dt>
                            <dd className="whitespace-pre-wrap break-words">{valueLabel(value)}</dd>
                          </div>
                        ))}
                        {log.occurredAt && <div><dt className="font-medium">Occurred</dt><dd>{new Date(log.occurredAt).toLocaleString('en-GB')}</dd></div>}
                        {log.measuredAt && <div><dt className="font-medium">Measured</dt><dd>{new Date(log.measuredAt).toLocaleString('en-GB')}</dd></div>}
                        {log.exceptionReason && <div><dt className="font-medium">Exception reason</dt><dd>{log.exceptionReason}</dd></div>}
                      </dl>
                    </details>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {log.status === LogStatus.PENDING && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onConfirm(log.id)} className="rounded border px-2 py-1 text-primary">Confirm</button>
                        <button type="button" onClick={() => onCancel(log.id)} className="rounded border px-2 py-1 text-muted-foreground hover:text-danger">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Status tracks review, not temperature compliance. Check readings against the critical limit.</p>
    </div>
  );
}
