'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseValue(value: string) {
  if (!value.trim()) return '';
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildLogsPath(filters: {
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const query = params.toString();
  return query ? `/logs?${query}` : '/logs';
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createType, setCreateType] = useState<LogType>(LogType.TEMPERATURE);
  const [createFields, setCreateFields] = useState('{"item":"Fridge 1","value":"4°C"}');
  const [overrideFieldName, setOverrideFieldName] = useState<Record<string, string>>({});
  const [overrideNewValue, setOverrideNewValue] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filters = useMemo(
    () => ({
      type: filterType,
      status: filterStatus,
      dateFrom,
      dateTo,
    }),
    [dateFrom, dateTo, filterStatus, filterType],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadLogs = async () => {
      try {
        setError('');
        const entries = await apiGet<LogEntry[]>(buildLogsPath(filters));
        if (active) {
          setLogs(entries);
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

  const createLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const created = await apiPost<LogEntry>('/logs', {
        type: createType,
        fields: parseValue(createFields),
      });
      setLogs((prev) => [created, ...prev]);
      setMessage('Log entry created.');
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
      const confirmed = await apiPatch<LogEntry>(`/logs/${id}/confirm`, {});
      setLogs((prev) => prev.map((entry) => (entry.id === id ? confirmed : entry)));
      setMessage('Log entry confirmed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm log entry');
    }
  };

  const submitOverride = async (log: LogEntry) => {
    const fieldName = overrideFieldName[log.id]?.trim();
    const reason = overrideReason[log.id]?.trim();
    if (!fieldName || !reason) {
      setError('Override field and reason are required.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const nextValue = parseValue(overrideNewValue[log.id] ?? '');
      await apiPost('/overrides', {
        logEntryId: log.id,
        fieldName,
        originalValue: log.fields[fieldName],
        newValue: nextValue,
        reason,
      });
      setLogs((prev) =>
        prev.map((entry) =>
          entry.id === log.id
            ? {
                ...entry,
                status: LogStatus.OVERRIDDEN,
                fields: { ...entry.fields, [fieldName]: nextValue },
              }
            : entry,
        ),
      );
      setOverrideFieldName((prev) => ({ ...prev, [log.id]: '' }));
      setOverrideNewValue((prev) => ({ ...prev, [log.id]: '' }));
      setOverrideReason((prev) => ({ ...prev, [log.id]: '' }));
      setMessage('Override recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save override');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Daily Logs</h1>
        <p className="text-sm text-gray-500">Create, filter, review, confirm, and override daily log entries.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      <form onSubmit={createLog} className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[0.9fr_1.6fr_auto]">
        <div>
          <label htmlFor="createType" className="mb-1 block text-sm font-medium text-gray-700">
            Log type
          </label>
          <select
            id="createType"
            value={createType}
            onChange={(e) => setCreateType(e.target.value as LogType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.values(LogType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="createFields" className="mb-1 block text-sm font-medium text-gray-700">
            Fields JSON
          </label>
          <textarea
            id="createFields"
            value={createFields}
            onChange={(e) => setCreateFields(e.target.value)}
            className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 md:self-end"
        >
          {saving ? 'Saving…' : 'Create log'}
        </button>
      </form>

      <div className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-4">
        <div>
          <label htmlFor="filterType" className="mb-1 block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {Object.values(LogType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterStatus" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          <label htmlFor="dateFrom" className="mb-1 block text-sm font-medium text-gray-700">
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="mb-1 block text-sm font-medium text-gray-700">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{log.type}</h2>
                  <p className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()} · {log.status}
                  </p>
                </div>
                {log.status === LogStatus.PENDING && (
                  <button
                    type="button"
                    onClick={() => void confirmLog(log.id)}
                    className="rounded-md border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    Confirm
                  </button>
                )}
              </div>

              <dl className="mt-3 grid gap-2 rounded-md bg-gray-50 p-3 text-sm">
                {Object.entries(log.fields ?? {}).map(([key, value]) => (
                  <div key={key} className="grid gap-1 md:grid-cols-[180px_1fr]">
                    <dt className="font-medium text-gray-700">{key}</dt>
                    <dd className="text-gray-600">{formatValue(value)}</dd>
                  </div>
                ))}
                {Object.keys(log.fields ?? {}).length === 0 && <p className="text-gray-400">No fields recorded.</p>}
              </dl>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
                <div className="space-y-1">
                  <label htmlFor={`overrideFieldName-${log.id}`} className="block text-sm font-medium text-gray-700">
                    Field name
                  </label>
                  <input
                    id={`overrideFieldName-${log.id}`}
                    value={overrideFieldName[log.id] ?? ''}
                    onChange={(e) =>
                      setOverrideFieldName((prev) => ({ ...prev, [log.id]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Field name"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`overrideNewValue-${log.id}`} className="block text-sm font-medium text-gray-700">
                    New value
                  </label>
                  <input
                    id={`overrideNewValue-${log.id}`}
                    value={overrideNewValue[log.id] ?? ''}
                    onChange={(e) =>
                      setOverrideNewValue((prev) => ({ ...prev, [log.id]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="New value or JSON"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`overrideReason-${log.id}`} className="block text-sm font-medium text-gray-700">
                    Override reason
                  </label>
                  <input
                    id={`overrideReason-${log.id}`}
                    value={overrideReason[log.id] ?? ''}
                    onChange={(e) =>
                      setOverrideReason((prev) => ({ ...prev, [log.id]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Override reason"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submitOverride(log)}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black md:self-end"
                >
                  Override
                </button>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
              No log entries match the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
