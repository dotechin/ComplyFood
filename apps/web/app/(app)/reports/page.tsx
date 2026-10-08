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
import { ActionButton, FileIcon, TableIcon } from '../../../components/icon-button';

const FILTER_CLASSES = 'h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground';

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
      .then((resolvedUser) => {
        setUser(resolvedUser);
        return resolvedUser;
      })
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
        const canViewResolvedAudit =
          user.role === UserRole.ADMIN || user.role === UserRole.AUDITOR;
        if (canViewResolvedAudit) {
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Compliance Reports</h1>
        <p className="text-sm text-muted-foreground">Filter compliance data, incident trends, and exception activity.</p>
      </div>
      <div
        role="group"
        aria-label="Compliance report filters"
        className="mb-6 grid grid-cols-[repeat(4,minmax(0,1fr))_auto_auto] items-center gap-2 rounded-lg border bg-card p-3 shadow-card"
      >
        <select
          aria-label="Log type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={FILTER_CLASSES}
        >
          <option value="">All log types</option>
          {Object.values(LogType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={FILTER_CLASSES}
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
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={FILTER_CLASSES}
        />
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={FILTER_CLASSES}
        />
        <ActionButton
          icon={<TableIcon />}
          label="Export CSV"
          variant="primary"
          onClick={() => void apiDownload(`/reports/export/csv${query}`, 'compliance-report.csv')}
        />
        <ActionButton
          icon={<FileIcon />}
          label="Export PDF"
          onClick={() => void apiDownload(`/reports/export/pdf${query}`, 'compliance-report.pdf')}
        />
      </div>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {summary && (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Log Entries" value={summary.totalLogs} tone="text-foreground" />
          <StatCard label="Pending" value={summary.byStatus.pending ?? 0} tone="text-yellow-600" />
          <StatCard label="Confirmed" value={summary.byStatus.confirmed ?? 0} tone="text-green-600" />
          <StatCard label="Exception Logs" value={summary.exceptionSummary.total ?? 0} tone="text-orange-600" />
        </div>
      )}
      {summary && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-card lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Log types</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} className="rounded-md bg-muted p-3">
                  <p className="text-sm capitalize text-muted-foreground">{type}</p>
                  <p className="text-xl font-semibold text-foreground">{count}</p>
                </div>
              ))}
              {Object.keys(summary.byType).length === 0 && <p className="text-sm text-gray-400">No data.</p>}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Incident summary</h2>
            <dl className="space-y-2 text-sm text-muted-foreground">
              <SummaryRow label="Total incidents" value={summary.incidentSummary.total} />
              <SummaryRow label="Pending incidents" value={summary.incidentSummary.pending} />
            </dl>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : canViewAudit ? (
        <div className="rounded-lg border bg-card shadow-card">
          <AuditTable events={auditEvents} />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Audit history is available to admins and auditors.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
