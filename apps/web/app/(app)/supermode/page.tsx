'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LogStatus, LogType, UserRole, type LogEntry, type User } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';

type HaccpPreset = {
  id: string;
  label: string;
  item: string;
  min: number;
  max: number;
};

const HACCP_PRESETS: HaccpPreset[] = [
  { id: 'refrigerator', label: 'Refrigerator (0–5°C)', item: 'Refrigerator 1', min: 0, max: 5 },
  { id: 'cold-holding', label: 'Cold holding (0–8°C)', item: 'Cold holding unit', min: 0, max: 8 },
  { id: 'freezer', label: 'Freezer (≤ -18°C)', item: 'Freezer 1', min: -25, max: -18 },
  { id: 'hot-holding', label: 'Hot holding (≥ 63°C)', item: 'Hot holding unit', min: 63, max: 75 },
];

type SupermodeStatus = { pinSet: boolean; lockedUntil: string | null; attemptsLeft: number };

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type ActivityEntry = { id: string; at: string; message: string; tone: 'ok' | 'error' };

function randomInRange(min: number, max: number) {
  const value = min + Math.random() * (max - min);
  return Math.round(value * 10) / 10;
}

function randomTimeOnDay(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Spread across a plausible operating window (07:00–21:00).
  const hour = 7 + Math.floor(Math.random() * 14);
  const minute = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return date;
}

export default function SupermodePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // Backlog entry state
  const [backlogType, setBacklogType] = useState<LogType>(LogType.TEMPERATURE);
  const [backlogDate, setBacklogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [backlogFields, setBacklogFields] = useState('{"item":"Refrigerator 1","value":"4°C"}');
  const [backlogStatus, setBacklogStatus] = useState<LogStatus>(LogStatus.CONFIRMED);
  const [backlogSaving, setBacklogSaving] = useState(false);

  // Generator config
  const [presetId, setPresetId] = useState(HACCP_PRESETS[0].id);
  const [item, setItem] = useState(HACCP_PRESETS[0].item);
  const [minTemp, setMinTemp] = useState(HACCP_PRESETS[0].min);
  const [maxTemp, setMaxTemp] = useState(HACCP_PRESETS[0].max);

  // Backdated series
  const [daysBack, setDaysBack] = useState(7);
  const [perDay, setPerDay] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Live scheduler
  const [running, setRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(10);
  const [tickCount, setTickCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // PIN protection
  const [pinStatus, setPinStatus] = useState<SupermodeStatus | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Reset
  const [resetScope, setResetScope] = useState<'generated' | 'all'>('generated');
  const [resetPin, setResetPin] = useState('');
  const [resetting, setResetting] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;
  const lockedUntilMs = pinStatus?.lockedUntil ? new Date(pinStatus.lockedUntil).getTime() : 0;
  const isLocked = lockedUntilMs > now;

  const stopScheduler = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  }, []);

  const refreshPinStatus = useCallback(async () => {
    const status = await apiGet<SupermodeStatus>('/users/me/supermode');
    setPinStatus(status);
    return status;
  }, []);

  useEffect(() => {
    apiGet<User>('/users/me')
      .then(async (me) => {
        setUser(me);
        if (me.role === UserRole.ADMIN) await refreshPinStatus();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setChecking(false));
  }, [refreshPinStatus]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown tick while locked out.
  useEffect(() => {
    if (!lockedUntilMs || lockedUntilMs <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntilMs]);

  const handleFailedPin = async (err: unknown) => {
    setPinError(err instanceof Error ? err.message : 'Wrong PIN');
    const status = await refreshPinStatus().catch(() => null);
    setNow(Date.now());
    if (status?.lockedUntil && new Date(status.lockedUntil).getTime() > Date.now()) {
      stopScheduler();
      setUnlocked(false);
    }
  };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!/^\d{4,8}$/.test(pinInput)) {
      setPinError('PIN must be 4 to 8 digits.');
      return;
    }
    setPinBusy(true);
    try {
      if (!pinStatus?.pinSet) {
        if (pinInput !== pinConfirm) {
          setPinError('PINs do not match.');
          return;
        }
        setPinStatus(await apiPost<SupermodeStatus>('/users/me/supermode/pin', { pin: pinInput }));
      } else {
        setPinStatus(await apiPost<SupermodeStatus>('/users/me/supermode/verify', { pin: pinInput }));
      }
      setUnlocked(true);
    } catch (err) {
      await handleFailedPin(err);
    } finally {
      setPinBusy(false);
      setPinInput('');
      setPinConfirm('');
    }
  };

  const lockSupermode = () => {
    stopScheduler();
    setUnlocked(false);
  };

  const resetLogs = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const label = resetScope === 'all' ? 'ALL log entries' : 'all Supermode-generated entries';
    if (!window.confirm(`This permanently deletes ${label}. Continue?`)) return;
    setResetting(true);
    try {
      stopScheduler();
      const result = await apiPost<{ deleted: number }>('/logs/reset', { pin: resetPin, scope: resetScope });
      const summary = `Reset complete: ${result?.deleted ?? 0} entries deleted.`;
      setMessage(summary);
      pushActivity(summary, 'ok');
      setTickCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      await handleFailedPin(err);
    } finally {
      setResetPin('');
      setResetting(false);
    }
  };

  const pushActivity = useCallback((message: string, tone: 'ok' | 'error') => {
    setActivity((prev) =>
      [{ id: crypto.randomUUID(), at: new Date().toLocaleTimeString(), message, tone }, ...prev].slice(0, 40),
    );
  }, []);

  const applyPreset = (id: string) => {
    const preset = HACCP_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setItem(preset.item);
    setMinTemp(preset.min);
    setMaxTemp(preset.max);
  };

  const createBacklogEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    let fields: Record<string, unknown>;
    try {
      const parsed = JSON.parse(backlogFields) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Fields JSON must be an object.');
      }
      fields = parsed as Record<string, unknown>;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid fields JSON.');
      return;
    }

    try {
      setBacklogSaving(true);
      const createdAt = new Date(`${backlogDate}T12:00:00`).toISOString();
      await apiPost<LogEntry>('/logs/backfill', {
        type: backlogType,
        fields: { ...fields, source: 'supermode-backfill' },
        createdAt,
        status: backlogStatus,
      });
      setMessage(`Backlogged ${backlogType} entry created for ${backlogDate}.`);
      pushActivity(`Backlogged ${backlogType} entry on ${backlogDate}`, 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create backlog entry';
      setError(msg);
      pushActivity(msg, 'error');
    } finally {
      setBacklogSaving(false);
    }
  };

  const generateSeries = async () => {
    if (maxTemp < minTemp) {
      setError('Max temperature must be greater than or equal to min temperature.');
      return;
    }
    setError('');
    setMessage('');
    const total = Math.max(1, daysBack) * Math.max(1, perDay);
    setGenerating(true);
    setProgress({ done: 0, total });
    let done = 0;
    let failed = 0;

    for (let day = 0; day < Math.max(1, daysBack); day += 1) {
      for (let n = 0; n < Math.max(1, perDay); n += 1) {
        const when = randomTimeOnDay(day);
        const temp = randomInRange(minTemp, maxTemp);
        try {
          await apiPost<LogEntry>('/logs/backfill', {
            type: LogType.TEMPERATURE,
            fields: {
              item,
              value: `${temp}°C`,
              haccpRange: `${minTemp}°C – ${maxTemp}°C`,
              source: 'supermode-generator',
              generated: true,
            },
            createdAt: when.toISOString(),
            status: LogStatus.CONFIRMED,
          });
        } catch {
          failed += 1;
        }
        done += 1;
        setProgress({ done, total });
      }
    }

    setGenerating(false);
    const ok = done - failed;
    const summary = `Generated ${ok}/${total} backdated temperature records${failed ? ` (${failed} failed)` : ''}.`;
    setMessage(summary);
    pushActivity(summary, failed ? 'error' : 'ok');
  };

  const runTick = useCallback(async () => {
    const temp = randomInRange(minTemp, maxTemp);
    try {
      await apiPost<LogEntry>('/logs', {
        type: LogType.TEMPERATURE,
        fields: {
          item,
          value: `${temp}°C`,
          haccpRange: `${minTemp}°C – ${maxTemp}°C`,
          source: 'supermode-scheduler',
          generated: true,
        },
      });
      setTickCount((c) => c + 1);
      pushActivity(`Scheduled ${item}: ${temp}°C`, 'ok');
    } catch (err) {
      pushActivity(err instanceof Error ? err.message : 'Scheduled record failed', 'error');
    }
  }, [item, maxTemp, minTemp, pushActivity]);

  const toggleScheduler = () => {
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setRunning(false);
      pushActivity('Scheduler stopped', 'ok');
      return;
    }
    setError('');
    setMessage('');
    setRunning(true);
    pushActivity(`Scheduler started · every ${intervalSec}s`, 'ok');
    void runTick();
    timerRef.current = setInterval(() => {
      void runTick();
    }, Math.max(2, intervalSec) * 1000);
  };

  if (checking) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Supermode</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Supermode is a development tool restricted to administrators.
        </p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-danger/40 bg-card p-6 text-center shadow-card" role="alert">
        <h1 className="text-xl font-semibold text-foreground">Supermode locked</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Too many wrong PIN attempts. For security, Supermode is locked and any running scheduler was stopped. Each
          repeated lockout doubles the wait.
        </p>
        <p className="mt-4 font-mono text-3xl font-bold text-danger" aria-live="polite">
          {formatCountdown(lockedUntilMs - now)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Unlocks at {new Date(lockedUntilMs).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (!unlocked) {
    const creating = !pinStatus?.pinSet;
    return (
      <div className="mx-auto max-w-sm rounded-lg border bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold text-foreground">{creating ? 'Set a Supermode PIN' : 'Enter Supermode PIN'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {creating
            ? 'Choose a 4–8 digit PIN. It is stored hashed on the server and required to open Supermode and to reset logs.'
            : `Supermode is PIN protected. ${pinStatus?.attemptsLeft ?? 3} attempt${pinStatus?.attemptsLeft === 1 ? '' : 's'} left before lockout.`}
        </p>
        <form onSubmit={submitPin} className="mt-4 flex flex-col gap-3">
          <label htmlFor="pin" className="text-sm font-medium text-foreground">
            PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            className="rounded-md border border-input bg-card px-3 py-2 text-center font-mono text-lg tracking-widest text-foreground"
            autoFocus
          />
          {creating && (
            <>
              <label htmlFor="pinConfirm" className="text-sm font-medium text-foreground">
                Confirm PIN
              </label>
              <input
                id="pinConfirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                className="rounded-md border border-input bg-card px-3 py-2 text-center font-mono text-lg tracking-widest text-foreground"
              />
            </>
          )}
          {pinError && (
            <p role="alert" className="text-sm text-danger">
              {pinError}
            </p>
          )}
          <button
            type="submit"
            disabled={pinBusy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pinBusy ? 'Checking…' : creating ? 'Save PIN and unlock' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Supermode</h1>
            <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
              Dev only
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Development utilities for seeding backlogged entries and automating HACCP-compliant temperature records.
          </p>
        </div>
        <button
          type="button"
          onClick={lockSupermode}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Lock Supermode
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Backlog a single entry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an entry stamped on a past date so it lands correctly in reports and filters.
          </p>
          <form onSubmit={createBacklogEntry} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="backlogType" className="mb-1 block text-sm font-medium text-foreground">
                  Log type
                </label>
                <select
                  id="backlogType"
                  value={backlogType}
                  onChange={(e) => setBacklogType(e.target.value as LogType)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                >
                  {Object.values(LogType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="backlogDate" className="mb-1 block text-sm font-medium text-foreground">
                  Date
                </label>
                <input
                  id="backlogDate"
                  type="date"
                  value={backlogDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBacklogDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div>
              <label htmlFor="backlogFields" className="mb-1 block text-sm font-medium text-foreground">
                Fields JSON
              </label>
              <textarea
                id="backlogFields"
                value={backlogFields}
                onChange={(e) => setBacklogFields(e.target.value)}
                className="h-24 w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm text-foreground"
              />
            </div>
            <div>
              <label htmlFor="backlogStatus" className="mb-1 block text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="backlogStatus"
                value={backlogStatus}
                onChange={(e) => setBacklogStatus(e.target.value as LogStatus)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground md:w-1/2"
              >
                {Object.values(LogStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={backlogSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {backlogSaving ? 'Creating…' : 'Create backlog entry'}
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">HACCP temperature automation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Randomized readings are always drawn from within the selected compliant range.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="preset" className="mb-1 block text-sm font-medium text-foreground">
                HACCP range preset
              </label>
              <select
                id="preset"
                value={presetId}
                onChange={(e) => applyPreset(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                {HACCP_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="item" className="mb-1 block text-sm font-medium text-foreground">
                Item / unit label
              </label>
              <input
                id="item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label htmlFor="minTemp" className="mb-1 block text-sm font-medium text-foreground">
                Min °C
              </label>
              <input
                id="minTemp"
                type="number"
                step="0.1"
                value={minTemp}
                onChange={(e) => setMinTemp(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label htmlFor="maxTemp" className="mb-1 block text-sm font-medium text-foreground">
                Max °C
              </label>
              <input
                id="maxTemp"
                type="number"
                step="0.1"
                value={maxTemp}
                onChange={(e) => setMaxTemp(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
            <h3 className="text-sm font-semibold text-foreground">Backdated series</h3>
            <p className="mt-1 text-xs text-muted-foreground">Seed history across previous days.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="daysBack" className="mb-1 block text-xs font-medium text-foreground">
                  Days back
                </label>
                <input
                  id="daysBack"
                  type="number"
                  min={1}
                  max={90}
                  value={daysBack}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className="w-24 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="perDay" className="mb-1 block text-xs font-medium text-foreground">
                  Per day
                </label>
                <input
                  id="perDay"
                  type="number"
                  min={1}
                  max={24}
                  value={perDay}
                  onChange={(e) => setPerDay(Number(e.target.value))}
                  className="w-24 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                />
              </div>
              <button
                type="button"
                onClick={() => void generateSeries()}
                disabled={generating}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {generating && progress
                  ? `Generating ${progress.done}/${progress.total}…`
                  : 'Generate series'}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
            <h3 className="text-sm font-semibold text-foreground">Live scheduler</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Adds a new record at the interval while this page stays open.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="intervalSec" className="mb-1 block text-xs font-medium text-foreground">
                  Interval (seconds)
                </label>
                <input
                  id="intervalSec"
                  type="number"
                  min={2}
                  max={3600}
                  value={intervalSec}
                  disabled={running}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  className="w-28 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={toggleScheduler}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  running
                    ? 'bg-danger text-white hover:bg-danger/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {running ? 'Stop scheduler' : 'Start scheduler'}
              </button>
              <span className="text-xs text-muted-foreground">
                {running ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
                    Running · {tickCount} sent
                  </span>
                ) : (
                  `${tickCount} records sent this session`
                )}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-danger/40 bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">Clear logs / Reset</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Permanently deletes log entries for your organization. Re-enter your PIN to confirm; wrong PINs count toward
          the lockout.
        </p>
        <form onSubmit={resetLogs} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="resetScope" className="mb-1 block text-xs font-medium text-foreground">
              What to clear
            </label>
            <select
              id="resetScope"
              value={resetScope}
              onChange={(e) => setResetScope(e.target.value as 'generated' | 'all')}
              className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="generated">Supermode-generated entries only</option>
              <option value="all">All log entries (full reset)</option>
            </select>
          </div>
          <div>
            <label htmlFor="resetPin" className="mb-1 block text-xs font-medium text-foreground">
              PIN
            </label>
            <input
              id="resetPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ''))}
              className="w-32 rounded-md border border-input bg-card px-3 py-2 font-mono text-sm tracking-widest text-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={resetting || resetPin.length < 4}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {resetting ? 'Clearing…' : 'Reset logs'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">Activity</h2>
        {activity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No activity yet this session.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                <span className={entry.tone === 'error' ? 'text-danger' : 'text-foreground'}>{entry.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{entry.at}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
