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

const PIN_BOX_CLASSES =
  'h-12 w-11 rounded-md border border-input bg-card text-center font-mono text-xl text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';
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
const PIN_LENGTH = 4;
const digitsOnly = (value: string) => value.replace(/\D/g, '');

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

function PinField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  const focusBox = (index: number) =>
    document.getElementById(`${id}-${Math.max(0, Math.min(PIN_LENGTH - 1, index))}`)?.focus();

  const setDigitAt = (index: number, raw: string) => {
    const digits = digitsOnly(raw);
    if (!digits) return;
    const chars = value.split('');
    for (let i = 0; i < digits.length && index + i < PIN_LENGTH; i++) chars[index + i] = digits[i];
    const next = chars.join('').slice(0, PIN_LENGTH);
    onChange(next);
    focusBox(index + digits.length);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusBox(index + 1);
    }
  };

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="mt-1 flex items-center gap-2">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <input
            key={index}
            id={`${id}-${index}`}
            type={visible ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_LENGTH}
            aria-label={`${label} digit ${index + 1} of ${PIN_LENGTH}`}
            value={value[index] ?? ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDigitAt(index, e.target.value.slice(-PIN_LENGTH))}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault();
              setDigitAt(index, e.clipboardData.getData('text'));
            }}
            className={PIN_BOX_CLASSES}
          />
        ))}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
          className="flex h-12 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <EyeIcon open={!visible} />
        </button>
      </div>
    </fieldset>
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
    if (pin.length !== PIN_LENGTH) return setError(`PIN must be ${PIN_LENGTH} digits.`);
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
            ? 'Supermode can delete records. Choose a 4-digit PIN to protect it.'
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
  const [yearlyOpen, setYearlyOpen] = useState(false);

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
  const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const selectPreset = (value: string) => {
    if (value === 'custom') return;
    const today = new Date();
    if (value === 'previous-year') {
      const year = today.getFullYear() - 1;
      setPeriod({ from: `${year}-01-01`, to: `${year}-12-31` });
      return;
    }
    const days = Number(value);
    if (!Number.isFinite(days)) return;
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1);
    setPeriod({ from: toIsoDate(from), to: toIsoDate(today) });
  };
  const previousYear = new Date().getFullYear() - 1;
  const selectedPreset = yearlyOpen
    ? 'yearly'
    : ['30', '90', '180', '365', '730', '1095'].includes(String(spanDays))
      ? String(spanDays)
      : period.from === defaultSamplePeriod().from && period.to === defaultSamplePeriod().to
        ? '30'
        : 'custom';
  const estimatedRegistrations = Math.max(0, spanDays) * (TEMPERATURE_UNITS.length + 18);
  const isLargePeriod = spanDays > 90;

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
    if (action === 'generate' && isLargePeriod && !window.confirm(
      `This may create up to about ${estimatedRegistrations.toLocaleString()} records over ${spanDays} days. Generation is throttled to protect your PC. Continue?`,
    )) return;
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
            Fill the opening days of a chosen period, including an entire year, with test registrations, or remove only what was generated.
            Days that already have a registration are left untouched. One generation is limited to three years and is deliberately throttled to protect your PC.
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
              onChange={(e) => { setYearlyOpen(false); setPeriod((p) => ({ ...p, from: e.target.value })); }}
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
              onChange={(e) => { setYearlyOpen(false); setPeriod((p) => ({ ...p, to: e.target.value })); }}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Quick period</span>
            <div className="flex h-10 items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
              {[
                ['30', '30 days'],
                ['90', '90 days'],
                ['180', '6 months'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selectedPreset === value}
                  onClick={() => { setYearlyOpen(false); selectPreset(value); }}
                  className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                    selectedPreset === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                aria-expanded={yearlyOpen}
                aria-controls="yearly-period-options"
                onClick={() => setYearlyOpen((open) => !open)}
                className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                  yearlyOpen || ['previous-year', '365', '730', '1095'].includes(selectedPreset)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          {yearlyOpen && (
            <div id="yearly-period-options" className="flex flex-col gap-1">
              <label htmlFor="yearly-period-select" className="text-sm font-medium text-foreground">Yearly period</label>
              <select
                id="yearly-period-select"
                value={['previous-year', '365', '730', '1095'].includes(selectedPreset) ? selectedPreset : '365'}
                onChange={(e) => selectPreset(e.target.value)}
                className="h-10 min-w-48 rounded-md border border-input bg-card px-3 text-sm text-foreground"
              >
                <option value="previous-year">Previous calendar year</option>
                <option value="365">Last year</option>
                <option value="730">Last 2 years</option>
                <option value="1095">Last 3 years</option>
              </select>
            </div>
          )}
          {periodError && (
            <p className="pb-2 text-sm text-danger" role="alert">{periodError}</p>
          )}
          {!periodError && isLargePeriod && (
            <p className="max-w-xl pb-2 text-sm text-warning" role="note">
              Long periods are supported up to three years. Generation is deliberately throttled and runs only on opening days; expect roughly {estimatedRegistrations.toLocaleString()} records at most.
            </p>
          )}
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
