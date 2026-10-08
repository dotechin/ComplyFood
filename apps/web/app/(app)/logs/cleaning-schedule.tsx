import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { ActionButton, ChevronLeftIcon, ChevronRightIcon } from '../../../components/icon-button';

export const CLEANING_AREA_FIELD = 'Area / Item';
export const CLEANING_DATE_FIELD = 'Cleaning date';

export const CLEANING_SCHEDULE = [
  {
    area: 'Espresso Steam Wands / Bar Counters',
    frequency: 'D',
    method: 'Purge steam wand after every use. Wipe with food-safe sanitizer (EN 1276).',
    responsibility: 'Barista',
  },
  {
    area: 'Pastry Work Surfaces & Mixers',
    frequency: 'D / Shift',
    method: 'Scrape residues, wash with hot detergent, rinse, apply surface disinfectant.',
    responsibility: 'Pastry Chef',
  },
  {
    area: 'Cooking Line Equipment (Grills, Ovens)',
    frequency: 'D',
    method: 'Degrease surfaces using heavy-duty cleaner, rinse with clean water.',
    responsibility: 'Kitchen Porter',
  },
  {
    area: 'Refrigerators & Walk-in Floors',
    frequency: 'W',
    method: 'Empty unit, wipe interior shelves with sanitizing solution. Mop floors.',
    responsibility: 'Kitchen Staff',
  },
  {
    area: 'Ice Machine (Bar)',
    frequency: 'M',
    method: 'Empty completely, descale, treat with anti-microbial sanitizing flush.',
    responsibility: 'Bar Supervisor',
  },
  {
    area: 'Handwash Stations & Soap Dispensers',
    frequency: 'D',
    method: 'Sanitize splashbacks, taps, and handles. Replenish soap and paper towels.',
    responsibility: 'All Staff',
  },
] as const;

const DAY_HEADERS = [
  { short: 'M', name: 'Monday' },
  { short: 'T', name: 'Tuesday' },
  { short: 'W', name: 'Wednesday' },
  { short: 'T', name: 'Thursday' },
  { short: 'F', name: 'Friday' },
  { short: 'S', name: 'Saturday' },
  { short: 'S', name: 'Sunday' },
];

/** Monday (UTC calendar date) of the week containing `date`. */
export function weekStartOf(date: Date) {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Today's local calendar date as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  return isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function CleaningSchedule({
  logs,
  weekStart,
  today,
  busyKey,
  onWeekChange,
  onTick,
  onUndo,
}: {
  logs: LogEntry[];
  weekStart: Date;
  today: string;
  busyKey: string | null;
  onWeekChange: (weekStart: Date) => void;
  onTick: (area: string, date: string) => void;
  onUndo: (entry: LogEntry) => void;
}) {
  const days = DAY_HEADERS.map((_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    return isoDate(day);
  });
  const ticks = new Map<string, LogEntry>();
  for (const log of logs) {
    if (log.type !== LogType.CLEANING || log.status === LogStatus.OVERRIDDEN) continue;
    const area = log.fields?.[CLEANING_AREA_FIELD];
    const date = log.fields?.[CLEANING_DATE_FIELD];
    if (typeof area !== 'string' || typeof date !== 'string') continue;
    const key = `${area}|${date}`;
    const existing = ticks.get(key);
    if (!existing || existing.status !== LogStatus.CONFIRMED) ticks.set(key, log);
  }
  const shiftWeek = (weeks: number) => {
    const next = new Date(weekStart);
    next.setUTCDate(weekStart.getUTCDate() + weeks * 7);
    onWeekChange(next);
  };
  const weekLabel = `${new Date(`${days[0]}T00:00:00.000Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${new Date(`${days[6]}T00:00:00.000Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;

  return (
    <section aria-labelledby="cleaning-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cleaning-heading" className="text-xl font-bold text-foreground">Cleaning &amp; Disinfection Schedule</h2>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">Frequency Legend:</span> D = Daily, W = Weekly, M = Monthly, TW = Twice Weekly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton icon={<ChevronLeftIcon />} label="Previous week" onClick={() => shiftWeek(-1)} />
          <span className="min-w-40 text-center text-sm font-medium text-foreground">{weekLabel}</span>
          <ActionButton
            icon={<ChevronRightIcon />}
            label="Next week"
            disabled={days[6] >= today}
            onClick={() => shiftWeek(1)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" aria-label="Cleaning & Disinfection Schedule">
          <thead className="bg-sidebar text-white">
            <tr>
              <th scope="col" className="border border-border px-3 py-2 text-center font-semibold">Area / Item</th>
              <th scope="col" className="border border-border px-2 py-2 text-center font-semibold">Freq.</th>
              <th scope="col" className="border border-border px-3 py-2 text-center font-semibold">Cleaning Method &amp; Chemicals Used</th>
              <th scope="col" className="border border-border px-3 py-2 text-center font-semibold">Responsibility</th>
              {DAY_HEADERS.map((day, index) => (
                <th key={days[index]} scope="col" className="w-10 border border-border px-1 py-2 text-center font-semibold">
                  <abbr title={`${day.name} ${days[index]}`} className="no-underline">{day.short}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLEANING_SCHEDULE.map((row, rowIndex) => (
              <tr key={row.area} className={rowIndex % 2 ? 'bg-muted/40' : ''}>
                <th scope="row" className="border border-border px-3 py-3 align-top font-semibold text-foreground">{row.area}</th>
                <td className="border border-border px-2 py-3 align-top text-foreground">{row.frequency}</td>
                <td className="border border-border px-3 py-3 align-top text-foreground">{row.method}</td>
                <td className="border border-border px-3 py-3 align-top text-foreground">{row.responsibility}</td>
                {days.map((date, index) => {
                  const entry = ticks.get(`${row.area}|${date}`);
                  const key = `${row.area}|${date}`;
                  const label = `${row.area} — ${DAY_HEADERS[index].name} ${date}`;
                  const locked = entry && entry.status !== LogStatus.PENDING;
                  return (
                    <td key={date} className="border border-border p-0 text-center align-middle">
                      <button
                        type="button"
                        disabled={date > today || busyKey === key || Boolean(locked)}
                        aria-pressed={Boolean(entry)}
                        aria-label={entry ? `${label}: done${locked ? '' : ' (pending review, click to undo)'}` : `${label}: mark as done`}
                        title={entry ? (locked ? 'Done' : 'Done — pending review. Click to undo.') : 'Mark as done'}
                        onClick={() => (entry ? onUndo(entry) : onTick(row.area, date))}
                        className={`flex h-14 w-full items-center justify-center text-base font-bold transition disabled:cursor-not-allowed ${
                          entry
                            ? locked
                              ? 'text-success'
                              : 'text-success/60 hover:bg-danger/10'
                            : date > today
                              ? 'bg-muted/60'
                              : 'hover:bg-accent'
                        }`}
                      >
                        {entry ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Tick a day once the task is completed. Pending ticks can be undone until they are confirmed.
      </p>
    </section>
  );
}
