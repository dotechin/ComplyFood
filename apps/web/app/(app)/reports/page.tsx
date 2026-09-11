'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuditTable } from '@complyfood/ui';
import {
  LogStatus,
  LogType,
  UserRole,
  type AuditEvent,
  type ReportSummary,
  type User,
} from '@complyfood/shared';
import { apiDownload, apiGet } from '../../../lib/api';

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');

  const canViewAudit = user?.role === UserRole.ADMIN || user?.role === UserRole.AUDITOR;
  const query = useMemo(
    () =>
      buildQuery({
        type: typeFilter,
        status: statusFilter,
        dateFrom,
        dateTo,
      }),
    [dateFrom, dateTo, statusFilter, typeFilter],
  );

  useEffect(() => {
    apiGet<User>('/users/me')
      .then(setUser)
      .catch((err: Error) => {
        setSummary(null);
        setAuditEvents([]);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSummary(null);
    setAuditEvents([]);
    const load = async () => {
      try {
        const reportSummary = await apiGet<ReportSummary>(`/reports/summary${query}`);
        setSummary(reportSummary);
        if (canViewAudit) {
          setAuditEvents(await apiGet<AuditEvent[]>(`/audit${query}`));
        } else {
          setAuditEvents([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load reports');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [canViewAudit, query, user]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
          <p className="text-sm text-gray-500">Filter compliance data, incident trends, and override activity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.values(LogStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
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
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Log Entries" value={summary.totalLogs} tone="text-gray-900" />
          <StatCard label="Total Overrides" value={summary.totalOverrides} tone="text-orange-600" />
          <StatCard label="Pending" value={summary.byStatus.pending ?? 0} tone="text-yellow-600" />
          <StatCard label="Confirmed" value={summary.byStatus.confirmed ?? 0} tone="text-green-600" />
        </div>
      )}
      {summary && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Log types</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm capitalize text-gray-500">{type}</p>
                  <p className="text-xl font-semibold text-gray-900">{count}</p>
                </div>
              ))}
              {Object.keys(summary.byType).length === 0 && <p className="text-sm text-gray-400">No data.</p>}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Incident summary</h2>
            <dl className="space-y-2 text-sm text-gray-600">
              <SummaryRow label="Total incidents" value={summary.incidentSummary.total} />
              <SummaryRow label="Pending incidents" value={summary.incidentSummary.pending} />
              <SummaryRow label="Overridden incidents" value={summary.incidentSummary.overridden} />
            </dl>
          </div>
        </div>
      )}
      {summary && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <SummaryListCard title="Overrides by field" values={summary.overridesByField} />
          <SummaryListCard title="Overrides by log type" values={summary.overridesByType} />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : canViewAudit ? (
        <div className="rounded-lg border bg-white shadow-sm">
          <AuditTable events={auditEvents} />
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 shadow-sm">
          Audit history is available to admins and auditors.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function SummaryListCard({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2 text-sm text-gray-600">
        {entries.length === 0 ? (
          <p className="text-gray-400">No data.</p>
        ) : (
          entries.map(([key, value]) => <SummaryRow key={key} label={key} value={value} />)
        )}
      </div>
    </div>
  );
}
