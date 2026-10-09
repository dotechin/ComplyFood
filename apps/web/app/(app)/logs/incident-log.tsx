'use client';

import { useState } from 'react';
import { LogStatus, LogType, type LogEntry } from '@complyfood/shared';
import { ActionButton, CheckIcon, CloseIcon, SaveIcon } from '../../../components/icon-button';

export const INCIDENT_FIELDS = {
  description: 'Description of deviation / problem',
  correction: 'Immediate correction taken',
  disposition: 'Product disposition',
  preventative: 'Preventative action to avoid repeat',
} as const;

export const DISPOSITION_OPTIONS = ['Retained', 'Reworked', 'Discarded', 'N/A'] as const;

const COLUMNS = [
  'Date / Time',
  'Deviation / Problem Detected',
  'Immediate Correction Taken',
  'Product Disposition',
  'Preventative Action',
  'Status',
];

const INPUT_CLASSES = 'w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : '—';
}

export type IncidentInput = Record<(typeof INCIDENT_FIELDS)[keyof typeof INCIDENT_FIELDS], string>;

export function IncidentLog({
  logs,
  saving,
  onCreate,
  onConfirm,
  onCancel,
}: {
  logs: LogEntry[];
  saving: boolean;
  onCreate: (fields: IncidentInput) => Promise<boolean>;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [description, setDescription] = useState('');
  const [correction, setCorrection] = useState('');
  const [disposition, setDisposition] = useState<string>('N/A');
  const [preventative, setPreventative] = useState('');
  const entries = logs
    .filter((log) => log.type === LogType.INCIDENT)
    .sort((a, b) => new Date(b.occurredAt ?? b.createdAt).getTime() - new Date(a.occurredAt ?? a.createdAt).getTime());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await onCreate({
      [INCIDENT_FIELDS.description]: description,
      [INCIDENT_FIELDS.correction]: correction,
      [INCIDENT_FIELDS.disposition]: disposition,
      [INCIDENT_FIELDS.preventative]: preventative,
    });
    if (created) {
      setDescription('');
      setCorrection('');
      setDisposition('N/A');
      setPreventative('');
    }
  };

  return (
    <section aria-labelledby="incident-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div>
        <h2 id="incident-heading" className="text-xl font-bold text-foreground">Corrective Action &amp; Deviation Log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record any deviation from a critical limit or hygiene standard, the immediate correction and how a repeat will be prevented.
        </p>
      </div>
      <form onSubmit={submit} className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" aria-label="Corrective Action & Deviation Log">
          <thead className="bg-sidebar text-white">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="border border-border px-3 py-2 text-center font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-accent/40 align-top">
              <td className="border border-border px-3 py-2 text-xs text-muted-foreground">Recorded on save</td>
              <td className="border border-border p-1.5">
                <textarea
                  required
                  aria-label={INCIDENT_FIELDS.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Walk-in fridge at 9°C"
                  className={`${INPUT_CLASSES} h-16`}
                />
              </td>
              <td className="border border-border p-1.5">
                <textarea
                  aria-label={INCIDENT_FIELDS.correction}
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="e.g. Stock moved to backup unit"
                  className={`${INPUT_CLASSES} h-16`}
                />
              </td>
              <td className="border border-border p-1.5">
                <select
                  aria-label={INCIDENT_FIELDS.disposition}
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  className={INPUT_CLASSES}
                >
                  {DISPOSITION_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option === 'N/A' ? 'Not applicable' : option}</option>
                  ))}
                </select>
              </td>
              <td className="border border-border p-1.5">
                <textarea
                  aria-label={INCIDENT_FIELDS.preventative}
                  value={preventative}
                  onChange={(e) => setPreventative(e.target.value)}
                  placeholder="e.g. Hourly checks during service"
                  className={`${INPUT_CLASSES} h-16`}
                />
              </td>
              <td className="border border-border px-3 py-2 text-center">
                <ActionButton type="submit" variant="primary" icon={<SaveIcon />} label="Add entry" busy={saving} busyLabel="Saving…" />
              </td>
            </tr>
            {entries.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="whitespace-nowrap border border-border px-3 py-2 tabular-nums">
                  {new Date(log.occurredAt ?? log.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="border border-border px-3 py-2 whitespace-pre-wrap">{text(log.fields?.[INCIDENT_FIELDS.description])}</td>
                <td className="border border-border px-3 py-2 whitespace-pre-wrap">{text(log.fields?.[INCIDENT_FIELDS.correction])}</td>
                <td className="border border-border px-3 py-2">{text(log.fields?.[INCIDENT_FIELDS.disposition])}</td>
                <td className="border border-border px-3 py-2 whitespace-pre-wrap">{text(log.fields?.[INCIDENT_FIELDS.preventative])}</td>
                <td className="border border-border px-3 py-2 text-center">
                  {log.status === LogStatus.PENDING ? (
                    <div className="flex justify-center gap-1.5">
                      <ActionButton icon={<CheckIcon />} label="Confirm" onClick={() => onConfirm(log.id)} />
                      <ActionButton icon={<CloseIcon />} label="Cancel entry" variant="danger" onClick={() => onCancel(log.id)} />
                    </div>
                  ) : (
                    <span className="capitalize text-muted-foreground">{log.status}</span>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-border px-3 py-6 text-center text-muted-foreground">
                  No deviations recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </form>
    </section>
  );
}
