import { useEffect, useState } from 'react';
import { ActionButton, CheckIcon, CloseIcon, PlusIcon, TrashIcon } from '../../../components/icon-button';

export type TemperatureUnitCategory = 'fridge' | 'freezer';
export type TemperatureUnit = { value: string; label: string; category: TemperatureUnitCategory };

export const TEMPERATURE_UNITS: TemperatureUnit[] = [
  { value: 'Banco Refrigerato Bar (n.1)', label: 'Bar counter 1', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.2)', label: 'Bar counter 2', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.3)', label: 'Bar counter 3', category: 'fridge' },
  { value: 'Pozzetto Freezer Cucina (n.4)', label: 'Kitchen chest freezer 4', category: 'freezer' },
];

const SELECT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';
const INPUT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Monday-first week, values match Date#getDay().
export const WEEKDAYS = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 0, short: 'Sun', long: 'Sunday' },
] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const ENTRIES_STORAGE_PREFIX = 'complyfood-temperature-daily';
const OPENING_DAYS_STORAGE_KEY = 'complyfood-opening-days';

type DailyReading = { temp: string; time: string };

function readOpeningDays(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const days = ALL_DAYS.filter((day) => parsed.includes(day));
    return days.length ? days : null;
  } catch {
    return null;
  }
}

function readEntries(raw: string | null): Record<string, DailyReading> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries: Record<string, DailyReading> = {};
    for (const [day, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object' && typeof value.temp === 'string' && typeof value.time === 'string') {
        entries[day] = { temp: value.temp, time: value.time };
      }
    }
    return entries;
  } catch {
    return {};
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isOutOfRange(value: string, category: TemperatureUnitCategory) {
  const n = Number(value);
  if (value.trim() === '' || Number.isNaN(n)) return false;
  return category === 'freezer' ? n > -18 : n > 4;
}

export function TemperatureLog({
  units,
  unit,
  year,
  onUnitsChange,
  onUnitChange,
  onYearChange,
}: {
  units: TemperatureUnit[];
  unit: string;
  year: number;
  onUnitsChange: (units: TemperatureUnit[]) => void;
  onUnitChange: (unit: string) => void;
  onYearChange: (year: number) => void;
}) {
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCategory, setNewUnitCategory] = useState<TemperatureUnitCategory>('fridge');
  const [unitError, setUnitError] = useState('');
  const selected = units.find((option) => option.value === unit) ?? units[0] ?? TEMPERATURE_UNITS[0];
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [entries, setEntries] = useState<Record<string, DailyReading>>({});
  const [loadedKey, setLoadedKey] = useState('');
  const [editing, setEditing] = useState<{ day: number; draft: string } | null>(null);
  const [openingDays, setOpeningDays] = useState<number[]>(ALL_DAYS);
  const [openingDaysLoaded, setOpeningDaysLoaded] = useState(false);
  // Resolved after mount so the server render and the browser agree on "today".
  const [today, setToday] = useState<{ year: number; month: number; day: number } | null>(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const target = selected.category === 'freezer' ? '≤ -18°C' : '≤ 4°C';
  const storageKey = `${ENTRIES_STORAGE_PREFIX}:${selected.value}:${year}-${month + 1}`;
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
    const weekday = new Date(year, month, day).getDay();
    return { day, weekday, isOpen: openingDays.includes(weekday) };
  });
  const isToday = (day: number) => today?.year === year && today.month === month && today.day === day;

  useEffect(() => {
    const now = new Date();
    setToday({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });
    try {
      const stored = readOpeningDays(window.localStorage.getItem(OPENING_DAYS_STORAGE_KEY));
      if (stored) setOpeningDays(stored);
    } catch {
      // Keep every day open when storage is unavailable.
    }
    setOpeningDaysLoaded(true);
  }, []);

  useEffect(() => {
    if (!openingDaysLoaded) return;
    try {
      window.localStorage.setItem(OPENING_DAYS_STORAGE_KEY, JSON.stringify(openingDays));
    } catch {
      // storage unavailable
    }
  }, [openingDays, openingDaysLoaded]);

  useEffect(() => {
    setEditing(null);
    try {
      setEntries(readEntries(window.localStorage.getItem(storageKey)));
    } catch {
      setEntries({});
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // storage unavailable
    }
  }, [entries, loadedKey, storageKey]);

  const toggleOpeningDay = (day: number) =>
    setOpeningDays((prev) => {
      if (prev.includes(day)) return prev.length > 1 ? prev.filter((value) => value !== day) : prev;
      return ALL_DAYS.filter((value) => value === day || prev.includes(value));
    });

  const commit = () => {
    if (!editing) return;
    const { day } = editing;
    const temp = editing.draft.trim();
    setEntries((prev) => {
      const next = { ...prev };
      if (!temp) delete next[day];
      else if (prev[day]?.temp !== temp) next[day] = { temp, time: formatTime(new Date()) };
      return next;
    });
    setEditing(null);
  };

  const addUnit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newUnitName.trim();
    if (!name) {
      setUnitError('Enter a unit name.');
      return;
    }
    const normalizedName = name.toLocaleLowerCase();
    if (units.some((option) => [option.label, option.value].some((existing) => existing.toLocaleLowerCase() === normalizedName))) {
      setUnitError('A unit with this name already exists.');
      return;
    }
    const next = [...units, { value: name, label: name, category: newUnitCategory }];
    onUnitsChange(next);
    onUnitChange(name);
    setNewUnitName('');
    setUnitError('');
  };

  const deleteUnit = () => {
    if (units.length <= 1) return;
    const next = units.filter((option) => option.value !== selected.value);
    onUnitsChange(next);
    if (selected.value === unit) onUnitChange(next[0].value);
  };

  return (
    <section aria-labelledby="temperature-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="temperature-heading" className="text-xl font-bold text-foreground">Temperature Log</h2>
        <div className="flex items-center gap-2">
          <select aria-label="Temperature log" value={selected.value} onChange={(e) => onUnitChange(e.target.value)} className={SELECT_CLASSES}>
            {units.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ActionButton
            icon={<TrashIcon />}
            label={`Delete ${selected.label}`}
            variant="danger"
            disabled={units.length <= 1}
            onClick={deleteUnit}
          />
          <select aria-label="Year" value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={SELECT_CLASSES}>
            {Array.from({ length: currentYear - 2019 }, (_, index) => currentYear - index).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      <form onSubmit={addUnit} className="flex flex-wrap items-end gap-2" aria-label="Add temperature unit">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Unit name
          <input
            aria-label="Unit name"
            className={INPUT_CLASSES}
            maxLength={80}
            value={newUnitName}
            onChange={(event) => setNewUnitName(event.target.value)}
            placeholder="e.g. Walk-in fridge"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Type
          <select
            aria-label="Unit type"
            className={SELECT_CLASSES}
            value={newUnitCategory}
            onChange={(event) => setNewUnitCategory(event.target.value as TemperatureUnitCategory)}
          >
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
          </select>
        </label>
        <ActionButton type="submit" icon={<PlusIcon />} label="Add unit" variant="primary" />
        {unitError && <p role="alert" className="basis-full text-sm text-danger">{unitError}</p>}
      </form>
      <div
        role="group"
        aria-label={`Temperature Log — ${selected.label}, ${year} (blank sheet)`}
        className="overflow-hidden rounded-md border border-border bg-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm">
          <span className="font-semibold text-foreground">Daily Temperature Monitoring Log — {selected.label}</span>
          <select aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={SELECT_CLASSES}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>{name} {year}</option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-sm">
          <legend className="sr-only">Opening days</legend>
          <span aria-hidden="true" className="font-medium text-foreground">Opening days</span>
          {WEEKDAYS.map(({ day, short, long }) => {
            const open = openingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={open}
                aria-label={long}
                title={open && openingDays.length === 1 ? 'At least one opening day is required' : long}
                onClick={() => toggleOpeningDay(day)}
                className={`h-8 min-w-11 rounded-md border px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
                  open ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {short}
              </button>
            );
          })}
        </fieldset>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th scope="col" className="w-24 border border-primary-foreground/20 px-2 py-2">Weekday</th>
                <th scope="col" className="w-32 border border-primary-foreground/20 px-2 py-2">Date</th>
                <th scope="col" className="border border-primary-foreground/20 px-2 py-2">Time<br /><span className="font-normal">(automatic)</span></th>
                <th scope="col" className="border border-primary-foreground/20 px-2 py-2">Temperature<br /><span className="font-normal">(Target {target})</span></th>
              </tr>
            </thead>
            <tbody>
              {monthDates.map(({ day, weekday, isOpen }, index) => {
                const reading = entries[day];
                const open = isOpen && editing?.day === day;
                const current = isToday(day);
                const out = reading ? isOutOfRange(reading.temp, selected.category) : false;
                const weekdayLabel = WEEKDAY_SHORT[weekday];
                const dateText = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                const dateLabel = `${weekdayLabel} ${dateText}`;
                const rowClass = !isOpen
                  ? 'bg-muted text-muted-foreground'
                  : current
                    ? 'bg-accent text-accent-foreground'
                    : index % 2 === 1
                      ? 'bg-accent/30 text-foreground'
                      : 'bg-card text-foreground';
                return (
                  <tr
                    key={day}
                    aria-current={current ? 'date' : undefined}
                    aria-disabled={isOpen ? undefined : true}
                    className={rowClass}
                  >
                    <td className={`border border-border px-2 py-2 ${current && isOpen ? 'font-semibold' : ''}`}>
                      {weekdayLabel}
                    </td>
                    <th scope="row" className={`border border-border px-2 py-2 text-left tabular-nums ${current && isOpen ? 'font-semibold' : 'font-normal'}`}>
                      {dateText}
                    </th>
                    <td className="border border-border px-2 py-2 tabular-nums">
                      {isOpen ? reading?.time ?? '' : <span className="text-xs uppercase tracking-wide">Closed</span>}
                    </td>
                    <td className="relative border border-border p-0">
                      <button
                        type="button"
                        aria-label={`Temperature ${dateLabel}${isOpen ? '' : ' (closed)'}`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        disabled={!isOpen || !current}
                        title={!isOpen ? 'Closed day — no reading required' : current ? undefined : 'Readings can only be registered on the current day'}
                        onClick={() => setEditing({ day, draft: reading?.temp ?? '' })}
                        className={`block h-10 w-full px-2 text-left tabular-nums enabled:hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed ${out && isOpen ? 'font-semibold text-danger' : ''}`}
                      >
                        {isOpen && reading ? `${reading.temp}°C` : ''}
                      </button>
                      {open && (
                        <form
                          role="dialog"
                          aria-label={`Edit temperature ${dateLabel}`}
                          onSubmit={(event) => { event.preventDefault(); commit(); }}
                          onKeyDown={(event) => { if (event.key === 'Escape') setEditing(null); }}
                          className="absolute right-0 top-full z-20 mt-1 flex w-56 items-center gap-1 rounded-md border bg-card p-2 shadow-lg"
                        >
                          <input
                            autoFocus
                            aria-label="Temperature (°C)"
                            type="number"
                            step="0.1"
                            value={editing.draft}
                            onChange={(event) => setEditing({ day, draft: event.target.value })}
                            className={`${INPUT_CLASSES} min-w-0 flex-1`}
                          />
                          <ActionButton type="submit" icon={<CheckIcon />} label="Save" variant="primary" />
                          <ActionButton icon={<CloseIcon />} label="Cancel" onClick={() => setEditing(null)} />
                        </form>
                      )}
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
