import type { Document } from '@complyfood/shared';
import { isPdfDocument } from './rules';

export type PreviewState =
  | { status: 'idle' }
  | { status: 'loading'; doc: Document }
  | { status: 'ready'; doc: Document; url: string }
  | { status: 'unsupported'; doc: Document; message: string }
  | { status: 'error'; doc: Document; message: string };

export interface PreviewDeps {
  fetchBlob: (path: string, signal: AbortSignal) => Promise<Blob>;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

export interface PreviewController {
  getState: () => PreviewState;
  subscribe: (listener: () => void) => () => void;
  show: (doc: Document) => Promise<void>;
  close: () => void;
  handleDeleted: (id: string) => void;
  dispose: () => void;
}

export const UNSUPPORTED_TYPE_MESSAGE = 'Preview is only available for PDF files. Use Download to save this file and open it on your device.';
export const NOT_A_PDF_MESSAGE = 'This file is not a valid PDF, so it cannot be previewed safely. Use Download to save the original file.';
export const PREVIEW_ERROR_MESSAGE = 'Could not load the preview. Check your connection and try again, or use Download.';

const PDF_SIGNATURE = '%PDF-';
// The PDF header may be preceded by junk bytes; readers accept it within the first 1 KB.
const SIGNATURE_WINDOW = 1024;

export async function hasPdfSignature(blob: Blob) {
  const bytes = new Uint8Array(await blob.slice(0, SIGNATURE_WINDOW).arrayBuffer());
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text.includes(PDF_SIGNATURE);
}

function isAbortError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

/**
 * Loads the original stored bytes through an authenticated request and exposes
 * them as an `application/pdf` object URL for in-app display. Only bytes that
 * carry a PDF signature are ever given a renderable type, so uploaded HTML/SVG
 * is never executed in the app origin.
 */
export function createPreviewController(deps: PreviewDeps): PreviewController {
  const listeners = new Set<() => void>();
  let state: PreviewState = { status: 'idle' };
  let seq = 0;
  let controller: AbortController | null = null;
  let disposed = false;

  const setState = (next: PreviewState) => {
    if (state.status === 'ready' && (next.status !== 'ready' || next.url !== state.url)) {
      deps.revokeObjectURL(state.url);
    }
    state = next;
    listeners.forEach((listener) => listener());
  };

  const cancelPending = () => {
    seq += 1;
    controller?.abort();
    controller = null;
  };

  const show = async (doc: Document) => {
    if (disposed) return;
    if ((state.status === 'loading' || state.status === 'ready') && state.doc.id === doc.id) return;
    cancelPending();
    if (!isPdfDocument(doc)) {
      setState({ status: 'unsupported', doc, message: UNSUPPORTED_TYPE_MESSAGE });
      return;
    }
    const requestId = seq;
    const current = new AbortController();
    controller = current;
    setState({ status: 'loading', doc });
    try {
      const blob = await deps.fetchBlob(`/documents/${doc.id}/download`, current.signal);
      if (requestId !== seq) return;
      if (!(await hasPdfSignature(blob))) {
        if (requestId !== seq) return;
        setState({ status: 'unsupported', doc, message: NOT_A_PDF_MESSAGE });
        return;
      }
      if (requestId !== seq) return;
      const url = deps.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setState({ status: 'ready', doc, url });
    } catch (error) {
      if (requestId !== seq || isAbortError(error)) return;
      setState({ status: 'error', doc, message: PREVIEW_ERROR_MESSAGE });
    } finally {
      if (requestId === seq) controller = null;
    }
  };

  const close = () => {
    cancelPending();
    if (state.status !== 'idle') setState({ status: 'idle' });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    show,
    close,
    handleDeleted: (id) => {
      if (state.status !== 'idle' && state.doc.id === id) close();
    },
    dispose: () => {
      close();
      disposed = true;
      listeners.clear();
    },
  };
}
