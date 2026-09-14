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
  occurredAt: string | null;
  measuredAt: string | null;
  isException: boolean;
  exceptionReason: string | null;
  exceptionBy: string | null;
  exceptionAt: string | null;
  createdAt: string;
}

export interface TemperatureCaptureSuggestion {
  extractedValue: string | null;
  confidence: number;
  source: 'filename' | 'metadata' | 'none';
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
  orgId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  userId: string | null;
  payload: Record<string, any> | null;
  createdAt: string;
}

export interface ReportSummary {
  totalLogs: number;
  totalOverrides: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  incidentSummary: {
    total: number;
    pending: number;
    overridden: number;
  };
  exceptionSummary: {
    total: number;
    byType: Record<string, number>;
  };
  overridesByField: Record<string, number>;
  overridesByType: Record<string, number>;
  recentLogs: LogEntry[];
  recentOverrides: OverrideRecord[];
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

export interface ReminderRule {
  id: string;
  orgId: string;
  type: string;
  cronExpression: string;
  message: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface ReminderEvent {
  id: string;
  orgId: string;
  reminderRuleId: string;
  type: string;
  message: string;
  scheduledFor: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

export enum DocumentCategory {
  GENERAL = 'general',
  HACCP_MANUAL = 'haccp_manual',
  STORE_LAYOUT = 'store_layout',
  PERMIT = 'permit',
  CERTIFICATE = 'certificate',
  PROCEDURE = 'procedure',
  INSPECTION_EVIDENCE = 'inspection_evidence',
}

export interface Document {
  id: string;
  orgId: string;
  name: string;
  s3Key: string;
  category: DocumentCategory;
  notes: string | null;
  linkedEntryId: string | null;
  uploadedBy: string;
  createdAt: string;
}
