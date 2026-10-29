'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { clearSampleData, generateSampleMonth, resetAllData, storedTemperatureUnits } from '../logs/sample-data';
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

function PinGate({ status, onUnlock }: { status: SupermodeStatus; onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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
      onUnlock(pin);
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

  const run = async (action: 'generate' | 'clear' | 'reset') => {
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
        const result = await generateSampleMonth(storedTemperatureUnits(TEMPERATURE_UNITS));
        setMessage(`Added ${result.readings} temperature readings, ${result.ticks} cleaning/checklist ticks and ${result.incidents} incidents for the last 30 days.`);
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
            Fill the last 30 opening days with test registrations, or remove only what was generated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void run('generate')} disabled={!!busy} className={PRIMARY_BUTTON}>
            {busy === 'generate' ? 'Generating…' : 'Generate sample month'}
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

  const lock = () => {
    setPin(null);
    setStatus((prev) => (prev ? { ...prev, pinSet: true } : prev));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Supermode</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {pin ? 'Unlocked' : 'PIN protected'}
        </span>
      </div>
      {loadError && <p role="alert" className="text-sm text-danger">{loadError}</p>}
      {!status && !loadError && <p role="status" className="sr-only">Loading…</p>}
      {status && !pin && <PinGate status={status} onUnlock={setPin} />}
      {pin && <SupermodeTools pin={pin} onLock={lock} />}
    </div>
  );
}
