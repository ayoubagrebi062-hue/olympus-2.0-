/**
 * OLYMPUS 2.0 - Authentication Constants
 *
 * Security constants, configuration defaults, and route definitions.
 */

// ============================================
// SECURITY CONSTANTS
// ============================================

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

export const SESSION_CONFIG = {
  ACCESS_TOKEN_LIFETIME: 60 * 60,
  REFRESH_TOKEN_LIFETIME: 60 * 60 * 24 * 7,
  EXTENDED_SESSION_LIFETIME: 60 * 60 * 24 * 30,
  IDLE_TIMEOUT: 60 * 30,
  MAX_CONCURRENT_SESSIONS: 5,
  COOKIE_NAME: 'olympus-session',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
} as const;

export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_ATTEMPTS: 5,
    BLOCK_DURATION_MS: 15 * 60 * 1000,
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_ATTEMPTS: 3,
    BLOCK_DURATION_MS: 60 * 60 * 1000,
  },
  MAGIC_LINK: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_ATTEMPTS: 5,
    BLOCK_DURATION_MS: 60 * 60 * 1000,
  },
  SIGNUP: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_ATTEMPTS: 10,
    BLOCK_DURATION_MS: 60 * 60 * 1000,
  },
  API: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 100,
  },
  INVITATION: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_ATTEMPTS: 20,
  },
} as const;

export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 10,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000,
  PROGRESSIVE_DELAYS: [
    0, // 1st attempt
    0, // 2nd attempt
    0, // 3rd attempt
    1000, // 4th attempt - 1 second
    2000, // 5th attempt - 2 seconds
    4000, // 6th attempt - 4 seconds
    8000, // 7th attempt - 8 seconds
    16000, // 8th attempt - 16 seconds
    32000, // 9th attempt - 32 seconds
    60000, // 10th attempt - 1 minute
  ],
  RESET_ON_SUCCESS: true,
} as const;

export const TOKEN_CONFIG = {
  EMAIL_VERIFICATION: {
    EXPIRES_IN: 24 * 60 * 60,
    LENGTH: 64,
  },
  PASSWORD_RESET: {
    EXPIRES_IN: 60 * 60,
    LENGTH: 64,
  },
  MAGIC_LINK: {
    EXPIRES_IN: 15 * 60,
    LENGTH: 64,
  },
  INVITATION: {
    EXPIRES_IN: 7 * 24 * 60 * 60,
    LENGTH: 32,
  },
  API_KEY: {
    LENGTH: 40,
    PREFIX: 'oly_',
  },
} as const;

// ============================================
// ROUTE CONSTANTS
// ============================================

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/invitation',
  '/auth/callback',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/callback',
  '/api/auth/magic-link',
  '/api/health',
] as const;

export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'] as const;

export const PROTECTED_ROUTE_PATTERNS = [
  '/dashboard',
  '/projects',
  '/settings',
  '/team',
  '/billing',
  '/api/v1',
] as const;

export const ADMIN_ROUTES = ['/admin', '/api/admin'] as const;

export const REDIRECTS = {
  AFTER_LOGIN: '/dashboard',
  AFTER_LOGOUT: '/login',
  AFTER_SIGNUP: '/dashboard',
  UNAUTHENTICATED: '/login',
  UNAUTHORIZED: '/dashboard',
  AFTER_VERIFICATION: '/dashboard',
  AFTER_PASSWORD_RESET: '/login',
  AFTER_INVITATION: '/dashboard',
} as const;

// ============================================
// OAUTH CONSTANTS
// ============================================

export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    icon: 'google',
    scopes: ['email', 'profile'],
    color: '#4285F4',
  },
  github: {
    name: 'GitHub',
    icon: 'github',
    scopes: ['user:email', 'read:user'],
    color: '#333333',
  },
} as const;

export const OAUTH_CALLBACK_URL = '/auth/callback';

// ============================================
// EMAIL CONSTANTS
// ============================================

export const EMAIL_CONFIG = {
  FROM_ADDRESS: process.env.EMAIL_FROM || 'noreply@olympus.dev',
  FROM_NAME: 'OLYMPUS',
  SUBJECTS: {
    VERIFICATION: 'Verify your email - OLYMPUS',
    PASSWORD_RESET: 'Reset your password - OLYMPUS',
    MAGIC_LINK: 'Sign in to OLYMPUS',
    INVITATION: "You've been invited to join {tenant} on OLYMPUS",
    WELCOME: 'Welcome to OLYMPUS!',
    PASSWORD_CHANGED: 'Your password has been changed - OLYMPUS',
    ACCOUNT_LOCKED: 'Your account has been locked - OLYMPUS',
    NEW_DEVICE: 'New device sign-in - OLYMPUS',
  },
} as const;

// ============================================
// VALIDATION CONSTANTS
// ============================================

export const FIELD_LIMITS = {
  EMAIL: { MIN: 5, MAX: 254 },
  PASSWORD: { MIN: 8, MAX: 128 },
  DISPLAY_NAME: { MIN: 2, MAX: 100 },
  TENANT_NAME: { MIN: 2, MAX: 100 },
  TENANT_SLUG: { MIN: 2, MAX: 50 },
  BIO: { MAX: 500 },
  INVITATION_MESSAGE: { MAX: 500 },
} as const;

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  DISPLAY_NAME: new RegExp("^[\\p{L}\\p{N}\\s\\-'.]+$", 'u'),
  PHONE: /^\+?[1-9]\d{1,14}$/,
} as const;

// ============================================
// FEATURE FLAGS
// ============================================

export const AUTH_FEATURES = {
  EMAIL_PASSWORD: true,
  OAUTH_GOOGLE: true,
  OAUTH_GITHUB: true,
  MAGIC_LINK: true,
  REQUIRE_EMAIL_VERIFICATION: true,
  MFA_ENABLED: false,
  ACCOUNT_LINKING: true,
  SELF_SERVICE_SIGNUP: true,
  TEAM_INVITATIONS: true,
  REMEMBER_ME: true,
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'You must be signed in to access this page.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  MAINTENANCE: 'The system is under maintenance. Please try again later.',
} as const;

// ============================================
// AUDIT LOG CONSTANTS
// ============================================

export const AUDIT_RETENTION = {
  AUTH_LOGS_DAYS: 90,
  SECURITY_EVENTS_DAYS: 365,
  ALWAYS_LOG: [
    'login_success',
    'login_failure',
    'logout',
    'password_changed',
    'password_reset_completed',
    'account_locked',
    'account_unlocked',
    'role_changed',
    'member_removed',
  ],
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

export function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some(route => path === route || path.startsWith(`${route}/`));
}

export function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTE_PATTERNS.some(pattern => path.startsWith(pattern));
}

export function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTES.some(route => path.startsWith(route));
}

export function getProgressiveDelay(attemptCount: number): number {
  const delays = LOCKOUT_CONFIG.PROGRESSIVE_DELAYS;
  const index = Math.min(attemptCount - 1, delays.length - 1);
  return delays[Math.max(0, index)];
}

export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS;
}

export function getLockoutEndTime(lockedAt: Date): Date {
  return new Date(lockedAt.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MS);
}

export function isLockoutExpired(lockedAt: Date): boolean {
  const unlockTime = getLockoutEndTime(lockedAt);
  return new Date() > unlockTime;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}
