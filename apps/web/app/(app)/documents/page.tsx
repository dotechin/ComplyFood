'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentCategory, UserRole, type Document, type DocumentExtraction, type DocumentMetadata, type LogEntry, type User } from '@complyfood/shared';
import { apiDelete, apiDownload, apiGet, apiUpload } from '../../../lib/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [linkedEntryId, setLinkedEntryId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL);
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('');
  const [error, setError] = useState('');
  const [readingDoc, setReadingDoc] = useState<Document | null>(null);
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [readError, setReadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const readRequestRef = useRef(0);
  const readingIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([apiGet<User>('/users/me'), apiGet<Document[]>('/documents'), apiGet<LogEntry[]>('/logs')])
      .then(([me, documents, entries]) => {
        setUser(me);
        setDocs(documents);
        setLogs(entries);
      })
      .catch(() => setError('Could not load documents. Please reload to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (doc: Document) => {
    const requestId = ++readRequestRef.current;
    readingIdRef.current = doc.id;
    setReadingDoc(doc);
    setExtraction(null);
    setReadError('');
    setExtracting(true);
    try {
      const result = await apiGet<DocumentExtraction>(`/documents/${doc.id}/extract`);
      if (requestId !== readRequestRef.current) return;
      setExtraction(result);
      setDocs((prev) => prev.map((item) => item.id === doc.id
        ? { ...item, metadata: result.metadata, processingStatus: result.processingStatus }
        : item));
    } catch {
      if (requestId !== readRequestRef.current) return;
      setReadError('Could not extract this PDF. It may be damaged or encrypted. Please try again or download the file.');
    } finally {
      if (requestId === readRequestRef.current) setExtracting(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!user || user.orgId !== doc.orgId || (user.role !== UserRole.ADMIN && user.id !== doc.uploadedBy)) return;
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    setError('');
    try {
      await apiDelete<void>(`/documents/${doc.id}`);
      setDocs((prev) => prev.filter((item) => item.id !== doc.id));
      if (readingIdRef.current === doc.id) {
        ++readRequestRef.current;
        readingIdRef.current = null;
        setReadingDoc(null);
        setExtraction(null);
        setReadError('');
        setExtracting(false);
      }
    } catch {
      setError(`Could not delete "${doc.name}". Please try again.`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please choose at least one file to upload.');
      return;
    }
    setError('');
    setUploadMessage('');
    setUploading(true);
    const uploaded: Document[] = [];
    const failed: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (linkedEntryId && category !== DocumentCategory.HACCP_MANUAL) {
        formData.append('linkedEntryId', linkedEntryId);
      }
      try {
        uploaded.push(await apiUpload<Document>('/documents', formData));
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);
    setDocs((prev) => [...uploaded.reverse(), ...prev]);
    if (failed.length > 0) {
      setError(`Failed to upload: ${failed.join(', ')}`);
    }
    if (uploaded.length > 0) {
      setUploadMessage(`${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded.`);
    }
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
  const uploadCategoryOptions = useMemo<readonly DocumentCategory[]>(
    () =>
      user?.role === UserRole.ADMIN
        ? CATEGORY_OPTIONS
        : CATEGORY_OPTIONS.filter((option) => option !== DocumentCategory.HACCP_MANUAL),
    [user],
  );

  useEffect(() => {
    if (!uploadCategoryOptions.includes(category)) {
      setCategory(uploadCategoryOptions[0] ?? DocumentCategory.GENERAL);
      setLinkedEntryId('');
    }
  }, [category, uploadCategoryOptions]);

  const documentActions = { user, deletingId, onRead: handleRead, onDelete: handleDelete };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Documents</h1>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Manual files" value={groupedDocs.uploadedManuals.length} />
        <SummaryCard label="Business compliance docs" value={groupedDocs.organizationDocs.length} />
        <SummaryCard label="Log-linked docs" value={groupedDocs.logLinkedDocs.length} />
      </div>
      <form onSubmit={handleUpload} className="mb-6 grid gap-3 rounded-lg border bg-card p-4 shadow-card md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1 text-sm text-foreground">
          <span className="font-medium">Files</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          <span className="block text-xs text-muted-foreground">
            {files.length > 0
              ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
              : 'Select one or more files (Ctrl/Cmd or Shift to multi-select)'} · Max 20 MB per file.
          </span>
        </label>
        <label className="space-y-1 text-sm text-foreground">
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
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            {uploadCategoryOptions.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span className="font-medium">Linked log entry</span>
          <select
            value={linkedEntryId}
            onChange={(e) => setLinkedEntryId(e.target.value)}
            disabled={category === DocumentCategory.HACCP_MANUAL}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
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
          disabled={uploading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : files.length > 1 ? `Upload ${files.length} documents` : 'Upload document'}
        </button>
        {uploadMessage && (
          <p role="status" className="text-sm text-primary md:col-span-3">
            {uploadMessage}
          </p>
        )}
        <label className="space-y-1 text-sm text-foreground md:col-span-2">
          <span className="font-medium">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Optional notes (e.g. fire permit 2026, signed layout)"
          />
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span className="font-medium">Filter by category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | '')}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-danger md:col-span-3">{error}</p>}
      </form>
      {readingDoc && (
        <section aria-label="PDF reader" className="mb-6 space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">{readingDoc.name}</h2>
            <button type="button" className="text-sm text-primary" onClick={() => {
              ++readRequestRef.current;
              readingIdRef.current = null;
              setReadingDoc(null);
              setExtraction(null);
              setReadError('');
              setExtracting(false);
            }}>Close reader</button>
          </div>
          {extracting && <p role="status">Extracting PDF text…</p>}
          {readError && <p role="alert" className="text-danger">{readError}</p>}
          {extraction && (
            <>
              <p className="text-sm text-muted-foreground">Processing: {extraction.processingStatus}</p>
              <DocumentMetadataDetails metadata={extraction.metadata} />
              {!extraction.supported ? (
                <p>Text extraction is not supported for this document. Download it to read it.</p>
              ) : !extraction.text?.trim() && !extraction.pages.some((page) => page.text.trim()) ? (
                <p>No readable text was found. This PDF may be scanned or image-only; download it to view the pages. OCR is not available here.</p>
              ) : extraction.pages.length > 0 ? (
                extraction.pages.map((page) => (
                  <section key={page.pageNumber} className="space-y-2 border-t pt-3">
                    <h3 className="font-medium">Page {page.pageNumber}</h3>
                    <p className="whitespace-pre-wrap break-words text-sm">{page.text.trim() ? page.text : 'No readable text on this page; it may contain only images.'}</p>
                  </section>
                ))
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{extraction.text}</p>
              )}
            </>
          )}
        </section>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <DocumentTable
            title="Uploaded manuals"
            docs={groupedDocs.uploadedManuals}
            logsById={logsById}
            {...documentActions}
          />
          <DocumentTable
            title="Business compliance documents"
            docs={groupedDocs.organizationDocs}
            logsById={logsById}
            {...documentActions}
          />
          <DocumentTable title="Log-linked documents" docs={groupedDocs.logLinkedDocs} logsById={logsById} {...documentActions} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DocumentTable({
  title,
  docs,
  logsById,
  user,
  deletingId,
  onRead,
  onDelete,
}: {
  title: string;
  docs: Document[];
  logsById: Map<string, LogEntry>;
  user: User | null;
  deletingId: string | null;
  onRead: (doc: Document) => Promise<void>;
  onDelete: (doc: Document) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scope</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {docs.map((doc) => {
            const linkedLog = doc.linkedEntryId ? logsById.get(doc.linkedEntryId) : null;
            return (
              <tr key={doc.id}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {doc.name}
                  {(doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name)) && (
                    <div className="mt-1 text-xs font-normal text-muted-foreground">
                      <p>Processing: {doc.processingStatus}</p>
                      <DocumentMetadataDetails metadata={doc.metadata} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABELS[doc.category]}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {linkedLog ? `${linkedLog.type} log` : doc.linkedEntryId ? 'Linked log' : 'Organization'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{doc.notes || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.name)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Download
                  </button>
                  {(doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name)) && (
                    <button
                      type="button"
                      disabled={deletingId === doc.id}
                      onClick={() => void onRead(doc)}
                      className="ml-3 text-sm text-primary hover:text-primary/80 disabled:opacity-60"
                    >
                      Read PDF
                    </button>
                  )}
                  {user && user.orgId === doc.orgId && (user.role === UserRole.ADMIN || user.id === doc.uploadedBy) && (
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => void onDelete(doc)}
                      className="ml-3 text-sm text-danger disabled:opacity-60"
                    >
                      {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {docs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                No documents in this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentMetadataDetails({ metadata }: { metadata: DocumentMetadata | null }) {
  if (!metadata) return null;
  return (
    <dl className="text-sm text-muted-foreground">
      <div><dt className="inline">Pages: </dt><dd className="inline">{metadata.pageCount}</dd></div>
      {metadata.title && <div><dt className="inline">Title: </dt><dd className="inline">{metadata.title}</dd></div>}
      {metadata.author && <div><dt className="inline">Author: </dt><dd className="inline">{metadata.author}</dd></div>}
      {metadata.creationDate && <div><dt className="inline">Created: </dt><dd className="inline">{metadata.creationDate}</dd></div>}
    </dl>
  );
}
