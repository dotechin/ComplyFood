import { z } from 'zod';
import { LogType } from '../types/log';
export declare const createLogSchema: z.ZodObject<{
    type: z.ZodNativeEnum<typeof LogType>;
    fields: z.ZodRecord<z.ZodString, z.ZodAny>;
    locationId: z.ZodOptional<z.ZodString>;
    presetId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: LogType;
    locationId?: string;
    fields?: Record<string, any>;
    presetId?: string;
}, {
    type?: LogType;
    locationId?: string;
    fields?: Record<string, any>;
    presetId?: string;
}>;
export declare const createOverrideSchema: z.ZodObject<{
    logEntryId: z.ZodString;
    fieldName: z.ZodString;
    originalValue: z.ZodOptional<z.ZodAny>;
    newValue: z.ZodAny;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    logEntryId?: string;
    fieldName?: string;
    originalValue?: any;
    newValue?: any;
}, {
    reason?: string;
    logEntryId?: string;
    fieldName?: string;
    originalValue?: any;
    newValue?: any;
}>;
export type CreateLogInput = z.infer<typeof createLogSchema>;
export type CreateOverrideInput = z.infer<typeof createOverrideSchema>;
