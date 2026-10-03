import { useEffect, useRef } from 'react';
import type { Document } from '@complyfood/shared';
import type { PreviewState } from '../../../lib/documents/preview';
import { ActionButton, CloseIcon, DownloadIcon, ExternalIcon, RefreshIcon, SpinnerIcon, actionClasses } from './actions';

export interface PreviewPanelProps {
  state: Exclude<PreviewState, { status: 'idle' }>;
  downloading: boolean;
  onClose: () => void;
  onRetry: (doc: Document) => void;
  onDownload: (doc: Document) => void;
}

export function PreviewPanel({ state, downloading, onClose, onRetry, onDownload }: PreviewPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { doc } = state;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [doc.id]);

  return (
    <section aria-labelledby="preview-heading" className="mb-4 rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="preview-heading" ref={headingRef} tabIndex={-1} className="min-w-0 truncate text-base font-semibold text-foreground focus:outline-none">
          Preview: <span title={doc.name}>{doc.name}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {state.status === 'ready' && (
            <a href={state.url} target="_blank" rel="noopener noreferrer" className={actionClasses()}>
              <ExternalIcon />
              <span>Open in new tab</span>
            </a>
          )}
          <ActionButton
            icon={<DownloadIcon />}
            label="Download"
            busyLabel="Downloading…"
            busy={downloading}
            aria-label={`Download ${doc.name}`}
            onClick={() => onDownload(doc)}
          />
          <ActionButton icon={<CloseIcon />} label="Close" aria-label="Close preview" onClick={onClose} />
        </div>
      </div>
      {state.status === 'loading' && (
        <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <SpinnerIcon /> Loading preview…
        </p>
      )}
      {state.status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 py-4">
          <p role="alert" className="text-sm text-danger">{state.message}</p>
          <ActionButton icon={<RefreshIcon />} label="Try again" onClick={() => onRetry(doc)} />
        </div>
      )}
      {state.status === 'unsupported' && <p className="py-4 text-sm text-muted-foreground">{state.message}</p>}
      {state.status === 'ready' && (
        <iframe
          key={state.url}
          src={state.url}
          title={`PDF preview of ${doc.name}`}
          className="h-[75vh] w-full rounded-md border border-border bg-muted"
        />
      )}
    </section>
  );
}
