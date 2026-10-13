"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapSchema = exports.passwordResetConfirmSchema = exports.passwordResetRequestSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const user_1 = require("../types/user");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.nativeEnum(user_1.UserRole).optional(),
    orgId: zod_1.z.string().uuid().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.passwordResetRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.passwordResetConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8),
});
exports.bootstrapSchema = zod_1.z.object({
    organizationName: zod_1.z.string().trim().min(2, 'Organization name must be at least 2 characters'),
    organizationAddress: zod_1.z.string().optional(),
    organizationCategory: zod_1.z.string().optional(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
//# sourceMappingURL=auth.schema.js.map