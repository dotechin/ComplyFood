'use client';

import { useEffect, useState } from 'react';
import type { Document, LogEntry } from '@complyfood/shared';
import { apiDownload, apiGet, apiUpload } from '../../../lib/api';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [linkedEntryId, setLinkedEntryId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiGet<Document[]>('/documents'), apiGet<LogEntry[]>('/logs')])
      .then(([documents, entries]) => {
        setDocs(documents);
        setLogs(entries);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    if (linkedEntryId) {
      formData.append('linkedEntryId', linkedEntryId);
    }
    const document = await apiUpload<Document>('/documents', formData);
    setDocs((prev) => [document, ...prev]);
    setFile(null);
    setLinkedEntryId('');
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Documents</h1>
      <form onSubmit={handleUpload} className="mb-6 grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={linkedEntryId}
          onChange={(e) => setLinkedEntryId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">No linked log entry</option>
          {logs.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.type} · {new Date(entry.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Upload document
        </button>
        {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}
      </form>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Linked Entry</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Uploaded</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{doc.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {doc.linkedEntryId ? doc.linkedEntryId.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.name)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No documents yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
