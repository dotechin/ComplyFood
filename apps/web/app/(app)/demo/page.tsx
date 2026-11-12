'use client';

import { useEffect, useState } from 'react';
import { type LogEntry } from '@complyfood/shared';
import { apiGet } from '../../../lib/api';

export default function DemoPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LogEntry[]>('/logs/demo')
      .then(setEntries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-warning/40 bg-warning/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning">Demo view · simulated records only</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Demo data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These records are isolated from operational logs, dashboards, compliance reports, and exports.
        </p>
      </header>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {loading ? <p role="status">Loading demo data…</p> : entries.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Details</th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="p-3">{entry.fields.scheduledDate ?? entry.fields['Cleaning date'] ?? entry.fields['Checklist date'] ?? entry.measuredAt ?? entry.occurredAt ?? entry.createdAt}</td>
                  <td className="p-3 capitalize">{entry.type}</td>
                  <td className="p-3 capitalize">{entry.status}</td>
                  <td className="p-3">{Object.entries(entry.fields).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No records are classified as demo data.</p>}
    </div>
  );
}
