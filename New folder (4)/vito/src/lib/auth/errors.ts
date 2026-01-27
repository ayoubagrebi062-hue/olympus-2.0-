/**
 * OLYMPUS 2.0 - Authentication Errors
 *
 * Comprehensive error handling for authentication and authorization.
 */

import type { AuthErrorResponse } from './types';

// ============================================
// ERROR CODES
// ============================================

export type AuthErrorCode =
  // Authentication errors (AUTH_1xx)
  | 'AUTH_100' | 'AUTH_101' | 'AUTH_102' | 'AUTH_103' | 'AUTH_104'
  | 'AUTH_105' | 'AUTH_106' | 'AUTH_107' | 'AUTH_108' | 'AUTH_109' | 'AUTH_110'
  // Registration errors (AUTH_2xx)
  | 'AUTH_200' | 'AUTH_201' | 'AUTH_202' | 'AUTH_203' | 'AUTH_204'
  | 'AUTH_205' | 'AUTH_206'
  // Authorization errors (AUTH_3xx)
  | 'AUTH_300' | 'AUTH_301' | 'AUTH_302' | 'AUTH_303' | 'AUTH_304'
  | 'AUTH_305' | 'AUTH_306' | 'AUTH_307'
  // Rate limiting errors (AUTH_4xx)
  | 'AUTH_400' | 'AUTH_401' | 'AUTH_402' | 'AUTH_403'
  // OAuth errors (AUTH_5xx)
  | 'AUTH_500' | 'AUTH_501' | 'AUTH_502' | 'AUTH_503' | 'AUTH_504'
  // Session errors (AUTH_6xx)
  | 'AUTH_600' | 'AUTH_601' | 'AUTH_602' | 'AUTH_603'
  // Team/Invitation errors (AUTH_7xx)
  | 'AUTH_700' | 'AUTH_701' | 'AUTH_702' | 'AUTH_703' | 'AUTH_704'
  | 'AUTH_705' | 'AUTH_706' | 'AUTH_707'
  // Validation errors (AUTH_8xx)
  | 'AUTH_800' | 'AUTH_801' | 'AUTH_802' | 'AUTH_803' | 'AUTH_804'
  // Server errors (AUTH_9xx)
  | 'AUTH_900' | 'AUTH_901' | 'AUTH_902' | 'AUTH_903';

interface ErrorDefinition {
  code: AuthErrorCode;
  status: number;
  message: string;
  userMessage: string;
}

export const AUTH_ERRORS: Record<AuthErrorCode, ErrorDefinition> = {
  AUTH_100: { code: 'AUTH_100', status: 401, message: 'Authentication failed', userMessage: 'Unable to authenticate. Please try again.' },
  AUTH_101: { code: 'AUTH_101', status: 401, message: 'Invalid credentials', userMessage: 'Invalid email or password. Please check your credentials.' },
  AUTH_102: { code: 'AUTH_102', status: 403, message: 'Email not verified', userMessage: 'Please verify your email address before signing in.' },
  AUTH_103: { code: 'AUTH_103', status: 403, message: 'Account locked', userMessage: 'Your account has been temporarily locked due to too many failed attempts.' },
  AUTH_104: { code: 'AUTH_104', status: 403, message: 'Account disabled', userMessage: 'Your account has been disabled. Please contact support.' },
  AUTH_105: { code: 'AUTH_105', status: 401, message: 'Session expired', userMessage: 'Your session has expired. Please sign in again.' },
  AUTH_106: { code: 'AUTH_106', status: 401, message: 'Invalid token', userMessage: 'The provided token is invalid.' },
  AUTH_107: { code: 'AUTH_107', status: 401, message: 'Token expired', userMessage: 'This link has expired. Please request a new one.' },
  AUTH_108: { code: 'AUTH_108', status: 401, message: 'Invalid refresh token', userMessage: 'Unable to refresh session. Please sign in again.' },
  AUTH_109: { code: 'AUTH_109', status: 401, message: 'MFA required', userMessage: 'Please enter your two-factor authentication code.' },
  AUTH_110: { code: 'AUTH_110', status: 401, message: 'Invalid MFA code', userMessage: 'Invalid verification code. Please try again.' },

  AUTH_200: { code: 'AUTH_200', status: 409, message: 'Email already exists', userMessage: 'An account with this email already exists.' },
  AUTH_201: { code: 'AUTH_201', status: 400, message: 'Invalid email format', userMessage: 'Please enter a valid email address.' },
  AUTH_202: { code: 'AUTH_202', status: 400, message: 'Password too weak', userMessage: 'Password does not meet security requirements.' },
  AUTH_203: { code: 'AUTH_203', status: 400, message: 'Invalid invitation', userMessage: 'This invitation link is invalid.' },
  AUTH_204: { code: 'AUTH_204', status: 410, message: 'Invitation expired', userMessage: 'This invitation has expired. Please request a new one.' },
  AUTH_205: { code: 'AUTH_205', status: 409, message: 'Invitation already used', userMessage: 'This invitation has already been used.' },
  AUTH_206: { code: 'AUTH_206', status: 403, message: 'Registration disabled', userMessage: 'Registration is currently disabled.' },

  AUTH_300: { code: 'AUTH_300', status: 401, message: 'Unauthorized', userMessage: 'Please sign in to continue.' },
  AUTH_301: { code: 'AUTH_301', status: 403, message: 'Forbidden', userMessage: 'You do not have permission to perform this action.' },
  AUTH_302: { code: 'AUTH_302', status: 403, message: 'Tenant access denied', userMessage: 'You do not have access to this organization.' },
  AUTH_303: { code: 'AUTH_303', status: 403, message: 'Project access denied', userMessage: 'You do not have access to this project.' },
  AUTH_304: { code: 'AUTH_304', status: 404, message: 'Resource not found', userMessage: 'The requested resource was not found.' },
  AUTH_305: { code: 'AUTH_305', status: 403, message: 'Action not allowed', userMessage: 'This action is not allowed.' },
  AUTH_306: { code: 'AUTH_306', status: 403, message: 'Plan limit exceeded', userMessage: 'You have reached your plan limit. Please upgrade to continue.' },
  AUTH_307: { code: 'AUTH_307', status: 403, message: 'Feature not available', userMessage: 'This feature is not available on your current plan.' },

  AUTH_400: { code: 'AUTH_400', status: 429, message: 'Rate limit exceeded', userMessage: 'Too many requests. Please try again later.' },
  AUTH_401: { code: 'AUTH_401', status: 429, message: 'Too many login attempts', userMessage: 'Too many login attempts. Please try again later.' },
  AUTH_402: { code: 'AUTH_402', status: 429, message: 'Too many requests', userMessage: 'You are making too many requests. Please slow down.' },
  AUTH_403: { code: 'AUTH_403', status: 429, message: 'Too many password resets', userMessage: 'Too many password reset requests. Please try again later.' },

  AUTH_500: { code: 'AUTH_500', status: 400, message: 'OAuth error', userMessage: 'Unable to complete sign in with this provider.' },
  AUTH_501: { code: 'AUTH_501', status: 502, message: 'OAuth provider error', userMessage: 'The authentication provider is currently unavailable.' },
  AUTH_502: { code: 'AUTH_502', status: 400, message: 'OAuth callback error', userMessage: 'Authentication callback failed. Please try again.' },
  AUTH_503: { code: 'AUTH_503', status: 409, message: 'Account linking failed', userMessage: 'Unable to link this account. It may already be linked to another user.' },
  AUTH_504: { code: 'AUTH_504', status: 401, message: 'OAuth token invalid', userMessage: 'Authentication token is invalid or expired.' },

  AUTH_600: { code: 'AUTH_600', status: 401, message: 'Session error', userMessage: 'Session error. Please sign in again.' },
  AUTH_601: { code: 'AUTH_601', status: 401, message: 'Invalid session', userMessage: 'Your session is invalid. Please sign in again.' },
  AUTH_602: { code: 'AUTH_602', status: 401, message: 'Session revoked', userMessage: 'Your session has been revoked. Please sign in again.' },
  AUTH_603: { code: 'AUTH_603', status: 403, message: 'Concurrent session limit', userMessage: 'You have reached the maximum number of active sessions.' },

  AUTH_700: { code: 'AUTH_700', status: 400, message: 'Invitation error', userMessage: 'Unable to process invitation.' },
  AUTH_701: { code: 'AUTH_701', status: 400, message: 'Cannot invite self', userMessage: 'You cannot invite yourself.' },
  AUTH_702: { code: 'AUTH_702', status: 409, message: 'User already member', userMessage: 'This user is already a member of the organization.' },
  AUTH_703: { code: 'AUTH_703', status: 403, message: 'Cannot remove owner', userMessage: 'The owner cannot be removed from the organization.' },
  AUTH_704: { code: 'AUTH_704', status: 403, message: 'Cannot change own role', userMessage: 'You cannot change your own role.' },
  AUTH_705: { code: 'AUTH_705', status: 403, message: 'Team limit exceeded', userMessage: 'You have reached the maximum number of team members for your plan.' },
  AUTH_706: { code: 'AUTH_706', status: 400, message: 'Invalid role', userMessage: 'The specified role is invalid.' },
  AUTH_707: { code: 'AUTH_707', status: 403, message: 'Cannot demote higher role', userMessage: 'You cannot change the role of a user with higher permissions.' },

  AUTH_800: { code: 'AUTH_800', status: 400, message: 'Validation error', userMessage: 'Please check your input and try again.' },
  AUTH_801: { code: 'AUTH_801', status: 400, message: 'Missing required field', userMessage: 'Please fill in all required fields.' },
  AUTH_802: { code: 'AUTH_802', status: 400, message: 'Invalid field format', userMessage: 'One or more fields have an invalid format.' },
  AUTH_803: { code: 'AUTH_803', status: 400, message: 'Field too long', userMessage: 'One or more fields exceed the maximum length.' },
  AUTH_804: { code: 'AUTH_804', status: 400, message: 'Field too short', userMessage: 'One or more fields are too short.' },

  AUTH_900: { code: 'AUTH_900', status: 500, message: 'Internal server error', userMessage: 'An unexpected error occurred. Please try again.' },
  AUTH_901: { code: 'AUTH_901', status: 500, message: 'Database error', userMessage: 'A database error occurred. Please try again.' },
  AUTH_902: { code: 'AUTH_902', status: 502, message: 'External service error', userMessage: 'An external service is unavailable. Please try again.' },
  AUTH_903: { code: 'AUTH_903', status: 500, message: 'Configuration error', userMessage: 'A configuration error occurred. Please contact support.' },
};

// ============================================
// ERROR CLASS
// ============================================

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly status: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryAfter?: number;

  constructor(
    code: AuthErrorCode,
    options?: {
      details?: Record<string, unknown>;
      retryAfter?: number;
      cause?: Error;
    }
  ) {
    const errorDef = AUTH_ERRORS[code];
    super(errorDef.message);

    this.name = 'AuthError';
    this.code = code;
    this.status = errorDef.status;
    this.userMessage = errorDef.userMessage;
    this.details = options?.details;
    this.retryAfter = options?.retryAfter;

    if (options?.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, AuthError);
  }

  toResponse(): AuthErrorResponse {
    return {
      code: this.code,
      message: this.userMessage,
      details: this.details,
      retryAfter: this.retryAfter,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      status: this.status,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================
// ERROR HELPERS
// ============================================

export function createAuthError(
  code: AuthErrorCode,
  options?: {
    details?: Record<string, unknown>;
    retryAfter?: number;
    cause?: Error;
  }
): AuthError {
  return new AuthError(code, options);
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function getErrorResponse(error: unknown): {
  status: number;
  body: AuthErrorResponse;
} {
  if (isAuthError(error)) {
    return {
      status: error.status,
      body: error.toResponse(),
    };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { message: string; status?: number };

    const errorMapping: Record<string, AuthErrorCode> = {
      'Invalid login credentials': 'AUTH_101',
      'Email not confirmed': 'AUTH_102',
      'User already registered': 'AUTH_200',
      'Password should be at least': 'AUTH_202',
      'Token has expired': 'AUTH_107',
      'Invalid token': 'AUTH_106',
      'Rate limit exceeded': 'AUTH_400',
    };

    for (const [msg, code] of Object.entries(errorMapping)) {
      if (supabaseError.message.includes(msg)) {
        const authError = new AuthError(code);
        return {
          status: authError.status,
          body: authError.toResponse(),
        };
      }
    }
  }

  const defaultError = new AuthError('AUTH_900');
  return {
    status: defaultError.status,
    body: defaultError.toResponse(),
  };
}

export function assertAuth(
  condition: boolean,
  errorCode: AuthErrorCode,
  options?: {
    details?: Record<string, unknown>;
    retryAfter?: number;
  }
): asserts condition {
  if (!condition) {
    throw new AuthError(errorCode, options);
  }
}

export async function withAuthErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }

    console.error('Auth error:', error);
    throw new AuthError('AUTH_900', { cause: error as Error });
  }
}

// ============================================
// VALIDATION ERRORS
// ============================================

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export function createValidationError(fields: FieldError[]): AuthError {
  return new AuthError('AUTH_800', { details: { fields } });
}

export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'required',
      });
    }
  }

  return errors;
}

export function validateEmail(email: string): FieldError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Invalid email format',
      code: 'invalid_format',
    };
  }

  return null;
}

export function validatePassword(password: string): FieldError[] {
  const errors: FieldError[] = [];

  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters', code: 'too_short' });
  }

  if (password.length > 128) {
    errors.push({ field: 'password', message: 'Password must be at most 128 characters', code: 'too_long' });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain a lowercase letter', code: 'missing_lowercase' });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain an uppercase letter', code: 'missing_uppercase' });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain a number', code: 'missing_number' });
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain a special character', code: 'missing_special' });
  }

  return errors;
}
