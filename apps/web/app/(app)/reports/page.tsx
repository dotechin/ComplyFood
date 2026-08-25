'use client';

import { useEffect, useState } from 'react';
import { AuditTable } from '@complyfood/ui';
import { LogType, type AuditEvent, type ReportSummary } from '@complyfood/shared';
import { apiDownload, apiGet } from '../../../lib/api';

export default function ReportsPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const query = typeFilter ? `?type=${typeFilter}` : '';
    Promise.all([apiGet<AuditEvent[]>('/audit'), apiGet<ReportSummary>(`/reports/summary${query}`)])
      .then(([events, rep]) => {
        setAuditEvents(events);
        setSummary(rep);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  const query = typeFilter ? `?type=${typeFilter}` : '';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All log types</option>
            {Object.values(LogType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={() => void apiDownload(`/reports/export/csv${query}`, 'compliance-report.csv')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => void apiDownload(`/reports/export/pdf${query}`, 'compliance-report.pdf')}
            className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Export PDF
          </button>
        </div>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Log Entries</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalLogs}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Overrides</p>
            <p className="text-3xl font-bold text-orange-600">{summary.totalOverrides}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{summary.byStatus.pending ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-3xl font-bold text-green-600">{summary.byStatus.confirmed ?? 0}</p>
          </div>
        </div>
      )}
      {summary ? (
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Log types</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="rounded-md bg-gray-50 p-3">
                <p className="text-sm capitalize text-gray-500">{type}</p>
                <p className="text-xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm">
          <AuditTable events={auditEvents} />
        </div>
      )}
    </div>
  );
}
