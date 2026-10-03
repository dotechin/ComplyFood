import { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentCategory, type LogEntry, type User } from '@complyfood/shared';
import type { UploadResult } from '../../../lib/documents/library';
import { CATEGORY_LABELS, MAX_UPLOAD_MB, getUploadCategoryOptions } from '../../../lib/documents/rules';
import { ActionButton, CloseIcon, UploadIcon } from './actions';

export interface UploadPanelProps {
  user: User | null;
  logs: LogEntry[];
  logsError: string;
  onUpload: (files: File[], buildForm: (file: File) => FormData) => Promise<UploadResult>;
  onClose: () => void;
}

export function UploadPanel({ user, logs, logsError, onUpload, onClose }: UploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL);
  const [notes, setNotes] = useState('');
  const [linkedEntryId, setLinkedEntryId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryOptions = useMemo(() => getUploadCategoryOptions(user), [user]);
  const isManual = category === DocumentCategory.HACCP_MANUAL;

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0] ?? DocumentCategory.GENERAL);
      setLinkedEntryId('');
    }
  }, [category, categoryOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please choose at least one file to upload.');
      return;
    }
    setError('');
    setMessage('');
    setUploading(true);
    const trimmedNotes = notes.trim();
    const linkTo = isManual ? '' : linkedEntryId;
    const result = await onUpload(files, (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (trimmedNotes) formData.append('notes', trimmedNotes);
      if (linkTo) formData.append('linkedEntryId', linkTo);
      return formData;
    });
    setUploading(false);
    if (result.failed.length > 0) setError(`Failed to upload: ${result.failed.join(', ')}`);
    if (result.uploaded.length > 0) {
      setMessage(`${result.uploaded.length} file${result.uploaded.length === 1 ? '' : 's'} uploaded.`);
    }
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLinkedEntryId('');
    setCategory(DocumentCategory.GENERAL);
    setNotes('');
  };

  return (
    <section aria-labelledby="upload-heading" className="mb-4 rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="upload-heading" className="text-base font-semibold text-foreground">Upload documents</h2>
        <ActionButton icon={<CloseIcon />} label="Close" aria-label="Close upload panel" onClick={onClose} />
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-foreground md:col-span-2">
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
              : 'Select one or more files (Ctrl/Cmd or Shift to multi-select)'} · Max {MAX_UPLOAD_MB} MB per file.
          </span>
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span className="font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => {
              const nextCategory = e.target.value as DocumentCategory;
              setCategory(nextCategory);
              if (nextCategory === DocumentCategory.HACCP_MANUAL) setLinkedEntryId('');
            }}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            {categoryOptions.map((option) => (
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
            disabled={isManual}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            <option value="">{isManual ? 'Manual files are organization-level only' : 'No linked log entry'}</option>
            {logs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.type} · {new Date(entry.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
          {logsError && <span className="block text-xs text-muted-foreground">{logsError}</span>}
        </label>
        <label className="space-y-1 text-sm text-foreground md:col-span-2">
          <span className="font-medium">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Optional notes (e.g. fire permit 2026, signed layout)"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <ActionButton
            type="submit"
            variant="primary"
            icon={<UploadIcon />}
            label={files.length > 1 ? `Upload ${files.length} documents` : 'Upload document'}
            busy={uploading}
            busyLabel="Uploading…"
          />
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </form>
    </section>
  );
}
