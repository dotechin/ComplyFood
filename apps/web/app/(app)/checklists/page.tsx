'use client';

import { useEffect, useState } from 'react';
import type { ChecklistTemplate } from '@complyfood/shared';
import { apiGet } from '../../lib/api';

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ChecklistTemplate[]>('/checklists')
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Checklist Templates</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800">{t.name}</h3>
              {t.type && <p className="text-xs text-gray-500 capitalize">{t.type}</p>}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-gray-400">No templates yet. Ask your admin to create one.</p>
          )}
        </div>
      )}
    </div>
  );
}
