export enum LogType {
  TEMPERATURE = 'temperature',
  CLEANING = 'cleaning',
  RECEIVING = 'receiving',
  CHECKLIST = 'checklist',
  INCIDENT = 'incident',
}

export enum LogStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  OVERRIDDEN = 'overridden',
}

export interface LogEntry {
  id: string;
  orgId: string;
  locationId: string | null;
  type: LogType;
  fields: Record<string, any>;
  status: LogStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  presetId: string | null;
  createdAt: string;
}

export interface OverrideRecord {
  id: string;
  logEntryId: string;
  fieldName: string;
  originalValue: any;
  newValue: any;
  reason: string;
  userId: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  userId: string | null;
  payload: Record<string, any> | null;
  createdAt: string;
}

export interface ChecklistTemplate {
  id: string;
  orgId: string;
  name: string;
  type: string | null;
  fieldsConfig: Record<string, any>;
  createdAt: string;
}

export interface PresetRule {
  id: string;
  orgId: string;
  type: string;
  schedule: Record<string, any> | null;
  defaults: Record<string, any> | null;
  createdAt: string;
}

export interface Document {
  id: string;
  orgId: string;
  name: string;
  s3Key: string;
  linkedEntryId: string | null;
  uploadedBy: string;
  createdAt: string;
}
