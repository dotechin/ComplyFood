'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentCategory,
  UserRole,
  type Document,
  type HaccpManualVersion,
  type ManualSection,
  type User,
} from '@complyfood/shared';
import { apiDownload, apiGet, apiPatch, apiPost, apiUpload } from '../../../lib/api';

const BUSINESS_TYPES = [
  'Independent Restaurant / Trattoria',
  'Pizzeria',
  'Bar / Café',
  'Bakery',
  'Gelateria',
  'Small Catering Kitchen',
];

export default function ManualPage() {
  const [user, setUser] = useState<User | null>(null);
  const [versions, setVersions] = useState<HaccpManualVersion[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [selectedSection, setSelectedSection] = useState('');
  const [sectionContent, setSectionContent] = useState('');
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [linkedDocumentIds, setLinkedDocumentIds] = useState<string[]>([]);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null,
    [selectedVersionId, versions],
  );
  const uploadedManuals = useMemo(
    () => documents.filter((doc) => doc.category === DocumentCategory.HACCP_MANUAL),
    [documents],
  );
  const supportingDocuments = useMemo(
    () => documents.filter((doc) => doc.category !== DocumentCategory.HACCP_MANUAL),
    [documents],
  );

  useEffect(() => {
    Promise.all([
      apiGet<User>('/users/me'),
      apiGet<HaccpManualVersion[]>('/manual'),
      apiGet<Document[]>('/documents'),
    ])
      .then(([me, loadedVersions, docs]) => {
        setUser(me);
        setVersions(loadedVersions);
        setDocuments(docs);
        if (loadedVersions[0]) {
          setSelectedVersionId(loadedVersions[0].id);
          const firstSection = loadedVersions[0].sections[0];
          if (firstSection) {
            setSelectedSection(firstSection.key);
            setSectionContent(firstSection.content);
          }
          setLinkedDocumentIds(loadedVersions[0].linkedDocumentIds ?? []);
          setBusinessType(loadedVersions[0].businessType);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVersion) return;
    const drafts = selectedVersion.sections.reduce<Record<string, string>>((acc, section) => {
      acc[section.key] = section.content;
      return acc;
    }, {});
    const section = selectedVersion.sections[0];
    setSectionDrafts(drafts);
    setSelectedSection(section?.key ?? '');
    setSectionContent(section ? drafts[section.key] ?? '' : '');
    setLinkedDocumentIds(selectedVersion.linkedDocumentIds ?? []);
    setBusinessType(selectedVersion.businessType);
  }, [selectedVersion]);

  const reload = async (preferredVersionId?: string) => {
    const loadedVersions = await apiGet<HaccpManualVersion[]>('/manual');
    setVersions(loadedVersions);
    if (!loadedVersions[0]) return;
    if (preferredVersionId && loadedVersions.some((version) => version.id === preferredVersionId)) {
      setSelectedVersionId(preferredVersionId);
      return;
    }
    setSelectedVersionId(loadedVersions[0].id);
  };

  const createTemplate = async () => {
    try {
      setError('');
      setMessage('');
      const created = await apiPost<HaccpManualVersion>('/manual/template', { businessType });
      setVersions((prev) => [created, ...prev]);
      setSelectedVersionId(created.id);
      setSelectedSection(created.sections[0]?.key ?? '');
      setSectionContent(created.sections[0]?.content ?? '');
      setSectionDrafts(
        created.sections.reduce<Record<string, string>>((acc, section) => {
          acc[section.key] = section.content;
          return acc;
        }, {}),
      );
      setLinkedDocumentIds(created.linkedDocumentIds ?? []);
      setMessage('Template generated. Complete each section and save revisions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate template');
    }
  };

  const saveSection = async () => {
    if (!selectedVersion || !selectedSection) return;
    try {
      setError('');
      setMessage('');
      const updated = await apiPatch<HaccpManualVersion>(`/manual/${selectedVersion.id}/section`, {
        sectionKey: selectedSection,
        content: sectionContent,
        linkedDocumentIds,
      });
      await reload(updated.id);
      setMessage('New manual version saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save section');
    }
  };

  const approveVersion = async () => {
    if (!selectedVersion) return;
    try {
      setError('');
      setMessage('');
      const approved = await apiPatch<HaccpManualVersion>(`/manual/${selectedVersion.id}/approve`, {});
      setVersions((prev) => prev.map((item) => (item.id === approved.id ? approved : item)));
      setSelectedVersionId(approved.id);
      setSelectedSection(approved.sections[0]?.key ?? '');
      setSectionContent(approved.sections[0]?.content ?? '');
      setSectionDrafts(
        approved.sections.reduce<Record<string, string>>((acc, section) => {
          acc[section.key] = section.content;
          return acc;
        }, {}),
      );
      setMessage('Manual version approved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve manual');
    }
  };

  const exportPdf = async () => {
    if (!selectedVersion) return;
    await apiDownload(`/manual/${selectedVersion.id}/export/pdf`, `haccp-manual-v${selectedVersion.versionNumber}.pdf`);
  };

  const uploadExistingManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFile) {
      setError('Choose a HACCP manual file to upload.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const formData = new FormData();
      formData.append('file', manualFile);
      formData.append('category', DocumentCategory.HACCP_MANUAL);
      if (manualNotes.trim()) {
        formData.append('notes', manualNotes.trim());
      }
      const uploaded = await apiUpload<Document>('/documents', formData);
      setDocuments((prev) => [uploaded, ...prev]);
      setManualFile(null);
      if (manualFileInputRef.current) {
        manualFileInputRef.current.value = '';
      }
      setManualNotes('');
      setMessage('Existing HACCP manual uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload manual');
    }
  };

  const saveFullVersion = async () => {
    if (!selectedVersion) return;
    const updatedSections: ManualSection[] = selectedVersion.sections.map((section) =>
      section.key === selectedSection
        ? { ...section, content: sectionContent }
        : { ...section, content: sectionDrafts[section.key] ?? section.content },
    );

    try {
      setError('');
      setMessage('');
      const created = await apiPost<HaccpManualVersion>('/manual', {
        businessType,
        sections: updatedSections,
        linkedDocumentIds,
      });
      await reload(created.id);
      setMessage('Manual revision stored.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to store manual revision');
    }
  };

  const completeness = useMemo(() => {
    if (!selectedVersion) return { done: 0, total: 0 };
    const done = selectedVersion.sections.filter((section) => {
      const value = section.key === selectedSection ? sectionContent : sectionDrafts[section.key] ?? section.content;
      return value.trim().length > 0;
    }).length;
    return { done, total: selectedVersion.sections.length };
  }, [sectionContent, sectionDrafts, selectedSection, selectedVersion]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const isAdmin = user?.role === UserRole.ADMIN;

  if (!isAdmin) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-gray-600 shadow-sm">HACCP manual management is admin-only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">HACCP Manual</h1>
        <p className="text-sm text-gray-500">Generate tailored manual templates, edit sections, track completeness, save versions, and export PDF.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Business type</span>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createTemplate()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate tailored template
          </button>
        </div>
        {isAdmin && (
          <form onSubmit={uploadExistingManual} className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1 text-sm text-gray-700">
              <span className="font-medium">Manual file</span>
              <input
                ref={manualFileInputRef}
                type="file"
                onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-700">
              <span className="font-medium">Upload notes</span>
              <input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional notes about the uploaded manual"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              Upload existing manual
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Uploaded manual files</h2>
          <div className="space-y-2">
            {uploadedManuals.length === 0 ? (
              <p className="text-sm text-gray-500">No external manual uploaded yet.</p>
            ) : (
              uploadedManuals.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {doc.notes || 'Uploaded manual file'} · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.name)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Supporting compliance documents</h2>
          <div className="space-y-2">
            {supportingDocuments.length === 0 ? (
              <p className="text-sm text-gray-500">Upload layouts, permits, certificates, and procedures in Documents.</p>
            ) : (
              supportingDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {doc.category.replace(/_/g, ' ')}{doc.notes ? ` · ${doc.notes}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Versions</h2>
          <div className="space-y-2">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedVersionId(version.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selectedVersion?.id === version.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                v{version.versionNumber} · {version.status}
                <p className="text-xs text-gray-500">{new Date(version.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
          {selectedVersion && (
            <p className="mt-3 text-xs text-gray-600">
              Completeness: {completeness.done}/{completeness.total}
            </p>
          )}
        </aside>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          {!selectedVersion ? (
            <p className="text-sm text-gray-500">No manual yet. Generate the first template.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    setSectionDrafts((prev) => ({ ...prev, [selectedSection]: sectionContent }));
                    setSelectedSection(nextKey);
                    setSectionContent(sectionDrafts[nextKey] ?? selectedVersion.sections.find((s) => s.key === nextKey)?.content ?? '');
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {selectedVersion.sections.map((section) => (
                    <option key={section.key} value={section.key}>{section.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void saveSection()}
                  className="rounded-md border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Save section as new version
                </button>
                <button
                  type="button"
                  onClick={() => void saveFullVersion()}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Save full revision
                </button>
                <button
                  type="button"
                  onClick={() => void approveVersion()}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Approve
                </button>
              </div>

              <label htmlFor="manualSectionEditor" className="block text-sm font-medium text-gray-700">
                Section content ({selectedVersion.sections.find((section) => section.key === selectedSection)?.title ?? selectedSection})
              </label>
              <textarea
                id="manualSectionEditor"
                aria-label="Manual section content editor"
                value={sectionContent}
                onChange={(e) => {
                  setSectionContent(e.target.value);
                  setSectionDrafts((prev) => ({ ...prev, [selectedSection]: e.target.value }));
                }}
                className="h-64 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Link supporting documents</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {supportingDocuments.map((doc) => {
                    const checked = linkedDocumentIds.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setLinkedDocumentIds((prev) =>
                              e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id),
                            );
                          }}
                        />
                        {doc.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void exportPdf()}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
