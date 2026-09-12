'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LogStatus,
  LogType,
  UserRole,
  type LogEntry,
  type TemperatureCaptureSuggestion,
  type User,
} from '@complyfood/shared';
import { apiGet, apiPatch, apiPost, apiUpload } from '../../../lib/api';

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
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createType, setCreateType] = useState<LogType>(LogType.TEMPERATURE);
  const [createFields, setCreateFields] = useState('{"item":"Fridge 1","value":"4°C"}');
  const [overrideFieldName, setOverrideFieldName] = useState<Record<string, string>>({});
  const [overrideNewValue, setOverrideNewValue] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [exceptionReason, setExceptionReason] = useState<Record<string, string>>({});
  const [exceptionOccurredAt, setExceptionOccurredAt] = useState<Record<string, string>>({});
  const [exceptionMeasuredAt, setExceptionMeasuredAt] = useState<Record<string, string>>({});
  const [exceptionStatus, setExceptionStatus] = useState<Record<string, string>>({});
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [captureItem, setCaptureItem] = useState('Fridge 1');
  const [captureSuggestion, setCaptureSuggestion] = useState<TemperatureCaptureSuggestion | null>(null);
  const [captureValue, setCaptureValue] = useState('');
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

  const createLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await apiPost<LogEntry>('/logs', {
        type: createType,
        fields: parseFields(createFields),
      });
      await refreshLogs();
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
      await apiPatch<LogEntry>(`/logs/${id}/confirm`, {});
      await refreshLogs();
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
    if (!(fieldName in (log.fields ?? {}))) {
      setError('Choose an existing field name to override.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const nextValue = overrideNewValue[log.id] ?? '';
      await apiPost('/overrides', {
        logEntryId: log.id,
        fieldName,
        originalValue: log.fields[fieldName],
        newValue: nextValue,
        reason,
      });
      await refreshLogs();
      setOverrideFieldName((prev) => ({ ...prev, [log.id]: '' }));
      setOverrideNewValue((prev) => ({ ...prev, [log.id]: '' }));
      setOverrideReason((prev) => ({ ...prev, [log.id]: '' }));
      setMessage('Override recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save override');
    }
  };

  const scanTemperature = async () => {
    if (!captureFile) {
      setError('Choose a capture image first.');
      return;
    }

    try {
      setError('');
      const form = new FormData();
      form.append('file', captureFile);
      const suggestion = await apiUpload<TemperatureCaptureSuggestion>('/logs/temperature/ocr-suggestion', form);
      setCaptureSuggestion(suggestion);
      if (suggestion.extractedValue) {
        setCaptureValue(suggestion.extractedValue);
      }
      setMessage('Temperature suggestion ready. Please review before saving.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process camera capture');
    }
  };

  const createTemperatureFromCapture = async () => {
    if (!captureConsent) {
      setError('You must confirm capture consent before processing.');
      return;
    }
    if (!captureFile) {
      setError('Choose a capture image first.');
      return;
    }
    if (!captureValue.trim()) {
      setError('A confirmed temperature value is required.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const created = await apiPost<LogEntry>('/logs', {
        type: LogType.TEMPERATURE,
        fields: {
          item: captureItem,
          value: captureValue,
          captureSource: 'phone-camera',
          ocrSuggestion: captureSuggestion?.extractedValue ?? null,
          ocrConfidence: captureSuggestion?.confidence ?? 0,
          ocrMethod: captureSuggestion?.source ?? 'none',
          confirmedByUser: true,
          retentionPolicy: 'image-retained-with-linked-document',
        },
      });

      const upload = new FormData();
      upload.append('file', captureFile);
      upload.append('linkedEntryId', created.id);
      await apiUpload('/documents', upload);

      await refreshLogs();
      setCaptureFile(null);
      setCaptureSuggestion(null);
      setCaptureValue('');
      setCaptureConsent(false);
      setMessage('Temperature log created with linked capture image.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save camera temperature log');
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

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Temperature from phone camera</h2>
        <p className="mb-3 text-sm text-gray-500">Capture image, review OCR suggestion, and confirm value before save.</p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setCaptureFile(e.target.files?.[0] ?? null)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={captureItem}
            onChange={(e) => setCaptureItem(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Item (e.g. Fridge 1)"
          />
          <input
            value={captureValue}
            onChange={(e) => setCaptureValue(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Confirmed temperature"
          />
          <button
            type="button"
            onClick={() => void scanTemperature()}
            className="rounded-md border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            Get suggestion
          </button>
          <button
            type="button"
            onClick={() => void createTemperatureFromCapture()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save capture log
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={captureConsent}
            onChange={(e) => setCaptureConsent(e.target.checked)}
          />
          I confirm image capture consent and retention for audit traceability.
        </label>
        {captureSuggestion && (
          <p className="mt-2 text-sm text-gray-600">
            Suggested: <span className="font-semibold">{captureSuggestion.extractedValue ?? 'no value detected'}</span> ·
            confidence {(captureSuggestion.confidence * 100).toFixed(0)}% · source {captureSuggestion.source}
          </p>
        )}
      </div>

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
                    {log.isException ? ' · exception mode' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {log.isException && (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                      Exception
                    </span>
                  )}
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
              </div>

              <dl className="mt-3 grid gap-2 rounded-md bg-gray-50 p-3 text-sm">
                {Object.entries(log.fields ?? {}).map(([key, value]) => (
                  <div key={key} className="grid gap-1 md:grid-cols-[180px_1fr]">
                    <dt className="font-medium text-gray-700">{key}</dt>
                    <dd className="text-gray-600">{formatValue(value)}</dd>
                  </div>
                ))}
                {Object.keys(log.fields ?? {}).length === 0 && <p className="text-gray-400">No fields recorded.</p>}
                {(log.occurredAt || log.measuredAt || log.exceptionReason) && (
                  <>
                    {log.occurredAt && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-gray-700">Occurred at</dt>
                        <dd className="text-gray-600">{new Date(log.occurredAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {log.measuredAt && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-gray-700">Measured at</dt>
                        <dd className="text-gray-600">{new Date(log.measuredAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {log.exceptionReason && (
                      <div className="grid gap-1 md:grid-cols-[180px_1fr]">
                        <dt className="font-medium text-gray-700">Exception reason</dt>
                        <dd className="text-gray-600">{log.exceptionReason}</dd>
                      </div>
                    )}
                  </>
                )}
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

              {user?.role === UserRole.ADMIN && (
                <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-orange-900">Exception mode (Admin)</h3>
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                    <input
                      value={exceptionReason[log.id] ?? ''}
                      onChange={(e) => setExceptionReason((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-orange-200 px-3 py-2 text-sm"
                      placeholder="Mandatory reason"
                    />
                    <input
                      type="datetime-local"
                      value={exceptionOccurredAt[log.id] ?? ''}
                      onChange={(e) =>
                        setExceptionOccurredAt((prev) => ({ ...prev, [log.id]: e.target.value }))
                      }
                      className="rounded-md border border-orange-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={exceptionMeasuredAt[log.id] ?? ''}
                      onChange={(e) =>
                        setExceptionMeasuredAt((prev) => ({ ...prev, [log.id]: e.target.value }))
                      }
                      className="rounded-md border border-orange-200 px-3 py-2 text-sm"
                    />
                    <select
                      value={exceptionStatus[log.id] ?? ''}
                      onChange={(e) => setExceptionStatus((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="rounded-md border border-orange-200 px-3 py-2 text-sm"
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
                      className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
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
