import { useEffect, useState } from 'react';
import { LogType, type LogEntry } from '@complyfood/shared';
import { apiGet } from '../../../lib/api';

export type TemperatureUnitCategory = 'fridge' | 'freezer';
export type TemperatureUnit = { value: string; label: string; category: TemperatureUnitCategory };

export const TEMPERATURE_UNITS: TemperatureUnit[] = [
  { value: 'Banco Refrigerato Bar (n.1)', label: 'Bar counter 1', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.2)', label: 'Bar counter 2', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.3)', label: 'Bar counter 3', category: 'fridge' },
  { value: 'Pozzetto Freezer Cucina (n.4)', label: 'Kitchen chest freezer 4', category: 'freezer' },
  { value: 'Kitchen Fridge 5', label: 'Kitchen Fridge 5', category: 'fridge' },
];

export { WEEKDAYS } from './opening-days';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SELECT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';

type DailyReading = { temp: string; time: string; status: string };

function isOutOfRange(value: string, category: TemperatureUnitCategory) {
  const temperature = Number(value);
  return value.trim() !== '' && Number.isFinite(temperature)
    && (category === 'freezer' ? temperature > -18 : temperature > 4);
}

function entryDate(entry: LogEntry) {
  const date = entry.measuredAt
    ?? entry.fields?.['Browser reading time']
    ?? entry.occurredAt
    ?? entry.submittedAt
    ?? entry.createdAt
    ?? entry.fields?.scheduledDate;
  return typeof date === 'string' ? date.slice(0, 10) : '';
}

function readingTime(entry: LogEntry) {
  const browserTime = entry.fields?.['Browser reading time'];
  if (typeof browserTime === 'string' && browserTime) {
    const date = new Date(browserTime);
    if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const raw = entry.fields?.Reading;
  if (typeof raw === 'string' && raw) return raw;
  const timestamp = entry.measuredAt ?? entry.submittedAt ?? entry.createdAt;
  return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
}

export function TemperatureLog({
  units,
  unit,
  year,
  openingDays,
  onUnitChange,
  onYearChange,
}: {
  units: TemperatureUnit[];
  unit: string;
  year: number;
  openingDays: number[];
  onUnitChange: (unit: string) => void;
  onYearChange: (year: number) => void;
}) {
  const sortedUnits = [...units].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  const selected = units.find((option) => option.value === unit) ?? units[0] ?? TEMPERATURE_UNITS[0];
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [entries, setEntries] = useState<Record<number, DailyReading>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [today, setToday] = useState('');
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const target = selected.category === 'freezer' ? '≤ -18°C' : '≤ 4°C';
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const weekday = new Date(year, month, day).getDay();
    return { day, weekday, isOpen: openingDays.includes(weekday) };
  });

  useEffect(() => {
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    let active = true;
    const from = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10);
    setLoading(true);
    setError('');
    apiGet<LogEntry[]>(`/logs?type=${LogType.TEMPERATURE}&dateFrom=${from}&dateTo=${to}`)
      .then((logs) => {
        if (!active) return;
        const readings: Record<number, DailyReading> = {};
        for (const entry of logs) {
          if (entry.fields?.['Workstation / unit'] !== selected.value) continue;
          const date = entryDate(entry);
          if (!date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`)) continue;
          const day = Number(date.slice(8, 10));
          const raw = entry.fields?.temperature ?? entry.fields?.['Measured temperature'];
          const temperature = typeof raw === 'number' ? String(raw) : String(raw ?? '').match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? '';
          if (!temperature) continue;
          readings[day] = {
            temp: temperature,
            time: readingTime(entry),
            status: entry.status,
          };
        }
        setEntries(readings);
      })
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selected.value, year, month, daysInMonth]);

  return (
    <section aria-labelledby="temperature-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="temperature-heading" className="text-xl font-bold text-foreground">Temperature Log</h2>
        <div className="flex items-center gap-2">
          <select aria-label="Temperature log" value={selected.value} onChange={(event) => onUnitChange(event.target.value)} className={SELECT_CLASSES}>
            {sortedUnits.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select aria-label="Year" value={year} onChange={(event) => onYearChange(Number(event.target.value))} className={SELECT_CLASSES}>
            {Array.from({ length: currentYear - 2019 }, (_, index) => currentYear - index).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Server-stored readings across your organization. Enter and confirm actual readings in Daily Checks. Browser-local readings remain available for administrator review in Supermode.
      </p>
      <p className="text-xs text-muted-foreground">Opening days: {WEEKDAY_SHORT.filter((_, day) => openingDays.includes(day)).join(', ') || 'none configured'}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading server readings…</p>}
      <div role="group" aria-label={`Temperature Log — ${selected.label}, ${year}`} className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm">
          <span className="font-semibold text-foreground">Daily Temperature Monitoring Log — {selected.label}</span>
          <select aria-label="Month" value={month} onChange={(event) => setMonth(Number(event.target.value))} className={SELECT_CLASSES}>
            {MONTHS.map((name, index) => <option key={name} value={index}>{name} {year}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th scope="col" className="w-24 border border-primary-foreground/20 px-2 py-2">Weekday</th>
                <th scope="col" className="w-32 border border-primary-foreground/20 px-2 py-2">Date</th>
                <th scope="col" className="border border-primary-foreground/20 px-2 py-2">Time</th>
                <th scope="col" className="border border-primary-foreground/20 px-2 py-2">Temperature<br /><span className="font-normal">(Target {target})</span></th>
              </tr>
            </thead>
            <tbody>
              {monthDates.map(({ day, weekday, isOpen }, index) => {
                const reading = entries[day];
                const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const current = date === today;
                const rowClass = !isOpen ? 'bg-muted text-muted-foreground' : current ? 'bg-accent text-accent-foreground' : index % 2 ? 'bg-accent/30 text-foreground' : 'bg-card text-foreground';
                return (
                  <tr key={day} aria-current={current ? 'date' : undefined} aria-disabled={!isOpen || undefined} className={rowClass}>
                    <td className="border border-border px-2 py-2">{WEEKDAY_SHORT[weekday]}</td>
                    <th scope="row" className="border border-border px-2 py-2 text-left tabular-nums font-normal">{`${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`}</th>
                    <td className="border border-border px-2 py-2 tabular-nums">{isOpen ? reading?.time ?? '' : <span className="text-xs uppercase tracking-wide">Closed</span>}</td>
                    <td className={`border border-border px-2 py-2 tabular-nums ${reading && isOutOfRange(reading.temp, selected.category) ? 'font-semibold text-danger' : ''}`}>
                      {isOpen && reading ? <>{reading.temp}°C{reading.status !== 'confirmed' && <span className="ml-2 text-xs text-warning">Pending confirmation</span>}</> : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
