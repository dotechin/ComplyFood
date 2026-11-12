'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LogEntry } from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';
import { TEMPERATURE_UNITS, type TemperatureUnit } from '../logs/temperature-log';
import { storedTemperatureUnits } from '../logs/sample-data';

type Classification = '' | 'real' | 'demo';
type Category = '' | 'fridge' | 'freezer';
type BrowserReading = {
  key: string;
  unit: string;
  date: string;
  temperature: number;
  measuredAt: string;
  categoryHint: Category;
  registrySample: boolean;
  error?: string;
};
type ReviewState = { classification: Classification; category: Category };

const STORAGE_PREFIX = 'complyfood-temperature-daily:';
const REGISTRY_KEY = 'complyfood-sample-temperature';
const button = 'rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted';

function readLocalReadings(): BrowserReading[] {
  const registry = JSON.parse(window.localStorage.getItem(REGISTRY_KEY) || '{}') as Record<string, string[]>;
  const units = storedTemperatureUnits(TEMPERATURE_UNITS);
  const readings: BrowserReading[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (!storageKey?.startsWith(STORAGE_PREFIX)) continue;
    const suffix = storageKey.slice(STORAGE_PREFIX.length);
    const monthSeparator = suffix.lastIndexOf(':');
    const unit = suffix.slice(0, monthSeparator);
    const monthMatch = suffix.slice(monthSeparator + 1).match(/^(\d{4})-(\d{1,2})$/);
    if (!monthMatch) continue;
    const [, yearText, monthText] = monthMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    for (const [dayText, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object' || !('temp' in value) || !('time' in value)
        || typeof value.temp !== 'string' || typeof value.time !== 'string') continue;
      const day = Number(dayText);
      const date = new Date(Date.UTC(year, month - 1, day));
      const dateString = date.toISOString().slice(0, 10);
      const numericTemperature = Number(value.temp);
      const time = value.time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      const localMeasuredAt = time ? new Date(year, month - 1, day, Number(time[1]), Number(time[2])) : null;
      const category = units.find((option: TemperatureUnit) => option.value === unit)?.category ?? '';
      readings.push({
        key: `${unit}|${dateString}`,
        unit,
        date: dateString,
        temperature: numericTemperature,
        measuredAt: localMeasuredAt && !Number.isNaN(localMeasuredAt.getTime()) ? localMeasuredAt.toISOString() : '',
        categoryHint: category,
        registrySample: (registry[storageKey] ?? []).includes(dayText),
        ...(!Number.isFinite(numericTemperature) || !localMeasuredAt || Number.isNaN(localMeasuredAt.getTime())
          ? { error: 'Reading or local time is invalid; the original was left untouched.' }
          : {}),
      });
    }
  }
  return readings.sort((a, b) => a.date.localeCompare(b.date) || a.unit.localeCompare(b.unit));
}

export function ExistingDataReview() {
  const [unreviewed, setUnreviewed] = useState<LogEntry[]>([]);
  const [browserReadings, setBrowserReadings] = useState<BrowserReading[]>([]);
  const [review, setReview] = useState<Record<string, ReviewState>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setError('');
      const logs = await apiGet<LogEntry[]>('/logs/review');
      setUnreviewed(logs);
      const local = readLocalReadings();
      setBrowserReadings(local);
      setReview(Object.fromEntries(local.map((reading) => [reading.key, {
        classification: '',
        category: reading.categoryHint,
      }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load records for review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const importable = useMemo(() => browserReadings.filter((reading) =>
    !reading.error && review[reading.key]?.classification && review[reading.key]?.category), [browserReadings, review]);

  const classifyServerRecord = async (entry: LogEntry, classification: 'real' | 'demo') => {
    setBusy(entry.id);
    setError('');
    setMessage('');
    try {
      await apiPatch(`/logs/${entry.id}/classification`, { classification });
      setUnreviewed((current) => current.filter((record) => record.id !== entry.id));
      setMessage(`Record classified as ${classification}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to classify record');
    } finally {
      setBusy('');
    }
  };

  const importReviewedReadings = async () => {
    if (importable.length === 0) return;
    setBusy('import');
    setError('');
    setMessage('');
    let imported = 0;
    let duplicates = 0;
    try {
      for (let start = 0; start < importable.length; start += 500) {
        const batch = importable.slice(start, start + 500).map((reading) => ({
          date: reading.date,
          unit: reading.unit,
          category: review[reading.key].category,
          temperature: reading.temperature,
          measuredAt: reading.measuredAt,
          classification: review[reading.key].classification,
        }));
        const result = await apiPost<{ imported: number; duplicates: number }>('/logs/temperature/browser-import', { records: batch });
        imported += result.imported;
        duplicates += result.duplicates;
      }
      setMessage(`${imported} reading${imported === 1 ? '' : 's'} imported; ${duplicates} already matched. Browser originals were retained.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import reviewed readings');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review existing records before use</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unmarked server records are held out of operational views until classified. Browser readings stay in local storage; review each reading and explicitly classify it before importing. A sample-registry marker is only a review hint.
        </p>
      </div>
      {loading ? <p role="status">Loading records for review…</p> : (
        <>
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Unclassified server records ({unreviewed.length})</h3>
            {unreviewed.map((entry) => (
              <article key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{entry.type} · {entry.fields['Workstation / unit'] ?? entry.fields['Area / Item'] ?? entry.id}</p>
                  <p className="text-muted-foreground">{entry.measuredAt ?? entry.occurredAt ?? entry.createdAt} · {JSON.stringify(entry.fields)}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy === entry.id} onClick={() => void classifyServerRecord(entry, 'real')} className={button}>Classify real</button>
                  <button disabled={busy === entry.id} onClick={() => void classifyServerRecord(entry, 'demo')} className={button}>Classify demo</button>
                </div>
              </article>
            ))}
            {unreviewed.length === 0 && <p className="text-sm text-muted-foreground">No unclassified server records.</p>}
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Browser-local temperature readings ({browserReadings.length})</h3>
            {browserReadings.map((reading) => {
              const value = review[reading.key] ?? { classification: '', category: reading.categoryHint };
              return (
                <article key={reading.key} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_150px_130px]">
                  <div className="text-sm">
                    <p className="font-medium">{reading.unit} · {reading.date} · {reading.temperature}°C</p>
                    <p className="text-muted-foreground">
                      {reading.measuredAt ? new Date(reading.measuredAt).toLocaleString() : 'Invalid local time'}
                      {reading.registrySample ? ' · sample registry marks this reading' : ''}
                    </p>
                    {reading.error && <p role="alert" className="text-danger">{reading.error}</p>}
                  </div>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Classification
                    <select value={value.classification} onChange={(event) => setReview((current) => ({
                      ...current,
                      [reading.key]: { ...value, classification: event.target.value as Classification },
                    }))} className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground">
                      <option value="">Review and choose…</option><option value="real">Real</option><option value="demo">Demo</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Appliance type
                    <select value={value.category} onChange={(event) => setReview((current) => ({
                      ...current,
                      [reading.key]: { ...value, category: event.target.value as Category },
                    }))} className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground">
                      <option value="">Choose type…</option><option value="fridge">Fridge</option><option value="freezer">Freezer</option>
                    </select>
                  </label>
                </article>
              );
            })}
            <button type="button" disabled={!importable.length || busy === 'import'} onClick={() => void importReviewedReadings()} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy === 'import' ? 'Importing…' : `Import ${importable.length} reviewed reading${importable.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}
    </section>
  );
}
