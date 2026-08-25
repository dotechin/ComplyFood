'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@complyfood/shared';
import { apiGet, apiPost } from '../../lib/api';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    apiGet<Document[]>('/documents')
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  const handleRequestUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    const result = await apiPost<{ uploadUrl: string; document: Document }>('/documents/upload-url', {
      fileName,
    });
    setDocs((prev) => [result.document, ...prev]);
    setFileName('');
    alert(`Upload URL ready: ${result.uploadUrl}`);
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Documents</h1>
      <form onSubmit={handleRequestUpload} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="File name (e.g. certificate.pdf)"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Get Upload URL
        </button>
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
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
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
