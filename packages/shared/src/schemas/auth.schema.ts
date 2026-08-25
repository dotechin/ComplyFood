import { z } from 'zod';
import { UserRole } from '../types/user';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional(),
  orgId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
