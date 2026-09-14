'use client';

import { useEffect, useMemo, useState } from 'react';
import { DocumentCategory, type Document, type LogEntry } from '@complyfood/shared';
import { apiDownload, apiGet, apiUpload } from '../../../lib/api';

const CATEGORY_OPTIONS = [
  DocumentCategory.GENERAL,
  DocumentCategory.HACCP_MANUAL,
  DocumentCategory.STORE_LAYOUT,
  DocumentCategory.PERMIT,
  DocumentCategory.CERTIFICATE,
  DocumentCategory.PROCEDURE,
  DocumentCategory.INSPECTION_EVIDENCE,
] as const;

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.GENERAL]: 'General compliance',
  [DocumentCategory.HACCP_MANUAL]: 'HACCP manual',
  [DocumentCategory.STORE_LAYOUT]: 'Store layout',
  [DocumentCategory.PERMIT]: 'Permit',
  [DocumentCategory.CERTIFICATE]: 'Certificate',
  [DocumentCategory.PROCEDURE]: 'Procedure',
  [DocumentCategory.INSPECTION_EVIDENCE]: 'Inspection evidence',
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [linkedEntryId, setLinkedEntryId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL);
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('');
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
    formData.append('category', category);
    if (notes.trim()) {
      formData.append('notes', notes.trim());
    }
    if (linkedEntryId && category !== DocumentCategory.HACCP_MANUAL) {
      formData.append('linkedEntryId', linkedEntryId);
    }
    const document = await apiUpload<Document>('/documents', formData);
    setDocs((prev) => [document, ...prev]);
    setFile(null);
    setLinkedEntryId('');
    setCategory(DocumentCategory.GENERAL);
    setNotes('');
  };

  const filteredDocs = useMemo(
    () => docs.filter((doc) => (filterCategory ? doc.category === filterCategory : true)),
    [docs, filterCategory],
  );

  const groupedDocs = useMemo(
    () =>
      filteredDocs.reduce(
        (acc, doc) => {
          if (doc.category === DocumentCategory.HACCP_MANUAL) {
            acc.uploadedManuals.push(doc);
          } else if (doc.linkedEntryId) {
            acc.logLinkedDocs.push(doc);
          } else {
            acc.organizationDocs.push(doc);
          }
          return acc;
        },
        {
          uploadedManuals: [] as Document[],
          organizationDocs: [] as Document[],
          logLinkedDocs: [] as Document[],
        },
      ),
    [filteredDocs],
  );

  const logsById = useMemo(() => new Map(logs.map((entry) => [entry.id, entry])), [logs]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Documents</h1>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Manual files" value={groupedDocs.uploadedManuals.length} />
        <SummaryCard label="Business compliance docs" value={groupedDocs.organizationDocs.length} />
        <SummaryCard label="Log-linked docs" value={groupedDocs.logLinkedDocs.length} />
      </div>
      <form onSubmit={handleUpload} className="mb-6 grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1 text-sm text-gray-700">
          <span className="font-medium">File</span>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm text-gray-700">
          <span className="font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => {
              const nextCategory = e.target.value as DocumentCategory;
              setCategory(nextCategory);
              if (nextCategory === DocumentCategory.HACCP_MANUAL) {
                setLinkedEntryId('');
              }
            }}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-gray-700">
          <span className="font-medium">Linked log entry</span>
          <select
            value={linkedEntryId}
            onChange={(e) => setLinkedEntryId(e.target.value)}
            disabled={category === DocumentCategory.HACCP_MANUAL}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">
              {category === DocumentCategory.HACCP_MANUAL ? 'Manual files are organization-level only' : 'No linked log entry'}
            </option>
            {logs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.type} · {new Date(entry.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Upload document
        </button>
        <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
          <span className="font-medium">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Optional notes (e.g. fire permit 2026, signed layout)"
          />
        </label>
        <label className="space-y-1 text-sm text-gray-700">
          <span className="font-medium">Filter by category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | '')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}
      </form>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <DocumentTable
            title="Uploaded manuals"
            docs={groupedDocs.uploadedManuals}
            logsById={logsById}
          />
          <DocumentTable
            title="Business compliance documents"
            docs={groupedDocs.organizationDocs}
            logsById={logsById}
          />
          <DocumentTable title="Log-linked documents" docs={groupedDocs.logLinkedDocs} logsById={logsById} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DocumentTable({
  title,
  docs,
  logsById,
}: {
  title: string;
  docs: Document[];
  logsById: Map<string, LogEntry>;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Scope</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Notes</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Uploaded</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {docs.map((doc) => {
            const linkedLog = doc.linkedEntryId ? logsById.get(doc.linkedEntryId) : null;
            return (
              <tr key={doc.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{doc.name}</td>
                <td className="px-4 py-3 text-gray-500">{CATEGORY_LABELS[doc.category]}</td>
                <td className="px-4 py-3 text-gray-500">
                  {linkedLog ? `${linkedLog.type} log` : doc.linkedEntryId ? 'Linked log' : 'Organization'}
                </td>
                <td className="px-4 py-3 text-gray-500">{doc.notes || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
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
            );
          })}
          {docs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                No documents in this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
