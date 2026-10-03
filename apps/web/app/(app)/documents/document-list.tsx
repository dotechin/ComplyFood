import type { Document, DocumentMetadata, LogEntry, User } from '@complyfood/shared';
import { CATEGORY_LABELS, canDeleteDocument, isPdfDocument } from '../../../lib/documents/rules';
import { ActionButton, DownloadIcon, EyeIcon, FileIcon, TrashIcon } from './actions';

const PROCESSING_LABELS: Record<Document['processingStatus'], string> = {
  pending: 'Text indexing in progress',
  completed: 'Text indexed',
  failed: 'Text indexing failed (the file can still be shown and downloaded)',
};

export interface DocumentListProps {
  docs: Document[];
  logsById: Map<string, LogEntry>;
  user: User | null;
  deletingId: string | null;
  downloadingIds: ReadonlySet<string>;
  previewId: string | null;
  previewLoading: boolean;
  emptyMessage: string;
  onShow: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

export function DocumentList({
  docs,
  logsById,
  user,
  deletingId,
  downloadingIds,
  previewId,
  previewLoading,
  emptyMessage,
  onShow,
  onDownload,
  onDelete,
}: DocumentListProps) {
  if (docs.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <ul className="divide-y divide-border" aria-label="Documents">
      {docs.map((doc) => {
        const linkedLog = doc.linkedEntryId ? logsById.get(doc.linkedEntryId) : null;
        const scope = linkedLog ? `${linkedLog.type} log` : doc.linkedEntryId ? 'Linked log' : 'Organization';
        const pdf = isPdfDocument(doc);
        const isPreviewing = previewId === doc.id;
        return (
          <li key={doc.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <span className="shrink-0 text-muted-foreground"><FileIcon /></span>
                <span className="truncate" title={doc.name}>{doc.name}</span>
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{CATEGORY_LABELS[doc.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{scope}</span>
                <span aria-hidden="true">·</span>
                <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                {pdf && doc.processingStatus === 'pending' && (
                  <span className="rounded bg-muted px-1.5 text-foreground">Indexing…</span>
                )}
              </p>
              {doc.notes && <p className="mt-1 truncate text-xs text-muted-foreground" title={doc.notes}>{doc.notes}</p>}
              {(doc.notes || pdf) && (
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none text-primary">Details</summary>
                  <dl className="mt-1 space-y-0.5">
                    {doc.notes && <Row label="Notes" value={doc.notes} />}
                    {pdf && <Row label="Text indexing" value={PROCESSING_LABELS[doc.processingStatus]} />}
                    <DocumentMetadataDetails metadata={doc.metadata} />
                  </dl>
                </details>
              )}
            </div>
            <div role="group" aria-label={`Actions for ${doc.name}`} className="flex flex-wrap gap-2 sm:shrink-0">
              <ActionButton
                icon={<EyeIcon />}
                label="Show"
                busyLabel="Loading…"
                busy={isPreviewing && previewLoading}
                aria-label={`Show ${doc.name}`}
                aria-pressed={isPreviewing}
                onClick={() => onShow(doc)}
              />
              <ActionButton
                icon={<DownloadIcon />}
                label="Download"
                busyLabel="Downloading…"
                busy={downloadingIds.has(doc.id)}
                aria-label={`Download ${doc.name}`}
                onClick={() => onDownload(doc)}
              />
              {canDeleteDocument(user, doc) && (
                <ActionButton
                  icon={<TrashIcon />}
                  label="Delete"
                  busyLabel="Deleting…"
                  variant="danger"
                  busy={deletingId === doc.id}
                  disabled={deletingId !== null}
                  aria-label={`Delete ${doc.name}`}
                  onClick={() => onDelete(doc)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="inline font-medium">{label}: </dt>
      <dd className="inline whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}

function DocumentMetadataDetails({ metadata }: { metadata: DocumentMetadata | null }) {
  if (!metadata) return null;
  return (
    <>
      <Row label="Pages" value={metadata.pageCount} />
      {metadata.title && <Row label="Title" value={metadata.title} />}
      {metadata.author && <Row label="Author" value={metadata.author} />}
      {metadata.creationDate && <Row label="Created" value={metadata.creationDate} />}
    </>
  );
}
