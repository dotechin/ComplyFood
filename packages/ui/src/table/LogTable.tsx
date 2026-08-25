'use client';

import React from 'react';
import type { LogEntry } from '@complyfood/shared';
import { LogStatus } from '@complyfood/shared';

interface LogTableProps {
  entries: LogEntry[];
  onConfirm?: (id: string) => void;
}

const statusColors: Record<LogStatus, string> = {
  [LogStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [LogStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [LogStatus.OVERRIDDEN]: 'bg-orange-100 text-orange-800',
};

export function LogTable({ entries, onConfirm }: LogTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Submitted</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            {onConfirm && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-3 font-medium capitalize text-gray-800">{entry.type}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status]}`}
                >
                  {entry.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{entry.submittedBy ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
              {onConfirm && (
                <td className="px-4 py-3 text-right">
                  {entry.status === LogStatus.PENDING && (
                    <button
                      onClick={() => onConfirm(entry.id)}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No log entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
