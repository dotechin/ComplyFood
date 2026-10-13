'use client';

import React from 'react';
import type { LogEntry } from '@complyfood/shared';
import { LogStatus } from '@complyfood/shared';

interface LogTableProps {
  entries: LogEntry[];
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusStyles: Record<LogStatus, string> = {
  [LogStatus.PENDING]: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
  [LogStatus.CONFIRMED]: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
  [LogStatus.OVERRIDDEN]: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20',
};

export function LogTable({ entries, onConfirm, onCancel }: LogTableProps) {
  const showActions = Boolean(onConfirm || onCancel);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
            {showActions && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="transition-colors hover:bg-muted/40">
              <td className="px-5 py-3.5 font-medium capitalize text-foreground">{entry.type}</td>
              <td className="px-5 py-3.5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[entry.status]}`}
                >
                  {entry.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">{entry.submittedBy ?? '—'}</td>
              <td className="px-5 py-3.5 text-muted-foreground">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
              {showActions && (
                <td className="px-5 py-3.5 text-right">
                  {entry.status === LogStatus.PENDING && (
                    <div className="flex items-center justify-end gap-2">
                      {onConfirm && (
                        <button
                          onClick={() => onConfirm(entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Confirm
                        </button>
                      )}
                      {onCancel && (
                        <button
                          onClick={() => onCancel(entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:bg-danger/10 hover:text-danger"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-success" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">All caught up</p>
                  <p className="text-xs">No log entries need attention right now.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
