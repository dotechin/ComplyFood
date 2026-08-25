'use client';

import { useEffect, useState } from 'react';
import { LogTable } from '@complyfood/ui';
import type { LogEntry } from '@complyfood/shared';
import { apiGet, apiPatch } from '../../../lib/api';

export default function DashboardPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LogEntry[]>('/logs?status=pending')
      .then((data) => setEntries(data.filter((e) => e.status === 'pending')))
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (id: string) => {
    await apiPatch(`/logs/${id}/confirm`, {});
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Today's Tasks</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <LogTable entries={entries} onConfirm={handleConfirm} />
      )}
    </div>
  );
}
