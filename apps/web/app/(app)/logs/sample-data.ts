import { LogType, type LogEntry } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';
import { CLEANING_AREA_FIELD, CLEANING_DATE_FIELD, CLEANING_SCHEDULE } from './cleaning-schedule';
import { CHECKLIST_DATE_FIELD, CHECKLIST_ITEM_FIELD, CHECKLIST_SECTIONS } from './hygiene-checklist';
import { INCIDENT_FIELDS } from './incident-log';
import type { TemperatureUnit } from './temperature-log';

const SAMPLE_FIELD = 'Sample data';
/** The API's "generated" reset scope matches `fields.source LIKE 'supermode-%'`. */
const SAMPLE_SOURCE = { source: 'supermode-sample' };
const TEMPERATURE_UNITS_KEY = 'complyfood-temperature-units';
const TEMPERATURE_PREFIX = 'complyfood-temperature-daily';
const OPENING_DAYS_KEY = 'complyfood-opening-days';
const DAYS = 30;

type Reading = { temp: string; time: string };

const pad = (n: number) => String(n).padStart(2, '0');
const between = (min: number, max: number) => min + Math.random() * (max - min);
const chance = (p: number) => Math.random() < p;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function openingDays(): number[] {
  const stored = readJson<unknown>(OPENING_DAYS_KEY, null);
  return Array.isArray(stored) && stored.length ? stored.filter((d): d is number => typeof d === 'number') : [0, 1, 2, 3, 4, 5, 6];
}

// Three years is the safety ceiling. Generation remains batched and limited to opening days.
export const MAX_SAMPLE_DAYS = 1095;

function openDaysBetween(from: Date, to: Date) {
  const open = openingDays();
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const days: Date[] = [];
  for (let d = start; d <= end && days.length < MAX_SAMPLE_DAYS; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (open.includes(d.getDay())) days.push(d);
  }
  return days;
}

/** Default period offered in Supermode: the last 30 days up to today. */
export function defaultSamplePeriod(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS - 1));
  return { from: isoLocal(from), to: isoLocal(now) };
}

const isoLocal = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const labelDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function randomTime() {
  const minutes = Math.round(between(7 * 60 + 30, 10 * 60 + 30));
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export type TemperatureRange = { min: number; max: number };
export type TemperatureRanges = { fridge: TemperatureRange; freezer: TemperatureRange };

/** Legal upper limits: readings above these are logged as incidents. */
export const TEMPERATURE_TARGETS = { fridge: 4, freezer: -18 } as const;

/** Mostly compliant, with an occasional reading just above the target so incidents appear too. */
export const DEFAULT_TEMPERATURE_RANGES: TemperatureRanges = {
  fridge: { min: 1, max: 4.5 },
  freezer: { min: -22, max: -17.5 },
};

function randomTemperature(unit: TemperatureUnit, ranges: TemperatureRanges) {
  const kind = unit.category === 'freezer' ? 'freezer' : 'fridge';
  const { min, max } = ranges[kind];
  const temp = between(min, max).toFixed(1);
  return { temp, outOfRange: Number(temp) > TEMPERATURE_TARGETS[kind] };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await wait(400 * attempt);
    }
  }
}

/** Throttled writes keep a full-year generation from saturating the API or browser. */
async function inBatches<T>(items: T[], size: number, task: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map((item) => withRetry(() => task(item))));
    if (i + size < items.length) await wait(50);
  }
}

/** Fills the opening days between `from` and `to` (inclusive) with temperature readings, cleaning and checklist ticks, and incidents. */
export type SampleDataSelection = {
  temperatures: boolean;
  cleaning: boolean;
  checklist: boolean;
  incidents: boolean;
};

export const ALL_SAMPLE_DATA: SampleDataSelection = {
  temperatures: true,
  cleaning: true,
  checklist: true,
  incidents: true,
};

export async function generateSampleData(
  units: TemperatureUnit[],
  from: Date,
  to: Date,
  ranges: TemperatureRanges = DEFAULT_TEMPERATURE_RANGES,
  selection: SampleDataSelection = ALL_SAMPLE_DATA,
) {
  const days = openDaysBetween(from, to);
  const incidents: Record<string, string>[] = [];
  const temperatureLogs: { type: LogType; fields: Record<string, string | number> }[] = [];
  let readings = 0;

  if (selection.temperatures) for (const unit of units) {
    for (const date of days) {
      const key = `${TEMPERATURE_PREFIX}:${unit.value}:${date.getFullYear()}-${date.getMonth() + 1}`;
      const entries = readJson<Record<string, Reading>>(key, {});
      const day = String(date.getDate());
      if (entries[day]) continue;
      const { temp, outOfRange } = randomTemperature(unit, ranges);
      const time = randomTime();
      temperatureLogs.push({
        type: LogType.TEMPERATURE,
        fields: {
          scheduledDate: isoLocal(date),
          'Workstation / unit': unit.value,
          category: unit.category,
          temperature: Number(temp),
          'Demo time': time,
          [SAMPLE_FIELD]: 'yes',
          ...SAMPLE_SOURCE,
        },
      });
      readings += 1;
      if (selection.incidents && outOfRange) {
        incidents.push({
          scheduledDate: isoLocal(date),
          [INCIDENT_FIELDS.description]: `${unit.label} read ${temp}°C on ${labelDate(date)} at ${time} (target ${unit.category === 'freezer' ? '≤ -18°C' : '≤ 4°C'}).`,
          [INCIDENT_FIELDS.correction]: chance(0.5) ? 'Door seal checked, thermostat adjusted, re-checked after 30 min.' : 'Stock moved to back-up unit, engineer called.',
          [INCIDENT_FIELDS.disposition]: chance(0.7) ? 'Retained' : 'Discarded',
          [INCIDENT_FIELDS.preventative]: 'Added to weekly maintenance check; staff reminded to keep door closed.',
          [SAMPLE_FIELD]: 'yes',
          ...SAMPLE_SOURCE,
        });
      }
    }
  }

  const sheets = [
    ...(selection.cleaning ? [{ type: LogType.CLEANING, row: CLEANING_AREA_FIELD, date: CLEANING_DATE_FIELD, items: CLEANING_SCHEDULE.map((r) => r.area) }] : []),
    ...(selection.checklist ? [{ type: LogType.CHECKLIST, row: CHECKLIST_ITEM_FIELD, date: CHECKLIST_DATE_FIELD, items: CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.check)) }] : []),
  ];
  const ticks: { type: LogType; fields: Record<string, string> }[] = [];
  for (const sheet of sheets) {
    const existing = await apiGet<LogEntry[]>(`/logs?type=${sheet.type}`);
    const done = new Set(existing.map((log) => `${log.fields?.[sheet.row]}|${log.fields?.[sheet.date]}`));
    for (const date of days) {
      const iso = isoLocal(date);
      for (const item of sheet.items) {
        if (done.has(`${item}|${iso}`) || !chance(0.92)) continue;
        ticks.push({ type: sheet.type, fields: { [sheet.row]: item, [sheet.date]: iso, [SAMPLE_FIELD]: 'yes', ...SAMPLE_SOURCE } });
      }
    }
  }

  await inBatches(temperatureLogs, 4, (body) => apiPost<LogEntry>('/logs/demo', body));
  await inBatches(ticks, 4, (body) => apiPost<LogEntry>('/logs/demo', body));
  await inBatches(incidents, 4, (fields) => apiPost<LogEntry>('/logs/demo', { type: LogType.INCIDENT, fields }));

  return { days: days.length, readings, ticks: ticks.length, incidents: incidents.length };
}

type ResetResult = { deleted: number };

/** Removes marked server-side samples. Browser readings need manual review. */
export async function clearSampleData(pin: string) {
  const { deleted } = await apiPost<ResetResult>('/logs/reset', { pin, scope: 'generated' });
  return deleted;
}

/** Deletes explicitly classified server records while preserving browser originals and unreviewed records. */
export async function resetAllData(pin: string) {
  const { deleted } = await apiPost<ResetResult>('/logs/reset', { pin, scope: 'all' });
  return { logs: deleted };
}

/** Temperature units configured on the Daily Logs page, or the defaults. */
export function storedTemperatureUnits(fallback: TemperatureUnit[]): TemperatureUnit[] {
  const stored = readJson<unknown>(TEMPERATURE_UNITS_KEY, null);
  if (!Array.isArray(stored)) return fallback;
  const units = stored.filter(
    (u): u is TemperatureUnit =>
      !!u && typeof u.value === 'string' && typeof u.label === 'string' && (u.category === 'fridge' || u.category === 'freezer'),
  );
  return units.length ? units : fallback;
}
