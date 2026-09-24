'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogStatus, LogType, UserRole, type LogEntry, type User } from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';

const TYPE_LABELS: Record<LogType, string> = {
  [LogType.TEMPERATURE]: 'Temperature',
  [LogType.CLEANING]: 'Cleaning',
  [LogType.RECEIVING]: 'Receiving',
  [LogType.CHECKLIST]: 'Checklist',
  [LogType.INCIDENT]: 'Incident',
};

const FIELD_TEMPLATES: Record<LogType, string> = {
  [LogType.TEMPERATURE]: '{\n  "item": "Refrigerator 1",\n  "value": "4°C"\n}',
  [LogType.CLEANING]: '{\n  "area": "Prep station",\n  "task": "Sanitize surfaces",\n  "completed": true\n}',
  [LogType.RECEIVING]: '{\n  "supplier": "",\n  "product": "",\n  "temperature": "",\n  "condition": "acceptable"\n}',
  [LogType.CHECKLIST]: '{\n  "checklist": "Opening",\n  "completed": true\n}',
  [LogType.INCIDENT]: '{\n  "description": "",\n  "action": "",\n  "severity": "low"\n}',
};

type InsertionMethod = 'manual' | 'camera';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseFields(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Fields JSON must be an object.');
  }
  return parsed as Record<string, unknown>;
}

function buildLogsPath(filters: { type: string; status: string; dateFrom: string; dateTo: string }) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const query = params.toString();
  return query ? `/logs?${query}` : '/logs';
}

function toIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<LogType>(LogType.TEMPERATURE);
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [insertionMethod, setInsertionMethod] = useState<InsertionMethod>('manual');
  const [createFields, setCreateFields] = useState(FIELD_TEMPLATES[LogType.TEMPERATURE]);
  const [exceptionReason, setExceptionReason] = useState<Record<string, string>>({});
  const [exceptionOccurredAt, setExceptionOccurredAt] = useState<Record<string, string>>({});
  const [exceptionMeasuredAt, setExceptionMeasuredAt] = useState<Record<string, string>>({});
  const [exceptionStatus, setExceptionStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filters = useMemo(
    () => ({ type: activeType, status: filterStatus, dateFrom, dateTo }),
    [activeType, dateFrom, dateTo, filterStatus],
  );

  const refreshLogs = async () => {
    const entries = await apiGet<LogEntry[]>(buildLogsPath(filters));
    setLogs(entries);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadLogs = async () => {
      try {
        setError('');
        const [entries, me] = await Promise.all([
          apiGet<LogEntry[]>(buildLogsPath(filters)),
          apiGet<User>('/users/me'),
        ]);
        if (active) {
          setLogs(entries);
          setUser(me);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load logs');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      active = false;
    };
  }, [filters]);

  const selectType = (type: LogType) => {
    setActiveType(type);
    setCreateFields(FIELD_TEMPLATES[type]);
    setError('');
    setMessage('');
  };

  const createLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await apiPost<LogEntry>('/logs', {
        type: activeType,
        fields: parseFields(createFields),
      });
      await refreshLogs();
      setMessage(`${TYPE_LABELS[activeType]} entry created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create log entry');
    } finally {
      setSaving(false);
    }
  };

  const confirmLog = async (id: string) => {
    try {
      setError('');
      setMessage('');
      await apiPatch<LogEntry>(`/logs/${id}/confirm`, {});
      await refreshLogs();
      setMessage('Log entry confirmed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm log entry');
    }
  };

  const applyException = async (logId: string) => {
    const reason = exceptionReason[logId]?.trim();
    if (!reason) {
      setError('Exception reason is required.');
      return;
    }

    try {
      setError('');
      setMessage('');
      await apiPatch(`/logs/${logId}/exception`, {
        reason,
        occurredAt: toIso(exceptionOccurredAt[logId] ?? ''),
        measuredAt: toIso(exceptionMeasuredAt[logId] ?? ''),
        unlockToStatus: (exceptionStatus[logId] as LogStatus | undefined) || undefined,
      });
      await refreshLogs();
      setMessage('Exception mode action applied and audited.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply exception');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Daily Logs</h1>
        <p className="text-sm text-muted-foreground">
          Record, review, and confirm daily log entries by category.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {message && <p className="mt-2 text-sm text-success">{message}</p>}
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Log categories">
          {Object.values(LogType).map((type) => {
            const isActive = type === activeType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
                aria-current={isActive ? 'page' : undefined}
                className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            );
          })}
        </nav>
      </div>

      <form
        onSubmit={createLog}
        className="space-y-4 rounded-lg border bg-card p-5 shadow-card"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">New {TYPE_LABELS[activeType].toLowerCase()} entry</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose how this entry is captured.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setInsertionMethod('manual')}
            aria-pressed={insertionMethod === 'manual'}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              insertionMethod === 'manual'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-foreground hover:bg-accent'
            }`}
          >
            Manual entry
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Camera acquisition is coming soon"
            className="flex cursor-not-allowed items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm font-medium text-muted-foreground opacity-70"
          >
            Phone camera
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Coming soon
            </span>
          </button>
        </div>

        <div>
          <label htmlFor="createFields" className="mb-1 block text-sm font-medium text-foreground">
            Fields
          </label>
          <textarea
            id="createFields"
            value={createFields}
            onChange={(e) => setCreateFields(e.target.value)}
            className="h-32 w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm text-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Provide the entry values as a JSON object. The template above is prefilled for {TYPE_LABELS[activeType].toLowerCase()} logs.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Create ${TYPE_LABELS[activeType].toLowerCase()} entry`}
        </button>
      </form>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-card md:grid-cols-3">
        <div>
          <label htmlFor="filterStatus" className="mb-1 block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All statuses</option>
            {Object.values(LogStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dateFrom" className="mb-1 block text-sm font-medium text-foreground">
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="mb-1 block text-sm font-medium text-foreground">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{TYPE_LABELS[log.type as LogType] ?? log.type}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()} · {log.status}
                    {log.isException ? ' · exception mode' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {log.isException && (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                      Exception
                    </span>
                  )}
                  {log.status === LogStatus.PENDING && (
                    <button
                      type="button"
                      onClick={() => void confirmLog(log.id)}
                      className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-accent"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>

              <dl className="mt-3 grid gap-2 rounded-md bg-muted p-3 text-sm">
                {Object.entries(log.fields ?? {}).map(([key, value]) => (
                  <div key={key} className="grid gap-1 md:grid-cols-[180px_1fr]">
                    <dt className="font-medium text-foreground">{key}</dt>
                    <dd className="text-muted-foreground">{formatValue(value)}</dd>
                  </div>
                ))}
                {Object.keys(log.fields ?? {}).length === 0 && <p className="text-muted-foreground">No fields recorded.</p>}
                {(log.occurredAt || log.measuredAt || log.exceptionReason) && (
                  <>
                    {log.occurredAt && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-foreground">Occurred at</dt>
                        <dd className="text-muted-foreground">{new Date(log.occurredAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {log.measuredAt && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-foreground">Measured at</dt>
                        <dd className="text-muted-foreground">{new Date(log.measuredAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {log.exceptionReason && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-foreground">Exception reason</dt>
                        <dd className="text-muted-foreground">{log.exceptionReason}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>

              {user?.role === UserRole.ADMIN && (
                <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Exception mode (Admin)</h3>
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                    <input
                      aria-label={`Exception reason for log ${log.id}`}
                      value={exceptionReason[log.id] ?? ''}
                      onChange={(e) => setExceptionReason((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                      placeholder="Mandatory reason"
                    />
                    <input
                      aria-label={`Exception occurred at for log ${log.id}`}
                      type="datetime-local"
                      value={exceptionOccurredAt[log.id] ?? ''}
                      onChange={(e) => setExceptionOccurredAt((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                    />
                    <input
                      aria-label={`Exception measured at for log ${log.id}`}
                      type="datetime-local"
                      value={exceptionMeasuredAt[log.id] ?? ''}
                      onChange={(e) => setExceptionMeasuredAt((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                    />
                    <select
                      aria-label={`Exception unlock status for log ${log.id}`}
                      value={exceptionStatus[log.id] ?? ''}
                      onChange={(e) => setExceptionStatus((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Keep current status</option>
                      {Object.values(LogStatus).map((status) => (
                        <option key={status} value={status}>
                          Unlock to {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void applyException(log.id)}
                      className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-white hover:bg-warning/90"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {logs.length === 0 && (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
              No {TYPE_LABELS[activeType].toLowerCase()} entries match the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
