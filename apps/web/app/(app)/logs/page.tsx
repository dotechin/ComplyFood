'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api';
import { TemperatureSheet } from './temperature-sheet';
import { KITCHEN_FRIDGE_5, TemperatureLog } from './temperature-log';

const TYPE_LABELS: Record<LogType, string> = {
  [LogType.TEMPERATURE]: 'Temperature',
  [LogType.CLEANING]: 'Cleaning',
  [LogType.RECEIVING]: 'Goods Receipt',
  [LogType.CHECKLIST]: 'Checklist',
  [LogType.INCIDENT]: 'Incident',
};

// Each tab maps to a sheet of the HACCP European standard package
// (EC 852/2004 & Codex Alimentarius General Principles of Food Hygiene).
const TYPE_STANDARDS: Record<LogType, string> = {
  [LogType.TEMPERATURE]: 'Temperature Log · CCP 2/3',
  [LogType.CLEANING]: 'Sheet 3 — Master Cleaning & Disinfection Schedule',
  [LogType.RECEIVING]: 'Sheet 1 — Goods Receipt prerequisite check',
  [LogType.CHECKLIST]: 'Prerequisite hygiene checklist',
  [LogType.INCIDENT]: 'Sheet 4 — Corrective Action & Deviation Log',
};

type FieldOption = { value: string; label: string };

type FieldDef = {
  name: string;
  label: string;
  displayLabel?: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  unit?: string;
  help?: string;
  full?: boolean;
};

const FIELD_DEFS: Record<LogType, FieldDef[]> = {
  [LogType.TEMPERATURE]: [
    { name: 'unit', label: 'Workstation / unit', displayLabel: 'Unit', type: 'text', placeholder: 'e.g. Bar fridge 1', required: true },
    {
      name: 'target',
      label: 'Target (critical limit)',
      displayLabel: 'Critical limit',
      type: 'select',
      options: [
        { value: 'Chilled ≤ 4°C', label: 'Chilled ≤ 4°C' },
        { value: 'Frozen ≤ -18°C', label: 'Frozen ≤ -18°C' },
        { value: 'Hot holding ≥ 63°C', label: 'Hot holding ≥ 63°C' },
        { value: 'Cooking core ≥ 75°C for 30s', label: 'Cooking ≥ 75°C for 30s' },
      ],
    },
    { name: 'temperature', label: 'Measured temperature', displayLabel: 'Temperature', type: 'number', unit: '°C', placeholder: '4', required: true },
    {
      name: 'corrective',
      label: 'Corrective action / comments',
      displayLabel: 'Corrective action / notes',
      type: 'textarea',
      placeholder: 'If outside the critical limit',
      full: true,
    },
  ],
  [LogType.CLEANING]: [
    { name: 'area', label: 'Area / item', type: 'text', placeholder: 'e.g. Pastry work surfaces', required: true },
    {
      name: 'frequency',
      label: 'Frequency',
      type: 'select',
      options: [
        { value: 'Daily', label: 'Daily (D)' },
        { value: 'Twice weekly', label: 'Twice weekly (TW)' },
        { value: 'Weekly', label: 'Weekly (W)' },
        { value: 'Monthly', label: 'Monthly (M)' },
      ],
    },
    {
      name: 'method',
      label: 'Cleaning method & chemicals',
      type: 'textarea',
      placeholder: 'e.g. Wash with hot detergent, rinse, apply EN 1276 sanitizer',
      full: true,
    },
    { name: 'responsibility', label: 'Responsibility', type: 'text', placeholder: 'e.g. Pastry chef' },
    { name: 'completed', label: 'Task completed', type: 'checkbox' },
  ],
  [LogType.RECEIVING]: [
    { name: 'supplier', label: 'Supplier', type: 'text', placeholder: 'e.g. Fresh Dairy Co.', required: true },
    { name: 'product', label: 'Product', type: 'text', placeholder: 'e.g. Pasteurised cream', required: true },
    { name: 'batch', label: 'Batch / lot number', type: 'text', placeholder: 'e.g. LOT-2291' },
    {
      name: 'temperature',
      label: 'Delivery temperature',
      type: 'number',
      unit: '°C',
      placeholder: '4',
      help: 'Chilled ≤ 5°C · Frozen ≤ -18°C',
    },
    {
      name: 'condition',
      label: 'Packaging condition',
      type: 'select',
      options: [
        { value: 'Acceptable', label: 'Acceptable' },
        { value: 'Damaged packaging', label: 'Damaged packaging' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
  ],
  [LogType.CHECKLIST]: [
    {
      name: 'checklist',
      label: 'Checklist',
      type: 'select',
      options: [
        { value: 'Opening', label: 'Opening' },
        { value: 'Mid-service', label: 'Mid-service' },
        { value: 'Closing', label: 'Closing' },
        { value: 'Weekly', label: 'Weekly' },
      ],
    },
    {
      name: 'shift',
      label: 'Shift',
      type: 'select',
      options: [
        { value: 'AM', label: 'AM' },
        { value: 'PM', label: 'PM' },
      ],
    },
    { name: 'completed', label: 'All items completed', type: 'checkbox' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional observations', full: true },
  ],
  [LogType.INCIDENT]: [
    {
      name: 'description',
      label: 'Description of deviation / problem',
      type: 'textarea',
      placeholder: 'e.g. Walk-in fridge reading 9°C at opening',
      required: true,
      full: true,
    },
    {
      name: 'correction',
      label: 'Immediate correction taken',
      type: 'textarea',
      placeholder: 'e.g. Moved stock to backup unit, called maintenance',
      full: true,
    },
    {
      name: 'disposition',
      label: 'Product disposition',
      type: 'select',
      options: [
        { value: 'Retained', label: 'Retained' },
        { value: 'Discarded', label: 'Discarded' },
        { value: 'N/A', label: 'Not applicable' },
      ],
    },
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    {
      name: 'preventative',
      label: 'Preventative action to avoid repeat',
      type: 'textarea',
      placeholder: 'e.g. Add hourly temperature checks during service',
      full: true,
    },
  ],
};

type FieldValues = Record<string, string | boolean>;

type InsertionMethod = 'manual' | 'camera';

function emptyValues(defs: FieldDef[]): FieldValues {
  const values: FieldValues = {};
  for (const def of defs) {
    if (def.type === 'checkbox') {
      values[def.name] = false;
    } else if (def.type === 'select') {
      values[def.name] = def.options?.[0]?.value ?? '';
    } else {
      values[def.name] = '';
    }
  }
  return values;
}

function buildFields(defs: FieldDef[], values: FieldValues) {
  const fields: Record<string, unknown> = {};
  for (const def of defs) {
    const raw = values[def.name];
    if (def.type === 'checkbox') {
      fields[def.label] = Boolean(raw);
      continue;
    }
    const str = typeof raw === 'string' ? raw.trim() : '';
    if (!str) {
      if (def.required) {
        throw new Error(`${def.label} is required.`);
      }
      continue;
    }
    fields[def.label] = def.type === 'number' && def.unit ? `${str} ${def.unit}` : str;
  }
  return fields;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'string' ? value : JSON.stringify(value);
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

function readingStamp(date = new Date()) {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${time} (${date.getHours() < 12 ? 'AM' : 'PM'})`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<LogType>(LogType.TEMPERATURE);
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [insertionMethod, setInsertionMethod] = useState<InsertionMethod>('manual');
  const [formValues, setFormValues] = useState<FieldValues>(() => emptyValues(FIELD_DEFS[LogType.TEMPERATURE]));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeDefs = FIELD_DEFS[activeType];

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

  const selectType = (type: LogType) => {
    setActiveType(type);
    setFormValues(emptyValues(FIELD_DEFS[type]));
    setError('');
    setMessage('');
  };

  const setFieldValue = (name: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const createLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const fields = buildFields(activeDefs, formValues);
      await apiPost<LogEntry>('/logs', {
        type: activeType,
        fields: activeType === LogType.TEMPERATURE ? { Reading: readingStamp(), ...fields } : fields,
      });
      await refreshLogs();
      setFormValues(emptyValues(activeDefs));
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

  const cancelLog = async (id: string) => {
    try {
      setError('');
      setMessage('');
      await apiDelete(`/logs/${id}`);
      await refreshLogs();
      setMessage('Pending entry cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel log entry');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Daily Logs</h1>
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

      {activeType === LogType.TEMPERATURE && (
        <TemperatureLog
          logs={logs}
          year={new Date().getFullYear()}
          loading={loading}
          onRecord={() => {
            setFormValues({ ...emptyValues(FIELD_DEFS[LogType.TEMPERATURE]), unit: KITCHEN_FRIDGE_5 });
            document.getElementById('field-temperature')?.focus();
          }}
        />
      )}

      <form onSubmit={createLog} className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {activeType === LogType.TEMPERATURE ? TYPE_STANDARDS[activeType] : `New ${TYPE_LABELS[activeType].toLowerCase()} entry`}
          </h2>
          {activeType !== LogType.TEMPERATURE && <p className="mt-1 text-sm text-muted-foreground">{TYPE_STANDARDS[activeType]}</p>}
          {activeType === LogType.TEMPERATURE && (
            <p className="mt-1 text-xs text-muted-foreground">
              Time recorded on save.
            </p>
          )}
        </div>

        {activeType !== LogType.TEMPERATURE && <div className="flex flex-wrap gap-3">
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
        </div>}

        <div className={`grid gap-3 ${activeType === LogType.TEMPERATURE ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {activeDefs.map((def) => {
            const fieldId = `field-${def.name}`;
            const isFull = def.full || def.type === 'textarea';

            if (def.type === 'checkbox') {
              return (
                <label
                  key={def.name}
                  htmlFor={fieldId}
                  className={`flex items-center gap-2 text-sm font-medium text-foreground ${isFull ? 'md:col-span-2' : ''}`}
                >
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={Boolean(formValues[def.name])}
                    onChange={(e) => setFieldValue(def.name, e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  {def.displayLabel ?? def.label}
                </label>
              );
            }

            return (
              <div key={def.name} className={isFull ? (activeType === LogType.TEMPERATURE ? 'md:col-span-3' : 'md:col-span-2') : ''}>
                <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-foreground">
                  {def.displayLabel ?? def.label}
                  {def.required && <span className="ml-0.5 text-danger">*</span>}
                </label>

                {def.type === 'textarea' && (
                  <textarea
                    id={fieldId}
                    value={String(formValues[def.name] ?? '')}
                    onChange={(e) => setFieldValue(def.name, e.target.value)}
                    placeholder={def.placeholder}
                    className={`${activeType === LogType.TEMPERATURE ? 'h-16' : 'h-24'} w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground`}
                  />
                )}

                {def.type === 'select' && (
                  <select
                    id={fieldId}
                    value={String(formValues[def.name] ?? '')}
                    onChange={(e) => setFieldValue(def.name, e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {def.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {(def.type === 'text' || def.type === 'number') && (
                  <div className="relative">
                    <input
                      id={fieldId}
                      type={def.type === 'number' ? 'number' : 'text'}
                      step={def.type === 'number' ? 'any' : undefined}
                      value={String(formValues[def.name] ?? '')}
                      onChange={(e) => setFieldValue(def.name, e.target.value)}
                      placeholder={def.placeholder}
                      className={`w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground ${
                        def.unit ? 'pr-12' : ''
                      }`}
                    />
                    {def.unit && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        {def.unit}
                      </span>
                    )}
                  </div>
                )}

                {def.help && <p className="mt-1 text-xs text-muted-foreground">{def.help}</p>}
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : activeType === LogType.TEMPERATURE ? 'Save reading' : `Create ${TYPE_LABELS[activeType].toLowerCase()} entry`}
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
            {Object.values(LogStatus)
              .filter((status) => status !== LogStatus.OVERRIDDEN)
              .map((status) => (
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
      ) : activeType === LogType.TEMPERATURE ? (
        <TemperatureSheet logs={logs} onConfirm={confirmLog} onCancel={cancelLog} />
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
                    <>
                      <button
                        type="button"
                        onClick={() => void confirmLog(log.id)}
                        className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-accent"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelLog(log.id)}
                        className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
                        Cancel
                      </button>
                    </>
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
