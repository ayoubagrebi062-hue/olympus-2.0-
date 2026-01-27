/**
 * OLYMPUS 2.0 - Auth Validation Schemas
 */

import { z } from 'zod';

/** Email validation */
const email = z.string().email('Invalid email format').max(255);

/** Password validation */
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/** Simple password (for login - no complexity check) */
const loginPassword = z.string().min(1, 'Password is required').max(72);

/** Signup schema */
export const signupSchema = z.object({
  email,
  password,
  name: z.string().min(1, 'Name is required').max(100),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
});

/** Login schema */
export const loginSchema = z.object({
  email,
  password: loginPassword,
  rememberMe: z.boolean().optional().default(false),
});

/** Forgot password schema */
export const forgotPasswordSchema = z.object({
  email,
});

/** Reset password schema */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/** Verify email schema */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/** Change password schema */
export const changePasswordSchema = z.object({
  currentPassword: loginPassword,
  newPassword: password,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/** Update profile schema */
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional().nullable(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
});

/** MFA setup schema */
export const mfaSetupSchema = z.object({
  type: z.enum(['totp', 'sms']),
  phone: z.string().optional(), // Required if type is 'sms'
}).refine((data) => data.type !== 'sms' || data.phone, {
  message: 'Phone number is required for SMS MFA',
  path: ['phone'],
});

/** MFA verify schema */
export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

/** Refresh token schema */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
