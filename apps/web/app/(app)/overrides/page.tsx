'use client';

import { useEffect, useState } from 'react';
import type { OverrideRecord } from '@complyfood/shared';
import { apiGet } from '../../../lib/api';

export default function OverridesPage() {
  const [records, setRecords] = useState<OverrideRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<OverrideRecord[]>('/overrides')
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Override History</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Log Entry</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Field</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Original</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">New Value</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-card">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.logEntryId.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{r.fieldName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{JSON.stringify(r.originalValue)}</td>
                  <td className="px-4 py-3 font-medium">{JSON.stringify(r.newValue)}</td>
                  <td className="px-4 py-3 text-foreground">{r.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No overrides recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
