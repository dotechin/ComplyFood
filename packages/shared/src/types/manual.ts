export type ManualStatus = 'draft' | 'approved';

export interface ManualSection {
  key: string;
  title: string;
  content: string;
}

export interface HaccpManualVersion {
  id: string;
  orgId: string;
  businessType: string;
  status: ManualStatus;
  versionNumber: number;
  sections: ManualSection[];
  linkedDocumentIds: string[];
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

