/**
 * OLYMPUS 2.1 - ARCHITECTURE BLUEPRINT
 * API Rules - NEXUS Agent Constraints
 * 
 * All REST APIs MUST follow these patterns.
 * NEXUS outputs specs, FORGE generates code - both must comply.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// API STYLE
// ═══════════════════════════════════════════════════════════════════════════════

export const API_STYLE = {
  // Primary style
  primary: 'REST',
  secondary: 'Server Actions',

  // When to use each
  useREST: [
    'CRUD operations',
    'External integrations',
    'Webhooks',
    'Public APIs',
    'Long-running operations',
    'File uploads',
  ],

  useServerActions: [
    'Form submissions',
    'Quick mutations',
    'Internal operations',
    'Optimistic updates',
    'Revalidation triggers',
  ],

  // Forbidden
  forbidden: [
    'GraphQL',
    'tRPC',
    'gRPC',
    'SOAP',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// URL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const URL_PATTERNS = {
  // Base pattern
  base: '/api/v1',

  // Resource naming
  naming: {
    rule: 'Plural nouns, lowercase, kebab-case for multi-word',
    examples: {
      good: ['/api/v1/users', '/api/v1/orders', '/api/v1/order-items'],
      bad: ['/api/v1/user', '/api/v1/getUsers', '/api/v1/orderItems'],
    },
  },

  // Resource patterns
  patterns: {
    list: 'GET /api/v1/{resources}',
    create: 'POST /api/v1/{resources}',
    read: 'GET /api/v1/{resources}/[id]',
    update: 'PATCH /api/v1/{resources}/[id]',
    replace: 'PUT /api/v1/{resources}/[id]',
    delete: 'DELETE /api/v1/{resources}/[id]',
  },

  // Nested resources
  nested: {
    pattern: '/api/v1/{parent}/[parentId]/{children}',
    examples: [
      'GET /api/v1/users/[userId]/orders',
      'POST /api/v1/projects/[projectId]/builds',
      'GET /api/v1/tenants/[tenantId]/members',
    ],
    maxDepth: 2, // Never go deeper than parent/child
  },

  // Actions (non-CRUD operations)
  actions: {
    pattern: 'POST /api/v1/{resources}/[id]/{action}',
    examples: [
      'POST /api/v1/orders/[id]/cancel',
      'POST /api/v1/builds/[id]/retry',
      'POST /api/v1/users/[id]/verify-email',
    ],
  },

  // Search/filter
  search: {
    pattern: 'GET /api/v1/{resources}/search',
    example: 'GET /api/v1/products/search?q=laptop&category=electronics',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP METHODS
// ═══════════════════════════════════════════════════════════════════════════════

export const HTTP_METHODS = {
  GET: {
    purpose: 'Read data',
    idempotent: true,
    safe: true,
    body: false,
  },
  POST: {
    purpose: 'Create resource or trigger action',
    idempotent: false,
    safe: false,
    body: true,
  },
  PUT: {
    purpose: 'Replace entire resource',
    idempotent: true,
    safe: false,
    body: true,
  },
  PATCH: {
    purpose: 'Partial update',
    idempotent: true,
    safe: false,
    body: true,
  },
  DELETE: {
    purpose: 'Remove resource',
    idempotent: true,
    safe: false,
    body: false,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

export const RESPONSE_FORMAT = {
  // Success response
  success: {
    single: `
      {
        "data": { ... },
        "meta": {
          "requestId": "req_abc123"
        }
      }
    `,
    list: `
      {
        "data": [ ... ],
        "meta": {
          "page": 1,
          "pageSize": 20,
          "total": 156,
          "totalPages": 8,
          "hasNext": true,
          "hasPrev": false,
          "requestId": "req_abc123"
        }
      }
    `,
    empty: `
      {
        "data": null,
        "meta": {
          "requestId": "req_abc123"
        }
      }
    `,
  },

  // Error response
  error: `
    {
      "error": {
        "code": "AUTH_LOGIN_INVALID_CREDENTIALS",
        "message": "Email or password is incorrect",
        "details": {
          "field": "email",
          "reason": "not_found"
        }
      },
      "meta": {
        "requestId": "req_abc123",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  `,

  // TypeScript types
  types: `
    interface ApiResponse<T> {
      data: T;
      meta: ResponseMeta;
    }

    interface ApiListResponse<T> {
      data: T[];
      meta: ListMeta;
    }

    interface ApiError {
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
      meta: ResponseMeta;
    }

    interface ResponseMeta {
      requestId: string;
      timestamp?: string;
    }

    interface ListMeta extends ResponseMeta {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  `,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP STATUS CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const STATUS_CODES = {
  // Success
  200: { name: 'OK', use: 'Successful GET, PUT, PATCH, DELETE' },
  201: { name: 'Created', use: 'Successful POST that creates resource' },
  204: { name: 'No Content', use: 'Successful DELETE with no response body' },

  // Redirect
  301: { name: 'Moved Permanently', use: 'Resource URL changed permanently' },
  302: { name: 'Found', use: 'Temporary redirect' },

  // Client errors
  400: { name: 'Bad Request', use: 'Invalid request body or params' },
  401: { name: 'Unauthorized', use: 'Missing or invalid authentication' },
  402: { name: 'Payment Required', use: 'Payment failed or required' },
  403: { name: 'Forbidden', use: 'Authenticated but not authorized' },
  404: { name: 'Not Found', use: 'Resource does not exist' },
  405: { name: 'Method Not Allowed', use: 'HTTP method not supported' },
  409: { name: 'Conflict', use: 'Resource already exists (duplicate)' },
  413: { name: 'Payload Too Large', use: 'Request body too large' },
  415: { name: 'Unsupported Media Type', use: 'Invalid content type' },
  422: { name: 'Unprocessable Entity', use: 'Validation failed' },
  429: { name: 'Too Many Requests', use: 'Rate limit exceeded' },

  // Server errors
  500: { name: 'Internal Server Error', use: 'Unexpected server error' },
  502: { name: 'Bad Gateway', use: 'Upstream service error' },
  503: { name: 'Service Unavailable', use: 'Server temporarily unavailable' },
  504: { name: 'Gateway Timeout', use: 'Upstream service timeout' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const ERROR_CODES = {
  // Format: DOMAIN_ACTION_ERROR
  // This creates self-documenting, greppable error codes

  // Authentication
  AUTH_LOGIN_INVALID_CREDENTIALS: { status: 401, message: 'Email or password is incorrect' },
  AUTH_LOGIN_ACCOUNT_LOCKED: { status: 423, message: 'Account locked due to too many failed attempts' },
  AUTH_SESSION_EXPIRED: { status: 401, message: 'Session has expired, please log in again' },
  AUTH_SESSION_INVALID: { status: 401, message: 'Invalid session' },
  AUTH_TOKEN_MISSING: { status: 401, message: 'Authentication token is required' },
  AUTH_TOKEN_INVALID: { status: 401, message: 'Authentication token is invalid' },
  AUTH_TOKEN_EXPIRED: { status: 401, message: 'Authentication token has expired' },
  AUTH_MFA_REQUIRED: { status: 403, message: 'Multi-factor authentication required' },
  AUTH_MFA_INVALID: { status: 401, message: 'Invalid MFA code' },
  AUTH_PERMISSION_DENIED: { status: 403, message: 'You do not have permission to perform this action' },

  // User
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  USER_EMAIL_EXISTS: { status: 409, message: 'Email already registered' },
  USER_EMAIL_INVALID: { status: 422, message: 'Invalid email format' },
  USER_PASSWORD_WEAK: { status: 422, message: 'Password does not meet requirements' },
  USER_PROFILE_INCOMPLETE: { status: 422, message: 'Profile information incomplete' },

  // Tenant
  TENANT_NOT_FOUND: { status: 404, message: 'Tenant not found' },
  TENANT_SLUG_EXISTS: { status: 409, message: 'Tenant slug already taken' },
  TENANT_MEMBER_EXISTS: { status: 409, message: 'User is already a member' },
  TENANT_MEMBER_NOT_FOUND: { status: 404, message: 'Member not found in tenant' },

  // Billing
  BILLING_PAYMENT_FAILED: { status: 402, message: 'Payment failed' },
  BILLING_PAYMENT_DECLINED: { status: 402, message: 'Payment was declined' },
  BILLING_CARD_EXPIRED: { status: 402, message: 'Card has expired' },
  BILLING_SUBSCRIPTION_REQUIRED: { status: 402, message: 'Active subscription required' },
  BILLING_SUBSCRIPTION_CANCELED: { status: 403, message: 'Subscription has been canceled' },
  BILLING_QUOTA_EXCEEDED: { status: 429, message: 'Plan quota exceeded' },

  // Build (OLYMPUS specific)
  BUILD_NOT_FOUND: { status: 404, message: 'Build not found' },
  BUILD_QUOTA_EXCEEDED: { status: 429, message: 'Build quota exceeded for current plan' },
  BUILD_AGENT_FAILED: { status: 500, message: 'Build agent encountered an error' },
  BUILD_AGENT_TIMEOUT: { status: 504, message: 'Build agent timed out' },
  BUILD_VALIDATION_FAILED: { status: 422, message: 'Build output failed validation' },

  // Upload
  UPLOAD_FILE_TOO_LARGE: { status: 413, message: 'File exceeds maximum size limit' },
  UPLOAD_INVALID_TYPE: { status: 415, message: 'File type not allowed' },
  UPLOAD_QUOTA_EXCEEDED: { status: 429, message: 'Storage quota exceeded' },
  UPLOAD_FAILED: { status: 500, message: 'File upload failed' },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Too many requests, please slow down' },
  RATE_LIMIT_API_KEY: { status: 429, message: 'API key rate limit exceeded' },

  // Validation
  VALIDATION_FAILED: { status: 422, message: 'Request validation failed' },
  VALIDATION_REQUIRED_FIELD: { status: 422, message: 'Required field missing' },
  VALIDATION_INVALID_FORMAT: { status: 422, message: 'Invalid field format' },

  // Server
  SERVER_INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred' },
  SERVER_DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
  SERVER_EXTERNAL_SERVICE: { status: 502, message: 'External service error' },
  SERVER_MAINTENANCE: { status: 503, message: 'Server is under maintenance' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGINATION = {
  // Default values
  defaults: {
    pageSize: 20,
    maxPageSize: 100,
  },

  // Cursor-based (for infinite scroll, real-time data)
  cursor: {
    params: '?cursor={lastId}&limit=20',
    response: `
      {
        "data": [...],
        "meta": {
          "nextCursor": "abc123",
          "hasMore": true
        }
      }
    `,
    useWhen: ['Infinite scroll', 'Real-time feeds', 'Large datasets'],
  },

  // Offset-based (for admin tables, numbered pages)
  offset: {
    params: '?page=1&pageSize=20',
    response: `
      {
        "data": [...],
        "meta": {
          "page": 1,
          "pageSize": 20,
          "total": 156,
          "totalPages": 8
        }
      }
    `,
    useWhen: ['Admin tables', 'Search results', 'Reports'],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING & SORTING
// ═══════════════════════════════════════════════════════════════════════════════

export const FILTERING = {
  // Query param format
  format: 'Query parameters',

  // Examples
  examples: {
    equality: '?status=active',
    multiple: '?status=active,pending',
    range: '?createdAt[gte]=2024-01-01&createdAt[lt]=2024-02-01',
    search: '?q=search+term',
    sort: '?sort=-createdAt,name', // - prefix for descending
  },

  // Operators
  operators: {
    eq: 'Equal (default)',
    ne: 'Not equal',
    gt: 'Greater than',
    gte: 'Greater than or equal',
    lt: 'Less than',
    lte: 'Less than or equal',
    in: 'In list',
    nin: 'Not in list',
    like: 'Pattern match (use with caution)',
  },

  // Sort format
  sorting: {
    ascending: 'sort=fieldName',
    descending: 'sort=-fieldName',
    multiple: 'sort=-createdAt,name',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const API_AUTH = {
  // Default: Protected (opt-out model)
  default: 'PROTECTED',

  // Token location
  token: {
    type: 'JWT',
    location: 'httpOnly cookie',
    header: 'Authorization: Bearer {token}', // For API keys
  },

  // Public routes (explicit allowlist)
  publicRoutes: [
    '/api/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/callback/*',
    '/api/v1/webhooks/*',
  ],

  // API Keys (for external access)
  apiKeys: {
    header: 'X-API-Key',
    scopes: ['read', 'write', 'admin'],
    rateLimit: 'separate from user rate limit',
  },

  // Rate limiting by plan
  rateLimits: {
    starter: { requests: 100, window: '1m' },
    pro: { requests: 500, window: '1m' },
    enterprise: { requests: 2000, window: '1m' },
    apiKey: { requests: 1000, window: '1m' },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES (for API Gate)
// ═══════════════════════════════════════════════════════════════════════════════

export const API_VALIDATION_RULES = [
  {
    id: 'url-versioned',
    description: 'API URLs must be versioned (/api/v1/...)',
    severity: 'error',
  },
  {
    id: 'url-plural-nouns',
    description: 'Resource names must be plural nouns',
    severity: 'error',
  },
  {
    id: 'url-no-verbs',
    description: 'URLs must not contain verbs (use HTTP methods)',
    severity: 'error',
  },
  {
    id: 'response-envelope',
    description: 'Responses must use { data, error, meta } envelope',
    severity: 'error',
  },
  {
    id: 'error-code-format',
    description: 'Error codes must be DOMAIN_ACTION_ERROR format',
    severity: 'error',
  },
  {
    id: 'status-code-correct',
    description: 'HTTP status codes must match the situation',
    severity: 'error',
  },
  {
    id: 'auth-default-protected',
    description: 'Routes must be protected unless explicitly public',
    severity: 'error',
  },
  {
    id: 'input-validated',
    description: 'All inputs must be validated with Zod',
    severity: 'error',
  },
  {
    id: 'pagination-supported',
    description: 'List endpoints must support pagination',
    severity: 'warning',
  },
  {
    id: 'rate-limit-applied',
    description: 'Public endpoints must have rate limiting',
    severity: 'warning',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface NexusOutput {
  endpoints: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description: string;
    auth: 'public' | 'protected' | 'api_key';
    request?: {
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
    };
    response: {
      success: Record<string, unknown>;
      errors: string[]; // Error codes from registry
    };
  }[];
  schemas: {
    name: string;
    type: 'request' | 'response';
    zodSchema: string;
  }[];
  errorCodes: string[]; // Used error codes
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const API_RULES = {
  style: API_STYLE,
  urls: URL_PATTERNS,
  methods: HTTP_METHODS,
  response: RESPONSE_FORMAT,
  status: STATUS_CODES,
  errors: ERROR_CODES,
  pagination: PAGINATION,
  filtering: FILTERING,
  auth: API_AUTH,
  validation: API_VALIDATION_RULES,
};
