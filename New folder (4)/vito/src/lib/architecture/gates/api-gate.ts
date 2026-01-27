/**
 * OLYMPUS 2.1 - API Validation Gate
 * Validates API routes against NEXUS constraints.
 */

interface FileToCheck {
  path: string;
  content: string;
}

interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    apiRoutesChecked: number;
    hasVersioning: boolean;
    hasResponseEnvelope: boolean;
    hasAuthChecks: boolean;
  };
}

export const apiValidationGate = {
  name: 'API Gate',
  description: 'Validates API routes against NEXUS constraints',
  type: 'api',
};

function isApiRoute(path: string): boolean {
  return path.includes('/api/') && path.endsWith('route.ts');
}

function isPublicRoute(path: string): boolean {
  const publicPatterns = ['/api/health', '/api/v1/auth/', '/api/v1/webhooks/', '/api/auth/callback'];
  return publicPatterns.some(pattern => path.includes(pattern));
}

function checkResponseEnvelope(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const jsonResponses = content.match(/NextResponse\.json\(([^)]+)\)/g) || [];

  for (const response of jsonResponses) {
    if (!response.includes('data:') && !response.includes('error:') && !response.includes('{ data')) {
      if (response.includes('status') || response.includes('success') || response.includes('ok')) continue;
      issues.push({
        rule: 'response-envelope',
        message: 'API response should use { data: T } or { error: E } envelope',
        severity: 'warning',
        file: path,
        found: response.slice(0, 50) + '...',
        expected: 'NextResponse.json({ data: result })',
        autoFixable: false,
      });
    }
  }
  return issues;
}

function checkErrorCodeFormat(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const errorCodes = content.match(/code:\s*['"]([^'"]+)['"]/g) || [];

  for (const codeMatch of errorCodes) {
    const code = codeMatch.match(/['"]([^'"]+)['"]/)?.[1];
    if (!code) continue;
    if (!/^[A-Z]+_[A-Z]+(_[A-Z]+)*$/.test(code)) {
      issues.push({
        rule: 'error-code-format',
        message: `Error code "${code}" should be DOMAIN_ACTION_ERROR format`,
        severity: 'warning',
        file: path,
        found: code,
        expected: 'AUTH_LOGIN_FAILED, USER_NOT_FOUND, etc.',
        autoFixable: false,
      });
    }
  }
  return issues;
}

function checkAuthProtection(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  if (isPublicRoute(path)) return issues;

  const hasAuthCheck =
    content.includes('withAuth') ||
    content.includes('getSession') ||
    content.includes('auth()') ||
    content.includes('createClient') ||
    content.includes('supabase.auth') ||
    content.includes('getUser') ||
    content.includes('requireAuth');

  if (!hasAuthCheck) {
    issues.push({
      rule: 'auth-default-protected',
      message: 'API route should have authentication check',
      severity: 'warning',
      file: path,
      expected: 'Use withAuth() wrapper or check session',
      autoFixable: false,
    });
  }
  return issues;
}

function checkInputValidation(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const handlesMutation =
    content.includes('export async function POST') ||
    content.includes('export async function PUT') ||
    content.includes('export async function PATCH');

  if (handlesMutation) {
    const hasZodValidation =
      content.includes('z.object') ||
      content.includes('.parse(') ||
      content.includes('.safeParse(') ||
      content.includes('Schema.parse');

    if (!hasZodValidation) {
      issues.push({
        rule: 'input-validated',
        message: 'Mutation endpoints must validate input with Zod',
        severity: 'warning',
        file: path,
        expected: 'const parsed = schema.safeParse(body)',
        autoFixable: false,
      });
    }
  }
  return issues;
}

export async function apiGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  const apiRoutes = files.filter(f => isApiRoute(f.path));
  let hasVersioning = true;
  let hasResponseEnvelope = true;
  let hasAuthChecks = true;

  for (const file of apiRoutes) {
    const envelopeIssues = checkResponseEnvelope(file.content, file.path);
    if (envelopeIssues.length > 0) {
      hasResponseEnvelope = false;
      issues.push(...envelopeIssues);
    }

    const errorCodeIssues = checkErrorCodeFormat(file.content, file.path);
    issues.push(...errorCodeIssues);

    const authIssues = checkAuthProtection(file.content, file.path);
    if (authIssues.length > 0) {
      hasAuthChecks = false;
      issues.push(...authIssues);
    }

    const validationIssues = checkInputValidation(file.content, file.path);
    issues.push(...validationIssues);
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 2));

  return {
    passed: errorCount === 0,
    score,
    issues,
    stats: {
      apiRoutesChecked: apiRoutes.length,
      hasVersioning,
      hasResponseEnvelope,
      hasAuthChecks,
    },
  };
}

export default apiGate;
