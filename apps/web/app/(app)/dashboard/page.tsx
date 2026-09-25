'use client';

import { useEffect, useState } from 'react';
import { LogTable } from '@complyfood/ui';
import type { LogEntry, ReminderEvent } from '@complyfood/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api';
import { ComplianceSection } from './compliance-section';

interface DashboardSnapshot {
  pendingLogs: LogEntry[];
  dueReminders: ReminderEvent[];
  generatedToday: number;
  activePresetCount: number;
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<DashboardSnapshot>('/automation/dashboard')
      .then(setSnapshot)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      setError('');
      const updated = await apiPatch<LogEntry>(`/logs/${id}/confirm`, {});
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              pendingLogs: prev.pendingLogs.filter((entry) => entry.id !== updated.id),
            }
          : prev,
      );
      setMessage('Log entry confirmed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm log entry');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setError('');
      await apiDelete(`/logs/${id}`);
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              pendingLogs: prev.pendingLogs.filter((entry) => entry.id !== id),
            }
          : prev,
      );
      setMessage('Pending entry cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel log entry');
    }
  };

  const acknowledgeReminder = async (id: string) => {
    try {
      setError('');
      setMessage('');
      await apiPost(`/automation/reminders/${id}/acknowledge`, {});
      setSnapshot((prev) =>
        prev ? { ...prev, dueReminders: prev.dueReminders.filter((reminder) => reminder.id !== id) } : prev,
      );
      setMessage('Reminder acknowledged.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to acknowledge reminder');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today&apos;s Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track generated work, pending confirmations, and due reminders.
        </p>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}
        {message && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {message}
          </div>
        )}
      </div>

      {snapshot && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Pending tasks"
            value={snapshot.pendingLogs.length}
            tone="warning"
            icon={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
          />
          <SummaryCard
            label="Generated from presets"
            value={snapshot.generatedToday}
            tone="primary"
            icon={<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></>}
          />
          <SummaryCard
            label="Active presets"
            value={snapshot.activePresetCount}
            tone="primary"
            icon={<><path d="M11 12H3M16 6H3M16 18H3M18 9l3 3-3 3" /></>}
          />
          <SummaryCard
            label="Due reminders"
            value={snapshot.dueReminders.length}
            tone="danger"
            icon={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ComplianceSection />
        </div>

        <div className="space-y-8 lg:col-span-2">
          {snapshot && snapshot.dueReminders.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-danger/10 text-danger">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                Due reminders
              </h2>
              <div className="space-y-2.5">
                {snapshot.dueReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/40 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{reminder.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="capitalize">{reminder.type}</span> · {new Date(reminder.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void acknowledgeReminder(reminder.id)}
                      className="shrink-0 rounded-md border border-primary/30 bg-card px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-accent"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">Pending confirmations</h2>
              {snapshot && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {snapshot.pendingLogs.length} item{snapshot.pendingLogs.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                Loading…
              </div>
            ) : (
              <LogTable entries={snapshot?.pendingLogs ?? []} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const toneStyles = {
  primary: 'bg-accent text-accent-foreground',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
} as const;

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: keyof typeof toneStyles;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneStyles[tone]}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {icon}
          </svg>
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
