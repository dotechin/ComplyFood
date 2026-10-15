'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';

type Mode = 'standard' | 'secret';
type Status = { pinSet: boolean; secretPinSet: boolean; lockedUntil: string | null; attemptsLeft: number };

const INPUT = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';
const BUTTON = 'h-9 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50';
const DANGER = 'h-9 rounded-md bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50';

// Draft menus: entries marked `planned` are listed but not wired yet.
const SECRET_MENU = [
  'Backdate / edit locked records (exception mode)',
  'Export full audit trail',
  'Seed demo data',
  'Toggle maintenance banner',
];

export default function SupermodePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pin, setPin] = useState('');
  const [mainPin, setMainPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newSecretPin, setNewSecretPin] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => apiGet<Status>('/users/me/supermode').then(setStatus).catch((e: Error) => setError(e.message));
  useEffect(() => { void refresh(); }, []);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      return false;
    }
  };

  const lock = () => { setMode(null); setPin(''); setMainPin(''); setConfirmText(''); setMessage(''); setError(''); };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await apiPost<Status & { mode: Mode }>('/users/me/supermode/unlock', { pin });
      setMode(result.mode);
      setPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock');
      void refresh();
    }
  };

  const setMainPinAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      () => apiPost('/users/me/supermode/pin', { pin: newPin, ...(status?.pinSet ? { currentPin: mainPin } : {}) }),
      'PIN saved.',
    );
    if (ok) { setNewPin(''); setMainPin(''); }
  };

  const setSecretPinAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      () => apiPost('/users/me/supermode/secret-pin', { pin: newSecretPin, currentPin: mainPin }),
      'Secret PIN saved.',
    );
    if (ok) { setNewSecretPin(''); setMainPin(''); }
  };

  const reset = (scope: 'generated' | 'all') => run(
    async () => {
      const result = await apiPost<{ deleted: number }>('/logs/reset', { pin: mainPin, scope });
      setMessage(`${result.deleted} log entries deleted.`);
      setConfirmText('');
      setMainPin('');
    },
    '',
  );

  const locked = status?.lockedUntil ? new Date(status.lockedUntil) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Supermode</h1>
        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-warning">Draft</span>
        {mode && <button type="button" onClick={lock} className="ml-auto text-sm underline">Lock</button>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}

      {status && !status.pinSet && (
        <form onSubmit={setMainPinAction} className="flex items-end gap-2 rounded-lg border bg-card p-4 shadow-card" aria-label="Create PIN">
          <label className="grid gap-1 text-sm font-medium">Create PIN (4–8 digits)
            <input className={INPUT} inputMode="numeric" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          </label>
          <button className={BUTTON} type="submit">Save PIN</button>
        </form>
      )}

      {status?.pinSet && !mode && (
        <form onSubmit={unlock} className="flex items-end gap-2 rounded-lg border bg-card p-4 shadow-card" aria-label="Unlock supermode">
          <label className="grid gap-1 text-sm font-medium">PIN
            <input className={INPUT} inputMode="numeric" type="password" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          <button className={BUTTON} type="submit" disabled={Boolean(locked && locked > new Date())}>Unlock</button>
          {locked && locked > new Date() && <p className="text-sm text-danger">Locked until {locked.toLocaleTimeString()}</p>}
        </form>
      )}

      {mode === 'standard' && (
        <div className="space-y-4">
          <section className="space-y-2 rounded-lg border bg-card p-4 shadow-card">
            <h2 className="font-semibold">Reset &amp; delete</h2>
            <p className="text-sm text-muted-foreground">Imported historical PDF transcriptions are never deleted.</p>
            <label className="grid max-w-xs gap-1 text-sm font-medium">Main PIN (required for every reset)
              <input className={INPUT} inputMode="numeric" type="password" value={mainPin} onChange={(e) => setMainPin(e.target.value)} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={BUTTON} disabled={!mainPin} onClick={() => void reset('generated')}>Delete generated/demo logs</button>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <label className="grid gap-1 text-sm font-medium">Type DELETE to enable full reset
                <input className={INPUT} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </label>
              <button type="button" className={DANGER} disabled={!mainPin || confirmText !== 'DELETE'} onClick={() => void reset('all')}>Full reset: delete ALL logs</button>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border bg-card p-4 shadow-card">
            <h2 className="font-semibold">PIN management</h2>
            <form onSubmit={setMainPinAction} className="flex flex-wrap items-end gap-2" aria-label="Change PIN">
              <label className="grid gap-1 text-sm font-medium">Current PIN
                <input className={INPUT} inputMode="numeric" type="password" value={mainPin} onChange={(e) => setMainPin(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium">New PIN
                <input className={INPUT} inputMode="numeric" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
              </label>
              <button className={BUTTON} type="submit" disabled={!mainPin || !newPin}>Change PIN</button>
            </form>
            <form onSubmit={setSecretPinAction} className="flex flex-wrap items-end gap-2" aria-label="Set secret PIN">
              <label className="grid gap-1 text-sm font-medium">Secret PIN {status?.secretPinSet ? '(set — enter to replace)' : '(not set)'}
                <input className={INPUT} inputMode="numeric" type="password" value={newSecretPin} onChange={(e) => setNewSecretPin(e.target.value)} />
              </label>
              <button className={BUTTON} type="submit" disabled={!mainPin || !newSecretPin}>Save secret PIN</button>
            </form>
            <p className="text-xs text-muted-foreground">Uses the current PIN field above. Entering the secret PIN at unlock opens the secret menu instead.</p>
          </section>
        </div>
      )}

      {mode === 'secret' && (
        <section className="space-y-2 rounded-lg border border-dashed bg-card p-4 shadow-card" aria-label="Secret menu">
          <h2 className="font-semibold">Secret menu (draft)</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {SECRET_MENU.map((item) => <li key={item}>{item} — planned</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
