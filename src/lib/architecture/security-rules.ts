/**
 * OLYMPUS 2.1 - ARCHITECTURE BLUEPRINT
 * Security Rules - SENTINEL Agent Constraints
 *
 * All security patterns MUST follow these rules.
 * No shortcuts. No exceptions.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTH_RULES = {
  provider: 'Supabase Auth',

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false, // Recommended but not required
    maxLength: 128,
    commonPasswordCheck: true, // Check against common passwords list
  },

  // MFA
  mfa: {
    enabled: true,
    required: false, // User choice
    methods: ['totp'], // Time-based one-time password
    gracePeriod: '7d', // Remember device for 7 days
  },

  // Sessions
  session: {
    duration: '7d',
    absoluteMax: '30d',
    refreshOnActivity: true,
    singleSession: false, // Allow multiple devices
  },

  // Token handling
  tokens: {
    type: 'JWT',
    storage: 'httpOnly cookie',
    sameSite: 'Lax',
    secure: true, // HTTPS only
    domain: 'Same domain only',
  },

  // Brute force protection
  bruteForce: {
    maxAttempts: 5,
    lockoutDuration: '15m',
    progressiveDelay: true, // Increase delay after each failure
    ipBasedLimiting: true,
  },

  // OAuth providers
  oauth: {
    allowed: ['google', 'github'],
    requireEmailVerification: true,
    linkExistingAccounts: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const DATA_PROTECTION = {
  // PII fields (require special handling)
  piiFields: [
    'email',
    'phone',
    'name',
    'firstName',
    'lastName',
    'address',
    'city',
    'state',
    'country',
    'postalCode',
    'zipCode',
    'dateOfBirth',
    'ssn',
    'taxId',
    'ipAddress',
    'userAgent',
  ],

  // Encryption
  encryption: {
    atRest: 'Supabase default (AES-256)',
    inTransit: 'TLS 1.3',
    secrets: 'Environment variables only',
    neverLog: ['password', 'token', 'apiKey', 'secret', 'creditCard'],
  },

  // Data retention
  retention: {
    auditLogs: '2y',
    accessLogs: '90d',
    ipAddresses: '90d',
    deletedAccounts: '30d', // Soft delete, then purge
    paymentData: 'Never stored (Stripe handles)',
  },

  // GDPR compliance
  gdpr: {
    required: true,
    dataExport: '/api/v1/users/me/export',
    accountDeletion: '/api/v1/users/me/delete',
    consentTracking: true,
    cookieConsent: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export const INPUT_VALIDATION = {
  // Validation library
  library: 'Zod',

  // Rules
  rules: [
    'ALL inputs MUST be validated with Zod',
    'NEVER trust client-side validation alone',
    'Validate on both client AND server',
    'Use strict mode (unknown keys rejected)',
    'Sanitize HTML in user-generated content',
  ],

  // Common patterns
  patterns: {
    email: 'z.string().email()',
    uuid: 'z.string().uuid()',
    cuid: 'z.string().cuid()',
    url: 'z.string().url()',
    password: 'z.string().min(8).max(128)',
    phone: 'z.string().regex(/^\\+?[1-9]\\d{1,14}$/)',
    slug: 'z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)',
  },

  // Size limits
  limits: {
    string: { default: 255, max: 65535 },
    text: { default: 5000, max: 100000 },
    array: { default: 100, max: 1000 },
    json: { default: 10000, max: 1000000 }, // bytes
  },

  // Dangerous patterns to reject
  reject: [
    '<script', // XSS
    'javascript:', // XSS
    'data:', // Data URI attacks
    'vbscript:', // VBScript
    'onclick', // Event handlers
    'onerror', // Event handlers
    '../', // Path traversal
    '..\\', // Path traversal (Windows)
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SQL INJECTION PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

export const SQL_SECURITY = {
  // ORM-only policy
  rule: 'Prisma ORM ONLY - No raw SQL',

  // Allowed
  allowed: [
    'Prisma Client methods',
    'Prisma.$queryRaw with tagged template literals',
    'Prisma.$executeRaw with tagged template literals',
  ],

  // Forbidden
  forbidden: [
    'String concatenation in queries',
    'Template literals without Prisma.sql tag',
    'Direct database connections bypassing Prisma',
    'pg or mysql2 direct usage',
  ],

  // Example
  example: {
    good: `
      // ✅ Safe - Prisma handles parameterization
      await prisma.user.findMany({
        where: { email: userInput }
      });

      // ✅ Safe - Tagged template literal
      await prisma.$queryRaw\`
        SELECT * FROM users WHERE email = \${userInput}
      \`;
    `,
    bad: `
      // ❌ DANGEROUS - String interpolation
      await prisma.$queryRaw(\`
        SELECT * FROM users WHERE email = '\${userInput}'
      \`);

      // ❌ DANGEROUS - Direct concatenation
      const query = "SELECT * FROM users WHERE email = '" + email + "'";
    `,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// XSS PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

export const XSS_SECURITY = {
  // React escapes by default
  reactProtection: 'Automatic (JSX escapes)',

  // Dangerous patterns
  dangerous: [
    'dangerouslySetInnerHTML', // Avoid unless sanitized
    'eval()', // Never use
    'new Function()', // Never use
    'innerHTML', // Use textContent instead
    'outerHTML', // Avoid
    'document.write()', // Never use
  ],

  // When HTML is required
  htmlSanitization: {
    library: 'DOMPurify or sanitize-html',
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: ['href', 'title'],
    stripAll: true, // Default to stripping unknown
  },

  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Next.js
    styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", 'https://*.supabase.co'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// API SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

export const API_SECURITY = {
  // CORS
  cors: {
    origin: 'Same origin only (no wildcard)',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Rate limiting
  rateLimiting: {
    enabled: true,
    storage: 'Upstash Redis',
    headers: {
      limit: 'X-RateLimit-Limit',
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
    },
  },

  // Request validation
  requestValidation: {
    maxBodySize: '10mb',
    requireContentType: true,
    allowedContentTypes: [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ],
  },

  // Headers
  securityHeaders: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECRETS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SECRETS_MANAGEMENT = {
  // Storage
  storage: 'Environment variables ONLY',

  // Never do
  neverDo: [
    'Hardcode secrets in code',
    'Commit .env files to git',
    'Log secrets (even in debug mode)',
    'Pass secrets in URLs',
    'Store secrets in localStorage/sessionStorage',
    'Expose secrets to client-side code',
  ],

  // .gitignore requirements
  gitignore: ['.env', '.env.local', '.env.*.local', '*.pem', '*.key'],

  // Environment variable naming
  naming: {
    clientSafe: 'NEXT_PUBLIC_*',
    serverOnly: 'No prefix (default server-only)',
    secrets: '*_SECRET_KEY, *_API_KEY',
  },

  // Rotation
  rotation: {
    apiKeys: '90d recommended',
    jwtSecret: 'On suspected compromise',
    databasePassword: '180d recommended',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export const AUDIT_LOGGING = {
  // Events to log
  events: {
    auth: [
      'login_success',
      'login_failure',
      'logout',
      'password_change',
      'mfa_enabled',
      'mfa_disabled',
      'session_revoked',
    ],
    data: ['create', 'update', 'delete', 'export', 'bulk_operation'],
    admin: [
      'user_created',
      'user_deleted',
      'role_changed',
      'settings_changed',
      'api_key_created',
      'api_key_revoked',
    ],
    security: ['rate_limit_exceeded', 'suspicious_activity', 'invalid_token', 'permission_denied'],
  },

  // Log format
  format: {
    timestamp: 'ISO 8601',
    userId: 'CUID',
    tenantId: 'CUID',
    action: 'event_name',
    resource: 'table_name',
    resourceId: 'CUID',
    ipAddress: 'Hashed after 90 days',
    userAgent: 'Truncated',
    details: 'JSON (no PII)',
  },

  // Storage
  storage: {
    primary: 'Supabase (audit_logs table)',
    retention: '2 years',
    immutable: true, // No updates or deletes
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY VALIDATION RULES (for Security Gate)
// ═══════════════════════════════════════════════════════════════════════════════

export const SECURITY_VALIDATION_RULES = [
  {
    id: 'no-eval',
    description: 'Never use eval() or new Function()',
    severity: 'error',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(/,
  },
  {
    id: 'no-innerHTML',
    description: 'Avoid innerHTML, use textContent or React',
    severity: 'warning',
    pattern: /\.innerHTML\s*=/,
  },
  {
    id: 'no-dangerouslySetInnerHTML',
    description: 'dangerouslySetInnerHTML requires sanitization',
    severity: 'warning',
    pattern: /dangerouslySetInnerHTML/,
  },
  {
    id: 'no-hardcoded-secrets',
    description: 'No hardcoded API keys or secrets',
    severity: 'error',
    pattern: /['"][a-zA-Z0-9_-]{20,}['"]/, // Long strings that might be keys
  },
  {
    id: 'no-console-log',
    description: 'Use console.warn or console.error, not console.log',
    severity: 'warning',
    pattern: /console\.log\(/,
  },
  {
    id: 'zod-validation',
    description: 'API routes must validate input with Zod',
    severity: 'error',
  },
  {
    id: 'auth-check',
    description: 'Protected routes must verify authentication',
    severity: 'error',
  },
  {
    id: 'no-raw-sql',
    description: 'No raw SQL strings, use Prisma',
    severity: 'error',
    pattern: /\$queryRaw`[^`]*\$\{[^}]*\}[^`]*`/,
  },
  {
    id: 'csrf-protection',
    description: 'Mutations must have CSRF protection',
    severity: 'warning',
  },
  {
    id: 'rate-limiting',
    description: 'Public endpoints must have rate limiting',
    severity: 'warning',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface SentinelOutput {
  auth: {
    provider: string;
    methods: string[];
    mfa: boolean;
    sessionDuration: string;
  };
  protection: {
    rls: boolean;
    rateLimiting: boolean;
    inputValidation: boolean;
    csrfProtection: boolean;
  };
  headers: Record<string, string>;
  publicRoutes: string[];
  sensitiveFields: string[];
  auditEvents: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const SECURITY_RULES = {
  auth: AUTH_RULES,
  data: DATA_PROTECTION,
  input: INPUT_VALIDATION,
  sql: SQL_SECURITY,
  xss: XSS_SECURITY,
  api: API_SECURITY,
  secrets: SECRETS_MANAGEMENT,
  audit: AUDIT_LOGGING,
  validation: SECURITY_VALIDATION_RULES,
};
