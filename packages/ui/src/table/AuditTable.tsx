'use client';

import React from 'react';
import type { AuditEvent } from '@complyfood/shared';

interface AuditTableProps {
  events: AuditEvent[];
}

export function AuditTable({ events }: AuditTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Entity</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-4 py-3 text-gray-600">
                {new Date(event.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-800">{event.action}</td>
              <td className="px-4 py-3 text-gray-600">
                {event.entityType}
                {event.entityId ? ` / ${event.entityId.slice(0, 8)}…` : ''}
              </td>
              <td className="px-4 py-3 text-gray-600">{event.userId ?? '—'}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No audit events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
