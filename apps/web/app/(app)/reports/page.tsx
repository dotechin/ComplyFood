'use client';

import { useEffect, useState } from 'react';
import { AuditTable } from '@complyfood/ui';
import type { AuditEvent } from '@complyfood/shared';
import { apiGet } from '../../lib/api';

export default function ReportsPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ totalLogs: number; totalOverrides: number } | null>(
    null,
  );

  useEffect(() => {
    Promise.all([apiGet<AuditEvent[]>('/audit'), apiGet<any>('/reports/summary')])
      .then(([events, rep]) => {
        setAuditEvents(events);
        setSummary({ totalLogs: rep.totalLogs, totalOverrides: rep.totalOverrides });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/export/csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance-report.csv';
    a.click();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <button
          onClick={handleExportCsv}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Export CSV
        </button>
      </div>
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
        </div>
      )}
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
