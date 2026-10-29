'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import {
  DEFAULT_TEMPERATURE_RANGES,
  MAX_SAMPLE_DAYS,
  TEMPERATURE_TARGETS,
  type TemperatureRanges,
  clearSampleData,
  defaultSamplePeriod,
  generateSampleData,
  resetAllData,
  storedTemperatureUnits,
} from '../logs/sample-data';
import { TEMPERATURE_UNITS } from '../logs/temperature-log';

type SupermodeStatus = { pinSet: boolean; lockedUntil: string | null; attemptsLeft: number };

const INPUT_CLASSES =
  'h-10 w-40 rounded-md border border-input bg-card px-3 text-center font-mono text-lg tracking-[0.4em] text-foreground';
const PRIMARY_BUTTON =
  'h-10 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60';
const SECONDARY_BUTTON =
  'h-10 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60';
const DANGER_BUTTON =
  'h-10 rounded-md border border-danger bg-danger px-4 text-sm font-medium text-danger-foreground disabled:opacity-60';

type TemperatureScale = 'C' | 'K' | 'F';
const SCALES: Record<TemperatureScale, { name: string; symbol: string }> = {
  C: { name: 'Celsius', symbol: '°C' },
  K: { name: 'Kelvin', symbol: 'K' },
  F: { name: 'Fahrenheit', symbol: '°F' },
};
const toCelsius = (value: number, scale: TemperatureScale) =>
  scale === 'K' ? value - 273.15 : scale === 'F' ? ((value - 32) * 5) / 9 : value;
const fromCelsius = (celsius: number, scale: TemperatureScale) =>
  scale === 'K' ? celsius + 273.15 : scale === 'F' ? (celsius * 9) / 5 + 32 : celsius;
const formatTemp = (celsius: number, scale: TemperatureScale) =>
  String(Math.round(fromCelsius(celsius, scale) * 10) / 10);

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 8);

function PinField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d{4,8}"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        className={INPUT_CLASSES}
      />
    </div>
  );
}

const UNLOCK_DURATIONS = [5, 15, 30, 60] as const;
type UnlockDuration = (typeof UNLOCK_DURATIONS)[number];

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

function PinGate({ status, onUnlock }: { status: SupermodeStatus; onUnlock: (pin: string, minutes: UnlockDuration) => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [duration, setDuration] = useState<UnlockDuration>(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const creating = !status.pinSet;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length < 4) return setError('PIN must be 4 to 8 digits.');
    if (creating && pin !== confirmPin) return setError('The two PINs do not match.');
    setBusy(true);
    try {
      await apiPost(creating ? '/users/me/supermode/pin' : '/users/me/supermode/verify', { pin });
      onUnlock(pin, duration);
    } catch (err) {
      setError(errorText(err, 'Unable to verify the PIN'));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{creating ? 'Create a Supermode PIN' : 'Enter your PIN'}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {creating
            ? 'Supermode can delete records. Choose a 4 to 8 digit PIN to protect it.'
            : 'Supermode is locked. Enter your PIN to continue.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <PinField id="supermode-pin" label="PIN" value={pin} onChange={setPin} />
        {creating && <PinField id="supermode-pin-confirm" label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />}
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-foreground">Keep unlocked for</legend>
        <div role="radiogroup" aria-label="Keep unlocked for" className="mt-1 flex w-fit rounded-md border border-border bg-muted/40 p-1">
          {UNLOCK_DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={duration === minutes}
              onClick={() => setDuration(minutes)}
              className={`h-8 rounded px-3 text-sm font-medium ${
                duration === minutes ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {`${minutes} min`}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div>
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
          {busy ? 'Checking…' : creating ? 'Save PIN and unlock' : 'Unlock'}
        </button>
      </div>
    </form>
  );
}

function SupermodeTools({ pin, onLock }: { pin: string; onLock: () => void }) {
  const [busy, setBusy] = useState<'generate' | 'clear' | 'reset' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(defaultSamplePeriod);

  const parseDay = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const fromDate = parseDay(period.from);
  const toDate = parseDay(period.to);
  const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  const periodError = !period.from || !period.to
    ? 'Choose a start and end date.'
    : spanDays < 1
      ? 'The end date must be on or after the start date.'
      : spanDays > MAX_SAMPLE_DAYS
        ? `The period can be at most ${MAX_SAMPLE_DAYS} days.`
        : '';
  const formatDay = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const [scale, setScale] = useState<TemperatureScale>('C');
  const [ranges, setRanges] = useState<Record<keyof TemperatureRanges, { min: string; max: string }>>(() => ({
    fridge: { min: String(DEFAULT_TEMPERATURE_RANGES.fridge.min), max: String(DEFAULT_TEMPERATURE_RANGES.fridge.max) },
    freezer: { min: String(DEFAULT_TEMPERATURE_RANGES.freezer.min), max: String(DEFAULT_TEMPERATURE_RANGES.freezer.max) },
  }));
  const toC = (value: string) => toCelsius(parseFloat(value), scale);
  const parsedRanges: TemperatureRanges = {
    fridge: { min: toC(ranges.fridge.min), max: toC(ranges.fridge.max) },
    freezer: { min: toC(ranges.freezer.min), max: toC(ranges.freezer.max) },
  };
  const symbol = SCALES[scale].symbol;
  const rangeError = (['fridge', 'freezer'] as const)
    .map((kind) => {
      const { min, max } = parsedRanges[kind];
      const name = kind === 'fridge' ? 'Fridges' : 'Freezers';
      if (!Number.isFinite(min) || !Number.isFinite(max)) return `${name}: enter both a minimum and a maximum.`;
      if (min > max) return `${name}: the minimum must not exceed the maximum.`;
      if (min < -50 || max > 50) {
        return `${name}: keep values between ${formatTemp(-50, scale)}${symbol} and ${formatTemp(50, scale)}${symbol}.`;
      }
      return '';
    })
    .find(Boolean) ?? '';
  const setRange = (kind: keyof TemperatureRanges, bound: 'min' | 'max', value: string) =>
    setRanges((r) => ({ ...r, [kind]: { ...r[kind], [bound]: value } }));
  const changeScale = (next: TemperatureScale) => {
    const convert = (value: string) => {
      const celsius = toCelsius(parseFloat(value), scale);
      return Number.isFinite(celsius) ? formatTemp(celsius, next) : value;
    };
    setRanges((r) => ({
      fridge: { min: convert(r.fridge.min), max: convert(r.fridge.max) },
      freezer: { min: convert(r.freezer.min), max: convert(r.freezer.max) },
    }));
    setScale(next);
  };

  const run = async (action: 'generate' | 'clear' | 'reset') => {
    if (action === 'generate' && (periodError || rangeError)) return setError(periodError || rangeError);
    if (action === 'clear' && !window.confirm('Remove all generated sample entries?')) return;
    if (
      action === 'reset'
      && window.prompt('This permanently deletes ALL log entries and temperature readings. Type RESET to confirm.') !== 'RESET'
    ) return;
    setBusy(action);
    setMessage('');
    setError('');
    try {
      if (action === 'generate') {
        const result = await generateSampleData(storedTemperatureUnits(TEMPERATURE_UNITS), fromDate, toDate, parsedRanges);
        setMessage(
          `Added ${result.readings} temperature readings, ${result.ticks} cleaning/checklist ticks and ${result.incidents} incidents across ${result.days} opening days (${formatDay(fromDate)} – ${formatDay(toDate)}).`,
        );
      } else if (action === 'clear') {
        const removed = await clearSampleData(pin);
        setMessage(`Sample data cleared (${removed} logged entries removed).`);
      } else {
        const result = await resetAllData(pin);
        setMessage(`Reset complete: ${result.logs} log entries and ${result.temperatureSheets} temperature sheets deleted.`);
      }
    } catch (err) {
      setError(errorText(err, 'Supermode action failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sample data</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Fill the opening days of a chosen period with test registrations, or remove only what was generated.
            Days that already have a registration are left untouched.
          </p>
        </div>
        <fieldset className="flex flex-wrap items-end gap-4">
          <legend className="sr-only">Sample data period</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="sample-from" className="text-sm font-medium text-foreground">From</label>
            <input
              id="sample-from"
              type="date"
              value={period.from}
              max={period.to || undefined}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sample-to" className="text-sm font-medium text-foreground">To</label>
            <input
              id="sample-to"
              type="date"
              value={period.to}
              min={period.from || undefined}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            />
          </div>
          <p className="pb-2 text-sm text-muted-foreground" aria-live="polite">
            {periodError || `${spanDays} ${spanDays === 1 ? 'day' : 'days'} selected`}
          </p>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-foreground">{`Temperature range (${symbol})`}</legend>
          <div role="radiogroup" aria-label="Unit of measurement" className="flex w-fit rounded-md border border-border bg-muted/40 p-1">
            {(Object.keys(SCALES) as TemperatureScale[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={scale === key}
                onClick={() => changeScale(key)}
                className={`h-8 rounded px-3 text-sm font-medium ${
                  scale === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {`${SCALES[key].name} (${SCALES[key].symbol})`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-6">
            {(['fridge', 'freezer'] as const).map((kind) => (
              <div key={kind} className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
                <span className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-foreground">
  <span>
  {kind === 'fridge' ? 'Fridges' : 'Freezers'}{' '}
  <span className="text-muted-foreground">target</span>
  </span>
  <span className="font-normal text-muted-foreground">
                    {`≤ ${formatTemp(TEMPERATURE_TARGETS[kind], scale)}${symbol}`}
                  </span>
                </span>
                <div className="flex items-end gap-3">
                  {(['min', 'max'] as const).map((bound) => (
                    <div key={bound} className="flex flex-col gap-1">
                      <label htmlFor={`range-${kind}-${bound}`} className="text-xs text-muted-foreground">
                        {bound === 'min' ? 'Min' : 'Max'}
                      </label>
                      <input
                        id={`range-${kind}-${bound}`}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        value={ranges[kind][bound]}
                        onChange={(e) => setRange(kind, bound, e.target.value)}
                        className="h-10 w-24 rounded-md border border-input bg-card px-3 text-sm text-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
            {rangeError || 'Readings are picked at random within each range. Any reading above the target is also logged as an incident.'}
          </p>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void run('generate')} disabled={!!busy || !!periodError || !!rangeError} className={PRIMARY_BUTTON}>
            {busy === 'generate' ? 'Generating…' : 'Generate sample data'}
          </button>
          <button type="button" onClick={() => void run('clear')} disabled={!!busy} className={SECONDARY_BUTTON}>
            {busy === 'clear' ? 'Clearing…' : 'Clear sample data'}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-card p-6 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-danger">Reset</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Deletes every entry in all daily logs at once: temperatures, cleaning, checklist, receiving and incidents.
            Opening days, units and imported historical records are kept. This cannot be undone.
          </p>
        </div>
        <div>
          <button type="button" onClick={() => void run('reset')} disabled={!!busy} className={DANGER_BUTTON}>
            {busy === 'reset' ? 'Resetting…' : 'Reset all entries'}
          </button>
        </div>
      </section>

      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div>
        <button type="button" onClick={onLock} className={SECONDARY_BUTTON}>Lock Supermode</button>
      </div>
    </div>
  );
}

export default function SupermodePage() {
  const [status, setStatus] = useState<SupermodeStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<SupermodeStatus>('/users/me/supermode')
      .then((result) => active && setStatus(result))
      .catch((err) => active && setLoadError(errorText(err, 'Unable to load Supermode')));
    return () => {
      active = false;
    };
  }, []);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const lock = () => {
    setPin(null);
    setExpiresAt(null);
    setStatus((prev) => (prev ? { ...prev, pinSet: true } : prev));
  };

  const unlock = (value: string, minutes: UnlockDuration) => {
    setPin(value);
    setNow(Date.now());
    setExpiresAt(Date.now() + minutes * 60_000);
  };

  useEffect(() => {
    if (expiresAt === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) lock();
    };
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Supermode</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {pin ? 'Unlocked' : 'PIN protected'}
        </span>
        {pin && expiresAt !== null && (
          <span className="font-mono text-sm tabular-nums text-muted-foreground" aria-label="Time until Supermode locks">
            {`Locks in ${formatRemaining(expiresAt - now)}`}
          </span>
        )}
      </div>
      {loadError && <p role="alert" className="text-sm text-danger">{loadError}</p>}
      {!status && !loadError && <p role="status" className="sr-only">Loading…</p>}
      {status && !pin && <PinGate status={status} onUnlock={unlock} />}
      {pin && <SupermodeTools pin={pin} onLock={lock} />}
    </div>
  );
}
