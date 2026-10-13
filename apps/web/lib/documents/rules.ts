import { DocumentCategory, UserRole, type Document, type User } from '@complyfood/shared';

export const CATEGORY_OPTIONS = [
  DocumentCategory.GENERAL,
  DocumentCategory.HACCP_MANUAL,
  DocumentCategory.STORE_LAYOUT,
  DocumentCategory.PERMIT,
  DocumentCategory.CERTIFICATE,
  DocumentCategory.PROCEDURE,
  DocumentCategory.INSPECTION_EVIDENCE,
] as const;

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.GENERAL]: 'General compliance',
  [DocumentCategory.HACCP_MANUAL]: 'HACCP manual',
  [DocumentCategory.STORE_LAYOUT]: 'Store layout',
  [DocumentCategory.PERMIT]: 'Permit',
  [DocumentCategory.CERTIFICATE]: 'Certificate',
  [DocumentCategory.PROCEDURE]: 'Procedure',
  [DocumentCategory.INSPECTION_EVIDENCE]: 'Inspection evidence',
};

export const MAX_UPLOAD_MB = 20;

/** HACCP manual files are admin-only uploads; everyone else gets the remaining categories. */
export function getUploadCategoryOptions(user: User | null): readonly DocumentCategory[] {
  return user?.role === UserRole.ADMIN
    ? CATEGORY_OPTIONS
    : CATEGORY_OPTIONS.filter((option) => option !== DocumentCategory.HACCP_MANUAL);
}

/** Mirrors the API rule: uploader or organization admin, within the same organization. */
export function canDeleteDocument(user: User | null, doc: Document) {
  return !!user && user.orgId === doc.orgId && (user.role === UserRole.ADMIN || user.id === doc.uploadedBy);
}

export function isPdfDocument(doc: Pick<Document, 'name' | 'mimeType'>) {
  return doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name);
}
