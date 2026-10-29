import { LogType, type LogEntry } from '@complyfood/shared';
import { apiDelete, apiGet, apiPost } from '../../../lib/api';
import { CLEANING_AREA_FIELD, CLEANING_DATE_FIELD, CLEANING_SCHEDULE } from './cleaning-schedule';
import { CHECKLIST_DATE_FIELD, CHECKLIST_ITEM_FIELD, CHECKLIST_SECTIONS } from './hygiene-checklist';
import { INCIDENT_FIELDS } from './incident-log';
import type { TemperatureUnit } from './temperature-log';

const SAMPLE_FIELD = 'Sample data';
/** The API's "generated" reset scope matches `fields.source LIKE 'supermode-%'`. */
const SAMPLE_SOURCE = { source: 'supermode-sample' };
const TEMPERATURE_UNITS_KEY = 'complyfood-temperature-units';
const SAMPLE_REGISTRY_KEY = 'complyfood-sample-temperature';
const TEMPERATURE_PREFIX = 'complyfood-temperature-daily';
const OPENING_DAYS_KEY = 'complyfood-opening-days';
const DAYS = 30;

type Reading = { temp: string; time: string };
type Registry = Record<string, string[]>;

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

export const MAX_SAMPLE_DAYS = 366;

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

function randomTemperature(unit: TemperatureUnit) {
  const outOfRange = chance(0.05);
  const value =
    unit.category === 'freezer'
      ? outOfRange ? between(-17, -14) : between(-22, -18.5)
      : outOfRange ? between(4.6, 7.5) : between(1, 4);
  return { temp: value.toFixed(1), outOfRange };
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

async function inBatches<T>(items: T[], size: number, task: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map((item) => withRetry(() => task(item))));
  }
}

const isSample = (log: LogEntry) => log.fields?.[SAMPLE_FIELD] === 'yes';

/** Fills the opening days between `from` and `to` (inclusive) with temperature readings, cleaning and checklist ticks, and incidents. */
export async function generateSampleData(units: TemperatureUnit[], from: Date, to: Date) {
  const days = openDaysBetween(from, to);
  const registry = readJson<Registry>(SAMPLE_REGISTRY_KEY, {});
  const incidents: Record<string, string>[] = [];
  let readings = 0;

  for (const unit of units) {
    for (const date of days) {
      const key = `${TEMPERATURE_PREFIX}:${unit.value}:${date.getFullYear()}-${date.getMonth() + 1}`;
      const entries = readJson<Record<string, Reading>>(key, {});
      const day = String(date.getDate());
      if (entries[day]) continue;
      const { temp, outOfRange } = randomTemperature(unit);
      const time = randomTime();
      entries[day] = { temp, time };
      window.localStorage.setItem(key, JSON.stringify(entries));
      registry[key] = [...new Set([...(registry[key] ?? []), day])];
      readings += 1;
      if (outOfRange) {
        incidents.push({
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
  window.localStorage.setItem(SAMPLE_REGISTRY_KEY, JSON.stringify(registry));

  const sheets = [
    { type: LogType.CLEANING, row: CLEANING_AREA_FIELD, date: CLEANING_DATE_FIELD, items: CLEANING_SCHEDULE.map((r) => r.area) },
    { type: LogType.CHECKLIST, row: CHECKLIST_ITEM_FIELD, date: CHECKLIST_DATE_FIELD, items: CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.check)) },
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

  await inBatches(ticks, 4, (body) => apiPost<LogEntry>('/logs', body));
  await inBatches(incidents, 4, (fields) => apiPost<LogEntry>('/logs', { type: LogType.INCIDENT, fields }));

  return { days: days.length, readings, ticks: ticks.length, incidents: incidents.length };
}

type ResetResult = { deleted: number };

/** Removes only what generateSampleData created. The server checks the Supermode PIN first. */
export async function clearSampleData(pin: string) {
  const { deleted } = await apiPost<ResetResult>('/logs/reset', { pin, scope: 'generated' });

  const registry = readJson<Registry>(SAMPLE_REGISTRY_KEY, {});
  for (const [key, days] of Object.entries(registry)) {
    const entries = readJson<Record<string, Reading>>(key, {});
    for (const day of days) delete entries[day];
    window.localStorage.setItem(key, JSON.stringify(entries));
  }
  window.localStorage.removeItem(SAMPLE_REGISTRY_KEY);

  // Entries generated before the server-side `source` marker existed.
  const legacy = (
    await Promise.all([LogType.CLEANING, LogType.CHECKLIST, LogType.INCIDENT].map((type) => apiGet<LogEntry[]>(`/logs?type=${type}`)))
  ).flat().filter(isSample);
  await inBatches(legacy, 4, (log) => apiDelete(`/logs/${log.id}`));
  return deleted + legacy.length;
}

/** Deletes every log entry and every temperature reading. Opening days and units are kept. */
export async function resetAllData(pin: string) {
  const { deleted } = await apiPost<ResetResult>('/logs/reset', { pin, scope: 'all' });
  const storage = window.localStorage;
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
    (key): key is string => !!key && key.startsWith(`${TEMPERATURE_PREFIX}:`),
  );
  for (const key of keys) storage.removeItem(key);
  storage.removeItem(SAMPLE_REGISTRY_KEY);
  return { logs: deleted, temperatureSheets: keys.length };
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
