'use client';

import { useEffect, useState } from 'react';
import { LogStatus, type LogEntry } from '@complyfood/shared';
import { apiGet, apiPatch } from '../../../lib/api';

type Check = LogEntry & { scheduleKey: string | null };
type CheckDraft = { temperature: string; exceptionReason: string; correctiveAction: string };

export default function DailyChecksPage() {
  const [date, setDate] = useState('');
  const [timezone, setTimezone] = useState('');
  const [checks, setChecks] = useState<Check[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CheckDraft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async (targetDate: string) => {
    const result = await apiGet<Check[]>(`/logs/daily-checks?date=${encodeURIComponent(targetDate)}`);
    setChecks(result);
    setDrafts((current) => {
      const next = { ...current };
      for (const check of result) {
        next[check.id] ??= { temperature: '', exceptionReason: '', correctiveAction: '' };
      }
      return next;
    });
  };

  useEffect(() => {
    let active = true;
    apiGet<{ date: string; timezone: string }>('/automation/daily-check-date')
      .then(async (result) => {
        if (!active) return;
        setDate(result.date);
        setTimezone(result.timezone);
        await refresh(result.date);
      })
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const updateDraft = (id: string, field: keyof CheckDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { temperature: '', exceptionReason: '', correctiveAction: '' }), [field]: value },
    }));
  };

  const submit = async (check: Check) => {
    const draft = drafts[check.id];
    setBusy(check.id);
    setError('');
    setMessage('');
    try {
      await apiPatch(`/logs/${check.id}/complete-daily-check`, {
        performed: true,
        temperature: Number(draft.temperature),
        exceptionReason: draft.exceptionReason,
        correctiveAction: draft.correctiveAction,
      });
      await refresh(date);
      setMessage(`${check.fields['Workstation / unit']} check recorded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record the check');
    } finally {
      setBusy(null);
    }
  };

  const pending = checks.filter((check) => check.status === LogStatus.PENDING);
  const completed = checks.filter((check) => check.status !== LogStatus.PENDING);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Daily Checks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only record checks that were actually performed. A check stays pending until someone enters the actual reading and confirms it.
        </p>
        {date && <p className="mt-1 text-sm text-muted-foreground">{date} · {timezone}</p>}
      </header>
      {error && <p role="alert" className="rounded-md bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-md bg-success/5 p-3 text-sm text-success">{message}</p>}
      {loading ? <p role="status">Loading scheduled checks…</p> : (
        <>
          <section aria-labelledby="pending-checks-heading" className="space-y-3">
            <h2 id="pending-checks-heading" className="text-lg font-semibold text-foreground">
              Pending and overdue <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
            </h2>
            {pending.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No pending checks for today.</p>}
            {pending.map((check) => {
              const draft = drafts[check.id] ?? { temperature: '', exceptionReason: '', correctiveAction: '' };
              const overdue = String(check.fields.scheduledDate) < date;
              return (
                <article key={check.id} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{check.fields['Workstation / unit']}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${overdue ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                      {overdue ? `Overdue · ${check.fields.scheduledDate}` : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Limit: ≤ {check.fields.limit}°C
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm font-medium text-foreground">
                      Actual temperature (°C)
                      <input
                        type="number"
                        step="0.1"
                        value={draft.temperature}
                        onChange={(event) => updateDraft(check.id, 'temperature', event.target.value)}
                        className="h-10 rounded-md border border-input bg-card px-3"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-foreground">
                      Exception (if applicable)
                      <input
                        value={draft.exceptionReason}
                        onChange={(event) => updateDraft(check.id, 'exceptionReason', event.target.value)}
                        maxLength={2000}
                        className="h-10 rounded-md border border-input bg-card px-3"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-foreground">
                      Corrective action (if applicable)
                      <input
                        value={draft.correctiveAction}
                        onChange={(event) => updateDraft(check.id, 'correctiveAction', event.target.value)}
                        maxLength={2000}
                        className="h-10 rounded-md border border-input bg-card px-3"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy === check.id || !draft.temperature.trim()}
                    onClick={() => void submit(check)}
                    className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {busy === check.id ? 'Saving…' : 'Confirm check performed'}
                  </button>
                </article>
              );
            })}
          </section>
          <section aria-labelledby="completed-checks-heading" className="space-y-3">
            <h2 id="completed-checks-heading" className="text-lg font-semibold text-foreground">
              Completed recently <span className="text-sm font-normal text-muted-foreground">({completed.length})</span>
            </h2>
            {completed.map((check) => (
              <article key={check.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                <div>
                  <h3 className="font-semibold text-foreground">{check.fields['Workstation / unit']}</h3>
                  <p className="text-sm text-muted-foreground">
                    {check.fields.temperature}°C · confirmed {check.submittedAt ? new Date(check.submittedAt).toLocaleString() : ''}
                    {check.submittedBy ? ` · user ${check.submittedBy}` : ''}
                  </p>
                  {check.exceptionReason && <p className="mt-1 text-sm text-danger">Exception: {check.exceptionReason}</p>}
                  {check.fields['Corrective action'] && <p className="text-sm text-muted-foreground">Corrective action: {check.fields['Corrective action']}</p>}
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  {String(check.fields.scheduledDate) < date ? `Completed late · ${check.fields.scheduledDate}` : 'Completed'}
                </span>
              </article>
            ))}
            {completed.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No checks have been confirmed in the last seven days.</p>}
          </section>
        </>
      )}
    </div>
  );
}
