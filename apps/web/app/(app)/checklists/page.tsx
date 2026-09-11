'use client';

import { useEffect, useState } from 'react';
import { UserRole, type ChecklistTemplate, type LogEntry, type User } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Opening checklist');
  const [type, setType] = useState('opening');
  const [fieldsConfig, setFieldsConfig] = useState('{"items":["Wash hands","Check fridge temperature","Review cleaning supplies"]}');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiGet<User>('/users/me'), apiGet<ChecklistTemplate[]>('/checklists')])
      .then(([me, data]) => {
        setUser(me);
        setTemplates(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      const template = await apiPost<ChecklistTemplate>('/checklists', {
        name,
        type,
        fieldsConfig: JSON.parse(fieldsConfig),
      });
      setTemplates((prev) => [template, ...prev]);
      setMessage('Checklist template created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create template');
    }
  };

  const generateTask = async (id: string) => {
    try {
      await apiPost<LogEntry>(`/checklists/${id}/generate`, {});
      setMessage('Checklist task created in daily logs.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create checklist task');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Checklist Templates</h1>
        <p className="text-sm text-gray-500">Create reusable checklist templates and turn them into daily tasks.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      {user?.role === UserRole.ADMIN && (
        <form onSubmit={createTemplate} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">New checklist template</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Checklist name"
            />
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Checklist type"
            />
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save template
            </button>
          </div>
          <textarea
            value={fieldsConfig}
            onChange={(e) => setFieldsConfig(e.target.value)}
            className="mt-3 h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800">{template.name}</h3>
              {template.type && <p className="text-xs capitalize text-gray-500">{template.type}</p>}
              <pre className="mt-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                {JSON.stringify(template.fieldsConfig, null, 2)}
              </pre>
              <button
                type="button"
                onClick={() => void generateTask(template.id)}
                className="mt-3 rounded-md border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                Create daily task
              </button>
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
