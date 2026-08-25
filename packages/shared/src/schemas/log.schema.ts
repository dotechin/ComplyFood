import { z } from 'zod';
import { LogType } from '../types/log';

export const createLogSchema = z.object({
  type: z.nativeEnum(LogType),
  fields: z.record(z.any()),
  locationId: z.string().uuid().optional(),
  presetId: z.string().uuid().optional(),
});

export const createOverrideSchema = z.object({
  logEntryId: z.string().uuid(),
  fieldName: z.string().min(1),
  originalValue: z.any().optional(),
  newValue: z.any(),
  reason: z.string().min(3, 'A reason is required for every override'),
});

export type CreateLogInput = z.infer<typeof createLogSchema>;
export type CreateOverrideInput = z.infer<typeof createOverrideSchema>;
