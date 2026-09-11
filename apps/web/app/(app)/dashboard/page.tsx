'use client';

import { useEffect, useState } from 'react';
import { LogTable } from '@complyfood/ui';
import type { LogEntry, ReminderEvent } from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';

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
      const updated = await apiPatch<LogEntry>(`/logs/${id}/confirm`, {});
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              pendingLogs: prev.pendingLogs
                .map((entry) => (entry.id === id ? updated : entry))
                .filter((entry) => entry.id !== id),
            }
          : prev,
      );
      setMessage('Log entry confirmed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm log entry');
    }
  };

  const acknowledgeReminder = async (id: string) => {
    try {
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
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Today&apos;s Tasks</h1>
        <p className="text-sm text-gray-500">Track generated work, pending confirmations, and due reminders.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>
      {snapshot && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Pending tasks" value={snapshot.pendingLogs.length} />
          <SummaryCard label="Generated from presets" value={snapshot.generatedToday} />
          <SummaryCard label="Active presets" value={snapshot.activePresetCount} />
          <SummaryCard label="Due reminders" value={snapshot.dueReminders.length} />
        </div>
      )}
      {snapshot && snapshot.dueReminders.length > 0 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Due reminders</h2>
          <div className="space-y-3">
            {snapshot.dueReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                <div>
                  <p className="font-medium text-gray-900">{reminder.message}</p>
                  <p className="text-xs text-gray-500">
                    {reminder.type} · {new Date(reminder.scheduledFor).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void acknowledgeReminder(reminder.id)}
                  className="rounded-md border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <LogTable entries={snapshot?.pendingLogs ?? []} onConfirm={handleConfirm} />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
