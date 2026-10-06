import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';

export const TEMPERATURE_UNITS = [
  { value: 'Banco Refrigerato Bar (n.1)', label: 'Bar counter 1' },
  { value: 'Banco Refrigerato Bar (n.2)', label: 'Bar counter 2' },
  { value: 'Banco Refrigerato Bar (n.3)', label: 'Bar counter 3' },
  { value: 'Pozzetto Freezer Cucina (n.4)', label: 'Kitchen chest freezer 4' },
] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function readingOutcome(log: LogEntry): 'C' | 'NC' | null {
  if (log.fields['Original form outcome'] === 'C' || log.fields['Original form outcome'] === 'NC') {
    return log.fields['Original form outcome'];
  }

  const raw = String(log.fields['Measured temperature'] ?? '').replace(/\s*°C$/, '').trim();
  const temperature = Number(raw);
  if (!raw || !Number.isFinite(temperature)) return null;

  const unit = log.fields['Workstation / unit'];
  const limit = unit === TEMPERATURE_UNITS[3].value ? -18 : 4;
  return temperature <= limit ? 'C' : 'NC';
}

export function TemperatureLog({
  logs,
  year,
  loading,
  onRecord,
}: {
  logs: LogEntry[];
  year: number;
  loading: boolean;
  onRecord: (unit: string) => void;
}) {
  const readings = new Map<string, 'C' | 'NC'>();
  for (const log of logs) {
    if (
      log.type !== LogType.TEMPERATURE ||
      log.status !== LogStatus.CONFIRMED ||
      !TEMPERATURE_UNITS.some((unit) => unit.value === log.fields['Workstation / unit'])
    ) continue;
    const date = new Date(log.measuredAt ?? log.occurredAt ?? log.createdAt);
    const outcome = readingOutcome(log);
    if (date.getUTCFullYear() !== year || !outcome || date.getUTCDay() === 0) continue;
    const key = `${log.fields['Workstation / unit']}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    readings.set(key, readings.get(key) === 'NC' || outcome === 'NC' ? 'NC' : 'C');
  }

  return (
    <section aria-label={`Temperature logs for ${year}`} className="space-y-4">
      {TEMPERATURE_UNITS.map((unit) => (
        <div key={unit.value} className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Temperature Log — {unit.label}</h2>
              <p className="text-sm text-muted-foreground">Year: {year}</p>
            </div>
            <button type="button" onClick={() => onRecord(unit.value)} className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-accent">
              Record reading
            </button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs" aria-label={`Temperature Log — ${unit.label}`}>
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
                      {DAYS.map((day) => {
                        const date = new Date(Date.UTC(year, index, day));
                        const isOff = date.getUTCMonth() !== index || date.getUTCDay() === 0;
                        return (
                          <td key={day} className="border border-border px-2 py-1">
                            {date.getUTCMonth() !== index ? '—' : isOff ? 'Off' : readings.get(`${unit.value}-${index}-${day}`) ?? ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            C = compliant · NC = non-compliant · Off = Sunday (business closed). Only confirmed readings are shown; historical transcriptions retain the original C/NC outcome.
          </p>
        </div>
      ))}
    </section>
  );
}
