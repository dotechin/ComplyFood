import { z } from 'zod';
import { UserRole } from '../types/user';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>;
    orgId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    orgId?: string;
    email?: string;
    role?: UserRole;
    password?: string;
}, {
    orgId?: string;
    email?: string;
    role?: UserRole;
    password?: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export declare const passwordResetRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
}, {
    email?: string;
}>;
export declare const passwordResetConfirmSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password?: string;
    token?: string;
}, {
    password?: string;
    token?: string;
}>;
export declare const bootstrapSchema: z.ZodObject<{
    organizationName: z.ZodString;
    organizationAddress: z.ZodOptional<z.ZodString>;
    organizationCategory: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    organizationName?: string;
    organizationAddress?: string;
    organizationCategory?: string;
}, {
    email?: string;
    password?: string;
    organizationName?: string;
    organizationAddress?: string;
    organizationCategory?: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
