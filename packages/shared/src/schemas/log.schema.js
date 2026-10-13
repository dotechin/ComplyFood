"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOverrideSchema = exports.createLogSchema = void 0;
const zod_1 = require("zod");
const log_1 = require("../types/log");
exports.createLogSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(log_1.LogType),
    fields: zod_1.z.record(zod_1.z.any()),
    locationId: zod_1.z.string().uuid().optional(),
    presetId: zod_1.z.string().uuid().optional(),
});
exports.createOverrideSchema = zod_1.z.object({
    logEntryId: zod_1.z.string().uuid(),
    fieldName: zod_1.z.string().min(1),
    originalValue: zod_1.z.any().optional(),
    newValue: zod_1.z.any(),
    reason: zod_1.z.string().min(3, 'A reason is required for every override'),
});
//# sourceMappingURL=log.schema.js.map