'use client';

import React from 'react';
import type { AuditEvent } from '@complyfood/shared';

interface AuditTableProps {
  events: AuditEvent[];
}

export function AuditTable({ events }: AuditTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((event) => (
            <tr key={event.id} className="transition-colors hover:bg-muted/40">
              <td className="px-5 py-3.5 text-muted-foreground">
                {new Date(event.createdAt).toLocaleString()}
              </td>
              <td className="px-5 py-3.5">
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">{event.action}</span>
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">
                {event.entityType}
                {event.entityId ? ` / ${event.entityId.slice(0, 8)}…` : ''}
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">{event.userId ?? '—'}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                No audit events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
