/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Auth Rules - Authentication & Authorization Standards
 */

// ═══════════════════════════════════════════════════════════════════════════════
// USER ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'user' | 'admin' | 'owner' | 'super_admin';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  admin: 2,
  owner: 3,
  super_admin: 4,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  minCategories: 3, // At least 3 of 4 categories
  commonPasswordCheck: true,
  breachCheck: true, // HaveIBeenPwned API
  historyCount: 5, // Reject last 5 passwords
} as const;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very_strong';
  score: number; // 0-100
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  } else {
    score += 25;
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be at most ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Category checks
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const categories = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (categories < PASSWORD_POLICY.minCategories) {
    errors.push(`Password must contain at least ${PASSWORD_POLICY.minCategories} of: uppercase, lowercase, number, special character`);
  } else {
    score += 25 * (categories / 4);
  }

  // Length bonus
  if (password.length >= 16) score += 15;
  if (password.length >= 20) score += 10;

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score < 30) strength = 'weak';
  else if (score < 50) strength = 'fair';
  else if (score < 75) strength = 'strong';
  else strength = 'very_strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, Math.round(score)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MFA CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const MFA_CONFIG = {
  enabled: true,
  methods: ['totp', 'sms', 'email'] as const,
  gracePeriodDays: 7, // Remember device for 7 days
  backupCodesCount: 10,
  totpWindow: 1, // Allow 1 period before/after
} as const;

export const MFA_REQUIRED_ACTIONS = [
  'delete_account',
  'change_email',
  'change_password',
  'manage_api_keys',
  'billing_changes',
  'admin_access',
  'export_data',
  'invite_team_member',
  'change_role',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const SESSION_CONFIG = {
  // Token settings
  accessTokenTTL: '15m',
  refreshTokenTTL: '7d',
  absoluteMaxTTL: '30d',

  // Cookie settings
  cookieName: 'sb-access-token',
  cookieOptions: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'lax' as const,
    path: '/',
  },

  // Session management
  maxConcurrentSessions: 5,
  terminateOldestOnLimit: true,
  refreshOnActivity: true,
  idleTimeout: '30m', // 30 min inactivity
  adminIdleTimeout: '15m', // Stricter for admins
} as const;

export const SESSION_RULES = {
  // Actions that require fresh authentication
  requireReauth: [
    'delete_account',
    'change_email',
    'change_password',
    'view_api_keys',
    'export_all_data',
  ],
  reauthMaxAge: '5m', // Re-auth valid for 5 minutes
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BRUTE FORCE PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const BRUTE_FORCE_CONFIG = {
  // Login attempts
  maxLoginAttempts: 5,
  lockoutDuration: '15m',
  progressiveDelay: true, // Increase delay after each failure
  delayMultiplier: 2, // Double delay each time

  // IP-based limiting
  maxAttemptsPerIP: 20,
  ipLockoutDuration: '1h',

  // Account recovery
  maxPasswordResetAttempts: 3,
  passwordResetWindow: '1h',

  // MFA attempts
  maxMFAAttempts: 3,
  mfaLockoutDuration: '15m',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const API_KEY_CONFIG = {
  prefix: 'olympus_',
  length: 32, // Characters after prefix

  // Scopes
  availableScopes: [
    'read:builds',
    'write:builds',
    'read:projects',
    'write:projects',
    'read:deployments',
    'write:deployments',
    'admin:tenant',
    'billing:read',
    'billing:manage',
  ] as const,

  // Limits
  maxKeysPerUser: 10,
  defaultExpiryDays: 365,
  maxExpiryDays: 730, // 2 years max

  // Rate limits per key
  defaultRateLimit: 1000, // requests per hour
  maxRateLimit: 10000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTH_RULES = {
  password: PASSWORD_POLICY,
  mfa: MFA_CONFIG,
  mfaRequiredActions: MFA_REQUIRED_ACTIONS,
  session: SESSION_CONFIG,
  sessionRules: SESSION_RULES,
  bruteForce: BRUTE_FORCE_CONFIG,
  apiKey: API_KEY_CONFIG,
  roles: ROLE_HIERARCHY,
  validatePassword,
};
