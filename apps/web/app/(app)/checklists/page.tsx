'use client';

import { useEffect, useState } from 'react';
import { UserRole, type ChecklistTemplate, type LogEntry, type User } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error('Enter valid JSON before saving the checklist.');
  }
}

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
        fieldsConfig: parseJson<Record<string, unknown>>(fieldsConfig),
      });
      setTemplates((prev) => [template, ...prev]);
      setMessage('Checklist template created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create template');
    }
  };

  const generateTask = async (id: string) => {
    try {
      setError('');
      setMessage('');
      await apiPost<LogEntry>(`/checklists/${id}/generate`, {});
      setMessage('Checklist task created in daily logs.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create checklist task');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Checklist Templates</h1>
        <p className="text-sm text-muted-foreground">Create reusable checklist templates and turn them into daily tasks.</p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {message && <p className="mt-2 text-sm text-success">{message}</p>}
      </div>

      {user?.role === UserRole.ADMIN && (
        <form onSubmit={createTemplate} className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">New checklist template</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Checklist name"
            />
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Checklist type"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Save template
            </button>
          </div>
          <textarea
            value={fieldsConfig}
            onChange={(e) => setFieldsConfig(e.target.value)}
            className="mt-3 h-28 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border bg-card p-4 shadow-card">
              <h3 className="font-semibold text-foreground">{template.name}</h3>
              {template.type && <p className="text-xs capitalize text-muted-foreground">{template.type}</p>}
              <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(template.fieldsConfig, null, 2)}
              </pre>
              {user?.role === UserRole.ADMIN && (
                <button
                  type="button"
                  onClick={() => void generateTask(template.id)}
                  className="mt-3 rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-accent"
                >
                  Create daily task
                </button>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-muted-foreground">No templates yet. Ask your admin to create one.</p>
          )}
        </div>
      )}
    </div>
  );
}
