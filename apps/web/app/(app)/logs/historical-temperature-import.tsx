'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@complyfood/shared';
import { apiGet, apiPost } from '../../../lib/api';
import { TEMPERATURE_UNITS } from './temperature-log';

type ImportResult = { imported: number; skippedSundays: number; duplicates: number };
type ImportRecord = { date: string; page: number; unit: string; outcome: 'C' | 'NC' };

function parseRecords(value: string): ImportRecord[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [date, page, unitNumber, outcome, ...extra] = line.split('|').map((part) => part.trim());
    const unit = TEMPERATURE_UNITS[Number(unitNumber) - 1]?.value;
    if (
      extra.length ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ||
      !/^\d+$/.test(page ?? '') ||
      !unit ||
      !['C', 'NC'].includes(outcome ?? '')
    ) {
      throw new Error(`Line ${index + 1} must be: YYYY-MM-DD | page | equipment 1–4 | C or NC.`);
    }
    return { date, page: Number(page), unit, outcome: outcome as 'C' | 'NC' };
  });
}

export function HistoricalTemperatureImport({ onImported }: { onImported: () => Promise<void> }) {
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
      if (active) setError('Upload the source PDFs in Documents before importing historical readings.');
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
      if (records.length === 0) throw new Error('Add at least one source record.');
      setBusy(true);
      let result: ImportResult = { imported: 0, skippedSundays: 0, duplicates: 0 };
      for (let start = 0; start < records.length; start += 400) {
        const batch = await apiPost<ImportResult>('/logs/historical-temperature-import', {
          sourceDocumentId: documentId,
          records: records.slice(start, start + 400),
        });
        result = {
          imported: result.imported + batch.imported,
          skippedSundays: result.skippedSundays + batch.skippedSundays,
          duplicates: result.duplicates + batch.duplicates,
        };
      }
      await onImported();
      setMessage(`${result.imported} historical outcomes imported; ${result.skippedSundays} Sunday entries skipped as closed days; ${result.duplicates} duplicates ignored.`);
      setRecordsText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import historical records.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer font-semibold">Import verified historical temperature outcomes</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Administrator only. Upload the original PDF to <a href="/documents" className="text-primary underline">Documents</a> first, then transcribe its C/NC marks below. This imports the source classification and page reference—not fabricated numeric temperatures.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm text-success">{message}</p>}
      <form onSubmit={importRecords} className="mt-3 space-y-3">
        <div>
          <label htmlFor="historical-source-pdf" className="mb-1 block text-sm font-medium">Source PDF</label>
          <select
            id="historical-source-pdf"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Select an uploaded PDF</option>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="historical-temperature-records" className="mb-1 block text-sm font-medium">Transcribed source marks</label>
          <textarea
            id="historical-temperature-records"
            value={recordsText}
            onChange={(event) => setRecordsText(event.target.value)}
            placeholder={'YYYY-MM-DD | page | equipment 1–4 | C or NC\n2026-01-05 | 1 | 1 | C'}
            rows={6}
            className="w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Equipment 1–3 are the three bar counters; 4 is the kitchen chest freezer. Do not include Sundays—the business is closed. Re-importing the same PDF records is safe.
          </p>
        </div>
        <button type="submit" disabled={busy} className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary disabled:opacity-50">
          {busy ? 'Importing…' : 'Import verified records'}
        </button>
      </form>
    </details>
  );
}
