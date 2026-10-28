import { useEffect, useState } from 'react';

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

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const OPENING_DAYS_STORAGE_KEY = 'complyfood-opening-days';

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

/** Opening days shared by every daily log sheet, persisted in the browser. */
export function useOpeningDays() {
  const [openingDays, setOpeningDays] = useState<number[]>(ALL_DAYS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = readOpeningDays(window.localStorage.getItem(OPENING_DAYS_STORAGE_KEY));
      if (stored) setOpeningDays(stored);
    } catch {
      // Keep every day open when storage is unavailable.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(OPENING_DAYS_STORAGE_KEY, JSON.stringify(openingDays));
    } catch {
      // storage unavailable
    }
  }, [openingDays, loaded]);

  const toggle = (day: number) =>
    setOpeningDays((prev) => {
      if (prev.includes(day)) return prev.length > 1 ? prev.filter((value) => value !== day) : prev;
      return ALL_DAYS.filter((value) => value === day || prev.includes(value));
    });

  return { openingDays, toggle };
}

export function OpeningDaysPicker({ openingDays, onToggle }: { openingDays: number[]; onToggle: (day: number) => void }) {
  return (
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
            onClick={() => onToggle(day)}
            className={`h-8 min-w-11 rounded-md border px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
              open ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {short}
          </button>
        );
      })}
    </fieldset>
  );
}
