import type { Document } from '@complyfood/shared';

export type LibraryStatus = 'loading' | 'ready' | 'error';

export interface LibraryState {
  docs: Document[];
  /** `loading`/`error` only describe the first load; later failures keep the last good list. */
  status: LibraryStatus;
  refreshing: boolean;
  error: string;
  lastLoadedAt: number | null;
}

export interface UploadResult {
  uploaded: Document[];
  failed: string[];
}

export interface LibraryDeps {
  list: (signal: AbortSignal) => Promise<Document[]>;
  upload: (formData: FormData) => Promise<Document>;
  remove: (id: string) => Promise<void>;
  now?: () => number;
  pollIntervalMs?: number;
  maxPolls?: number;
}

export interface DocumentLibrary {
  getState: () => LibraryState;
  subscribe: (listener: () => void) => () => void;
  refresh: () => Promise<void>;
  refreshIfStale: (maxAgeMs: number) => Promise<void> | undefined;
  upload: (files: File[], buildForm: (file: File) => FormData) => Promise<UploadResult>;
  remove: (id: string) => Promise<void>;
  dispose: () => void;
}

export const LIST_ERROR_MESSAGE = 'Could not load documents. Check your connection and try again.';
export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_MAX_POLLS = 24;

function byNewest(a: Document, b: Document) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function isAbortError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

/**
 * Framework-agnostic store for the Documents library. The most recent list
 * request always wins, and server snapshots are reconciled with uploads and
 * deletions that completed after the snapshot was requested, so an
 * out-of-order response can neither restore a deleted row nor drop a new one.
 */
export function createDocumentLibrary(deps: LibraryDeps): DocumentLibrary {
  const now = deps.now ?? (() => Date.now());
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPolls = deps.maxPolls ?? DEFAULT_MAX_POLLS;
  const listeners = new Set<() => void>();
  const deletedIds = new Set<string>();
  const localUploads = new Map<string, { doc: Document; mutation: number }>();
  let state: LibraryState = { docs: [], status: 'loading', refreshing: false, error: '', lastLoadedAt: null };
  let requestSeq = 0;
  let mutationSeq = 0;
  let controller: AbortController | null = null;
  let inFlight: Promise<void> | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let polls = 0;
  let disposed = false;

  const setState = (patch: Partial<LibraryState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const clearPoll = () => {
    if (pollTimer !== null) clearTimeout(pollTimer);
    pollTimer = null;
  };

  const schedulePoll = () => {
    clearPoll();
    if (disposed) return;
    if (!state.docs.some((doc) => doc.processingStatus === 'pending')) {
      polls = 0;
      return;
    }
    if (polls >= maxPolls) return;
    polls += 1;
    pollTimer = setTimeout(() => {
      pollTimer = null;
      void refresh();
    }, pollIntervalMs);
  };

  const reconcile = (serverDocs: Document[], startedAtMutation: number) => {
    const docs = serverDocs.filter((doc) => !deletedIds.has(doc.id));
    const present = new Set(docs.map((doc) => doc.id));
    localUploads.forEach(({ doc, mutation }, id) => {
      if (present.has(id)) {
        localUploads.delete(id);
      } else if (mutation > startedAtMutation) {
        docs.push(doc);
      } else {
        // The snapshot was requested after this upload completed and no longer
        // contains it (e.g. deleted elsewhere), so the server is authoritative.
        localUploads.delete(id);
      }
    });
    return docs.sort(byNewest);
  };

  const refresh = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    const seq = ++requestSeq;
    const startedAtMutation = mutationSeq;
    controller?.abort();
    const current = new AbortController();
    controller = current;
    clearPoll();
    setState({ refreshing: true });

    const run = (async () => {
      try {
        const serverDocs = await deps.list(current.signal);
        if (disposed || seq !== requestSeq) return;
        setState({
          docs: reconcile(serverDocs, startedAtMutation),
          status: 'ready',
          refreshing: false,
          error: '',
          lastLoadedAt: now(),
        });
        schedulePoll();
      } catch (error) {
        if (disposed || seq !== requestSeq || isAbortError(error)) return;
        setState({
          status: state.status === 'ready' ? 'ready' : 'error',
          refreshing: false,
          error: LIST_ERROR_MESSAGE,
        });
      } finally {
        if (seq === requestSeq) inFlight = null;
      }
    })();
    inFlight = run;
    return run;
  };

  const refreshIfStale = (maxAgeMs: number) => {
    if (inFlight) return inFlight;
    if (state.lastLoadedAt !== null && now() - state.lastLoadedAt < maxAgeMs) return undefined;
    return refresh();
  };

  const upload = async (files: File[], buildForm: (file: File) => FormData): Promise<UploadResult> => {
    const uploaded: Document[] = [];
    const failed: string[] = [];
    for (const file of files) {
      try {
        const doc = await deps.upload(buildForm(file));
        uploaded.push(doc);
        mutationSeq += 1;
        localUploads.set(doc.id, { doc, mutation: mutationSeq });
        if (!disposed) {
          setState({ docs: [doc, ...state.docs.filter((item) => item.id !== doc.id)].sort(byNewest) });
        }
      } catch {
        failed.push(file.name);
      }
    }
    if (uploaded.length > 0 && !disposed) {
      polls = 0;
      void refresh();
    }
    return { uploaded, failed };
  };

  const remove = async (id: string) => {
    await deps.remove(id);
    mutationSeq += 1;
    deletedIds.add(id);
    localUploads.delete(id);
    if (disposed) return;
    setState({ docs: state.docs.filter((doc) => doc.id !== id) });
    void refresh();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    refreshIfStale,
    upload,
    remove,
    dispose: () => {
      disposed = true;
      clearPoll();
      controller?.abort();
      listeners.clear();
    },
  };
}
