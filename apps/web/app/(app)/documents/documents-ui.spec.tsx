import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentCategory, UserRole, type Document, type User } from '@complyfood/shared';
import DocumentsPage from './page';
import { DocumentList, type DocumentListProps } from './document-list';
import { PreviewPanel } from './preview-panel';
import { UploadPanel } from './upload-panel';

const admin = { id: 'admin-1', orgId: 'org-1', role: UserRole.ADMIN } as User;
const uploader = { id: 'user-1', orgId: 'org-1', role: UserRole.STAFF } as User;
const otherStaff = { id: 'user-2', orgId: 'org-1', role: UserRole.STAFF } as User;
const otherOrgAdmin = { id: 'admin-9', orgId: 'org-9', role: UserRole.ADMIN } as User;

const doc: Document = {
  id: 'doc-1',
  orgId: 'org-1',
  name: 'permit.pdf',
  s3Key: 'org-1/permit.pdf',
  category: DocumentCategory.PERMIT,
  notes: 'Fire permit 2026',
  linkedEntryId: null,
  uploadedBy: 'user-1',
  mimeType: 'application/pdf',
  metadata: { title: 'Permit', author: null, creationDate: null, pageCount: 2 },
  processingStatus: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderList(overrides: Partial<DocumentListProps> = {}) {
  return renderToStaticMarkup(
    <DocumentList
      docs={[doc]}
      logsById={new Map()}
      user={uploader}
      deletingId={null}
      downloadingIds={new Set()}
      previewId={null}
      previewLoading={false}
      emptyMessage="Nothing here"
      onShow={jest.fn()}
      onDownload={jest.fn()}
      onDelete={jest.fn()}
      {...overrides}
    />,
  );
}

const visibleLabels = (html: string) =>
  Array.from(html.matchAll(/<button[^>]*>(?:<svg[\s\S]*?<\/svg>)<span>([^<]+)<\/span><\/button>/g)).map((m) => m[1]);

describe('Documents UI', () => {
  it('renders labeled icon actions with Show before Download and a destructive Delete', () => {
    const html = renderList();

    expect(visibleLabels(html)).toEqual(['Show', 'Download', 'Delete']);
    expect(html).toContain('aria-label="Show permit.pdf"');
    expect(html).toContain('aria-label="Download permit.pdf"');
    expect(html).toContain('aria-label="Delete permit.pdf"');
    expect(html).toMatch(/<button[^>]*class="[^"]*text-danger[^"]*"[^>]*aria-label="Delete permit.pdf"/);
    // Icons are decorative; the visible text is the label.
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('no longer offers Read PDF or Open folder actions', () => {
    const html = renderList({ user: admin });
    expect(html).not.toMatch(/Read PDF|Open folder/);
  });

  it('keeps details discoverable without crowding the row', () => {
    const html = renderList();
    expect(html).toContain('<summary');
    expect(html).toContain('Fire permit 2026');
    expect(html).toContain('Text indexing in progress');
    expect(html).toContain('Indexing…');
    expect(html).toContain('Pages: </dt><dd class="inline whitespace-pre-wrap break-words">2');
  });

  it('shows Delete only to the uploader or an admin of the same organization', () => {
    expect(visibleLabels(renderList({ user: uploader }))).toContain('Delete');
    expect(visibleLabels(renderList({ user: admin }))).toContain('Delete');
    expect(visibleLabels(renderList({ user: otherStaff }))).not.toContain('Delete');
    expect(visibleLabels(renderList({ user: otherOrgAdmin }))).not.toContain('Delete');
    expect(visibleLabels(renderList({ user: null }))).not.toContain('Delete');
  });

  it('reflects busy states for preview, download and delete', () => {
    const html = renderList({ previewId: doc.id, previewLoading: true, downloadingIds: new Set([doc.id]), deletingId: doc.id });
    expect(html).toContain('Loading…');
    expect(html).toContain('Downloading…');
    expect(html).toContain('Deleting…');
    expect(html.match(/disabled=""/g)?.length).toBe(3);
  });

  it('renders a PDF preview in-app with separate Download and Close actions', () => {
    const html = renderToStaticMarkup(
      <PreviewPanel
        state={{ status: 'ready', doc, url: 'blob:preview-1' }}
        downloading={false}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onDownload={jest.fn()}
      />,
    );
    expect(html).toContain('<iframe src="blob:preview-1" title="PDF preview of permit.pdf"');
    expect(visibleLabels(html)).toEqual(['Download', 'Close']);
    expect(html).toContain('Open in new tab');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('renders preview errors with a retry and unsupported types without an iframe', () => {
    const error = renderToStaticMarkup(
      <PreviewPanel state={{ status: 'error', doc, message: 'Could not load' }} downloading={false} onClose={jest.fn()} onRetry={jest.fn()} onDownload={jest.fn()} />,
    );
    expect(error).toContain('role="alert"');
    expect(visibleLabels(error)).toContain('Try again');

    const unsupported = renderToStaticMarkup(
      <PreviewPanel state={{ status: 'unsupported', doc: { ...doc, name: 'layout.svg' }, message: 'Preview is only available for PDF files.' }} downloading={false} onClose={jest.fn()} onRetry={jest.fn()} onDownload={jest.fn()} />,
    );
    expect(unsupported).not.toContain('<iframe');
    expect(visibleLabels(unsupported)).toEqual(['Download', 'Close']);
  });

  it('restricts HACCP manual uploads to admins and keeps upload limits visible', () => {
    const props = { logs: [], logsError: '', onUpload: jest.fn(), onClose: jest.fn() };
    const staffHtml = renderToStaticMarkup(<UploadPanel user={otherStaff} {...props} />);
    const adminHtml = renderToStaticMarkup(<UploadPanel user={admin} {...props} />);

    expect(staffHtml).not.toContain('HACCP manual');
    expect(adminHtml).toContain('<option value="haccp_manual">HACCP manual</option>');
    expect(staffHtml).toContain('multiple=""');
    expect(staffHtml).toContain('Max 20 MB per file.');
    expect(staffHtml).toContain('Notes');
    expect(staffHtml).toContain('Linked log entry');
  });

  it('renders a single library with separate filter, Refresh and Upload controls and no folder UI', () => {
    const html = renderToStaticMarkup(<DocumentsPage />);

    expect(html).toContain('Library');
    expect(html).toContain('All categories');
    expect(visibleLabels(html)).toEqual(['Refresh', 'Upload']);
    expect(html).toContain('aria-expanded="false"');
    // Upload controls are collapsed by default and not mixed with filtering.
    expect(html).not.toContain('type="file"');
    expect(html).not.toMatch(/Folders|Open folder|Read PDF|Close reader|Uploaded manuals|Log-linked documents/);
  });

  it('no longer calls the text extraction endpoint from the Documents page', () => {
    const dir = join(__dirname);
    for (const file of ['page.tsx', 'document-list.tsx', 'preview-panel.tsx', 'upload-panel.tsx']) {
      expect(readFileSync(join(dir, file), 'utf8')).not.toContain('/extract');
    }
  });
});
