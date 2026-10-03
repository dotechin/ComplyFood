'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Document, DocumentCategory, LogEntry, User } from '@complyfood/shared';
import { apiDelete, apiDownload, apiFetchBlob, apiGet, apiUpload } from '../../../lib/api';
import { createDocumentLibrary, type DocumentLibrary, type LibraryState } from '../../../lib/documents/library';
import { createPreviewController, type PreviewController, type PreviewState } from '../../../lib/documents/preview';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, canDeleteDocument } from '../../../lib/documents/rules';
import { ActionButton, RefreshIcon, UploadIcon } from './actions';
import { DocumentList } from './document-list';
import { PreviewPanel } from './preview-panel';
import { UploadPanel } from './upload-panel';

/** Minimum age of the list before a window focus/visibility change triggers a refetch. */
const FOCUS_REFRESH_MIN_AGE_MS = 5_000;
const INITIAL_LIBRARY: LibraryState = { docs: [], status: 'loading', refreshing: false, error: '', lastLoadedAt: null };
const IDLE_PREVIEW: PreviewState = { status: 'idle' };
const noopSubscribe = () => () => undefined;

function useStoreState<S>(store: { getState: () => S; subscribe: (listener: () => void) => () => void } | null, initial: S) {
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getState : () => initial,
    () => initial,
  );
}

export default function DocumentsPage() {
  const [library, setLibrary] = useState<DocumentLibrary | null>(null);
  const [preview, setPreview] = useState<PreviewController | null>(null);
  const libraryState = useStoreState(library, INITIAL_LIBRARY);
  const previewState = useStoreState(preview, IDLE_PREVIEW);
  const [user, setUser] = useState<User | null>(null);
  const [userError, setUserError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsError, setLogsError] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const lib = createDocumentLibrary({
      list: (signal) => apiGet<Document[]>('/documents', { signal, cache: 'no-store' }),
      upload: (formData) => apiUpload<Document>('/documents', formData),
      remove: (id) => apiDelete<void>(`/documents/${id}`),
    });
    const previewer = createPreviewController({
      fetchBlob: (path, signal) => apiFetchBlob(path, { signal }),
      createObjectURL: (blob) => URL.createObjectURL(blob),
      revokeObjectURL: (url) => URL.revokeObjectURL(url),
    });
    setLibrary(lib);
    setPreview(previewer);
    void lib.refresh();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void lib.refreshIfStale(FOCUS_REFRESH_MIN_AGE_MS);
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      lib.dispose();
      previewer.dispose();
    };
  }, []);

  const loadUser = useCallback(async () => {
    try {
      setUser(await apiGet<User>('/users/me', { cache: 'no-store' }));
      setUserError('');
    } catch {
      setUserError('Could not verify your account, so delete actions and admin-only upload categories are hidden. Use Refresh to retry.');
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await apiGet<LogEntry[]>('/logs', { cache: 'no-store' }));
      setLogsError('');
    } catch {
      setLogsError('Log entries could not be loaded; you can still upload without linking one.');
    }
  }, []);

  useEffect(() => {
    void loadUser();
    void loadLogs();
  }, [loadUser, loadLogs]);

  useEffect(() => {
    if (!preview || previewState.status === 'idle') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') preview.close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview, previewState.status]);

  const handleRefresh = async () => {
    if (!library) return;
    setManualRefreshing(true);
    setActionError('');
    await Promise.all([library.refresh(), loadUser(), loadLogs()]);
    setManualRefreshing(false);
  };

  const handleShow = (doc: Document) => {
    setActionError('');
    void preview?.show(doc);
  };

  const handleDownload = async (doc: Document) => {
    if (downloadingIds.has(doc.id)) return;
    setActionError('');
    setDownloadingIds((prev) => new Set(prev).add(doc.id));
    try {
      await apiDownload(`/documents/${doc.id}/download`, doc.name);
    } catch {
      setActionError(`Could not download "${doc.name}". Please try again.`);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!library || !canDeleteDocument(user, doc)) return;
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    setActionError('');
    try {
      await library.remove(doc.id);
      preview?.handleDeleted(doc.id);
    } catch {
      setActionError(`Could not delete "${doc.name}". Please try again.`);
    } finally {
      setDeletingId(null);
    }
  };

  const { docs, status, error } = libraryState;
  const filteredDocs = useMemo(
    () => (filterCategory ? docs.filter((doc) => doc.category === filterCategory) : docs),
    [docs, filterCategory],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<DocumentCategory, number>();
    docs.forEach((doc) => counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1));
    return counts;
  }, [docs]);
  const logsById = useMemo(() => new Map(logs.map((entry) => [entry.id, entry])), [logs]);
  const retryButton = (
    <ActionButton icon={<RefreshIcon />} label="Try again" busy={manualRefreshing} busyLabel="Retrying…" onClick={() => void handleRefresh()} />
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Your organization&apos;s compliance files. Show previews a PDF here; Download saves the original file.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={<RefreshIcon />}
            label="Refresh"
            busy={manualRefreshing}
            busyLabel="Refreshing…"
            disabled={!library}
            onClick={() => void handleRefresh()}
          />
          <ActionButton
            icon={<UploadIcon />}
            label={uploadOpen ? 'Hide upload' : 'Upload'}
            variant="primary"
            aria-expanded={uploadOpen}
            aria-controls={uploadOpen ? 'upload-panel' : undefined}
            disabled={!library}
            onClick={() => {
              if (!uploadOpen) void loadLogs();
              setUploadOpen((open) => !open);
            }}
          />
        </div>
      </div>

      {uploadOpen && library && (
        <div id="upload-panel">
          <UploadPanel
            user={user}
            logs={logs}
            logsError={logsError}
            onUpload={library.upload}
            onClose={() => setUploadOpen(false)}
          />
        </div>
      )}

      {userError && <p role="alert" className="mb-3 text-sm text-danger">{userError}</p>}
      {actionError && <p role="alert" className="mb-3 text-sm text-danger">{actionError}</p>}

      {previewState.status !== 'idle' && preview && (
        <PreviewPanel
          state={previewState}
          downloading={downloadingIds.has(previewState.doc.id)}
          onClose={preview.close}
          onRetry={(doc) => void preview.show(doc)}
          onDownload={(doc) => void handleDownload(doc)}
        />
      )}

      <section aria-labelledby="library-heading" className="rounded-lg border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <h2 id="library-heading" className="text-lg font-semibold text-foreground">
            Library <span className="text-sm font-normal text-muted-foreground">({filteredDocs.length})</span>
          </h2>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <span className="font-medium">Category</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | '')}
              className="rounded-md border border-input px-3 py-1.5 text-sm"
            >
              <option value="">All categories ({docs.length})</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {CATEGORY_LABELS[option]} ({categoryCounts.get(option) ?? 0})
                </option>
              ))}
            </select>
          </label>
        </div>
        {status === 'loading' ? (
          <p role="status" className="px-4 py-8 text-center text-sm text-muted-foreground">Loading documents…</p>
        ) : status === 'error' ? (
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-8">
            <p role="alert" className="text-sm text-danger">{error}</p>
            {retryButton}
          </div>
        ) : (
          <>
            {error && (
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
                <p role="alert" className="text-sm text-danger">{error} Showing the last loaded list.</p>
                {retryButton}
              </div>
            )}
            <DocumentList
              docs={filteredDocs}
              logsById={logsById}
              user={user}
              deletingId={deletingId}
              downloadingIds={downloadingIds}
              previewId={previewState.status === 'idle' ? null : previewState.doc.id}
              previewLoading={previewState.status === 'loading'}
              emptyMessage={
                filterCategory
                  ? `No ${CATEGORY_LABELS[filterCategory]} documents.`
                  : 'No documents yet. Use Upload to add your first file.'
              }
              onShow={handleShow}
              onDownload={(doc) => void handleDownload(doc)}
              onDelete={(doc) => void handleDelete(doc)}
            />
          </>
        )}
      </section>
    </div>
  );
}
