'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';

const CLEANING_CATEGORIES = [
  'Machinery and equipment',
  'Work surfaces',
  'Sinks',
  'Walls and ceilings',
  'Floors',
  'Dishwashing area and utensils',
  'Fridges and freezers',
  'Waste containers',
  'Personal hygiene',
  'Staff facilities',
  'Shelves and cupboards',
];

type ImportRecord = {
  period: string;
  week: number;
  page: number;
  outcomes: Array<'C' | 'A' | 'NC'>;
  correctiveAction?: string;
};
type ImportResult = { imported: number; duplicates: number };

function parseRecords(value: string): ImportRecord[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [period, week, page, outcomesText, correctiveAction, ...extra] = line.split('|').map((part) => part.trim());
    const outcomes = outcomesText?.split(',').map((outcome) => outcome.trim()) ?? [];
    if (
      extra.length ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? '') ||
      !/^[1-5]$/.test(week ?? '') ||
      !/^\d+$/.test(page ?? '') ||
      outcomes.length !== CLEANING_CATEGORIES.length ||
      outcomes.some((outcome) => !['C', 'A', 'NC'].includes(outcome))
    ) {
      throw new Error(`Line ${index + 1} must include YYYY-MM, week, page, and 11 comma-separated C/A/NC values in the displayed category order.`);
    }
    return { period, week: Number(week), page: Number(page), outcomes: outcomes as ImportRecord['outcomes'], correctiveAction };
  });
}

export function HistoricalCleaningImport() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [recordsText, setRecordsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void apiGet<Document[]>('/documents').then((items) => {
      if (active) setDocuments(items.filter((item) => item.mimeType === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf')));
    }).catch(() => {
      if (active) setError('Upload the source PDFs in Documents before importing historical cleaning checks.');
    });
    return () => { active = false; };
  }, []);

  const importRecords = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const records = parseRecords(recordsText);
      if (!documentId) throw new Error('Select the source PDF first.');
      if (records.length === 0) throw new Error('Add at least one source week.');
      setBusy(true);
      let result: ImportResult = { imported: 0, duplicates: 0 };
      for (let start = 0; start < records.length; start += 100) {
        const batch = await apiPost<ImportResult>('/logs/historical-cleaning-import', {
          sourceDocumentId: documentId,
          records: records.slice(start, start + 100),
        });
        result = {
          imported: result.imported + batch.imported,
          duplicates: result.duplicates + batch.duplicates,
        };
      }
      setMessage(`${result.imported} historical weekly checks imported; ${result.duplicates} duplicates ignored.`);
      setRecordsText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import historical cleaning checks.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer font-semibold">Import verified historical cleaning checks</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Administrator only. Upload the original PDF to <a href="/documents" className="text-primary underline">Documents</a> first. Imported entries retain the PDF page, source month/week, original C/A/NC outcomes, importing account, and import time. No exact day or unrecorded corrective action is inferred.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Category order: {CLEANING_CATEGORIES.join(' · ')}.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm text-success">{message}</p>}
      <form onSubmit={importRecords} className="mt-3 space-y-3">
        <div>
          <label htmlFor="historical-cleaning-source-pdf" className="mb-1 block text-sm font-medium">Source PDF</label>
          <select
            id="historical-cleaning-source-pdf"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Select an uploaded PDF</option>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="historical-cleaning-records" className="mb-1 block text-sm font-medium">Transcribed source weeks</label>
          <textarea
            id="historical-cleaning-records"
            value={recordsText}
            onChange={(event) => setRecordsText(event.target.value)}
            placeholder="YYYY-MM | week | page | C,A,NC,… (11 values) | corrective action (optional)"
            rows={6}
            className="w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Keep the original month and week-row; these forms do not give an exact day. Leave corrective action blank if the source has none recorded.
          </p>
        </div>
        <button type="submit" disabled={busy} className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary disabled:opacity-50">
          {busy ? 'Importing…' : 'Import verified checks'}
        </button>
      </form>
    </details>
  );
}
