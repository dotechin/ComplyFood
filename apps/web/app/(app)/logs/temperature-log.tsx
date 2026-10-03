import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';

export const KITCHEN_FRIDGE_5 = 'Kitchen Fridge 5';
export const KITCHEN_FRIDGE_5_TITLE = `Temperature Log — ${KITCHEN_FRIDGE_5}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export function TemperatureLog({
  logs,
  year,
  loading,
  onRecord,
}: {
  logs: LogEntry[];
  year: number;
  loading: boolean;
  onRecord: () => void;
}) {
  const readings = new Map<string, 'C' | 'NC'>();
  for (const log of logs) {
    if (
      log.type !== LogType.TEMPERATURE ||
      log.status !== LogStatus.CONFIRMED ||
      log.fields['Workstation / unit'] !== KITCHEN_FRIDGE_5
    ) continue;
    const date = new Date(log.measuredAt ?? log.occurredAt ?? log.createdAt);
    const raw = String(log.fields['Measured temperature'] ?? '').replace(/\s*°C$/, '').trim();
    const temperature = Number(raw);
    if (date.getFullYear() !== year || !raw || !Number.isFinite(temperature)) continue;
    const key = `${date.getMonth()}-${date.getDate()}`;
    const status = temperature <= 4 ? 'C' : 'NC';
    readings.set(key, readings.get(key) === 'NC' ? 'NC' : status);
  }

  return (
    <section aria-labelledby="kitchen-fridge-5-title" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="kitchen-fridge-5-title" className="text-lg font-semibold text-foreground">{KITCHEN_FRIDGE_5_TITLE}</h2>
          <p className="text-sm text-muted-foreground">Year: {year}</p>
        </div>
        <button type="button" onClick={onRecord} className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-accent">
          Record reading
        </button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs" aria-label={KITCHEN_FRIDGE_5_TITLE}>
            <thead>
              <tr>
                <th scope="col" className="border border-border px-2 py-1 text-left">Month</th>
                {DAYS.map((day) => <th key={day} scope="col" className="border border-border px-2 py-1">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month, index) => (
                <tr key={month}>
                  <th scope="row" className="border border-border px-2 py-1 text-left font-medium">{month}</th>
                  {DAYS.map((day) => (
                    <td key={day} className="border border-border px-2 py-1">
                      {day > new Date(year, index + 1, 0).getDate() ? '—' : readings.get(`${index}-${day}`) ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        C = Compliant (≤ 4°C) · NC = Non-compliant (&gt; 4°C). Confirmed readings only; selected filters apply.
      </p>
    </section>
  );
}
