/**
 * OLYMPUS 2.1 - Architecture Blueprint Integration Tests
 *
 * Tests the validation gates against sample schemas, API routes, and code.
 */

import { describe, it, expect } from 'vitest';
import { schemaGate } from '../gates/schema-gate';
import { apiGate } from '../gates/api-gate';
import { securityGate } from '../gates/security-gate';
import { ArchitectureOrchestrator, validateArchitecture } from '../orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA GATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Schema Gate', () => {
  it('should pass valid Prisma schema', async () => {
    const validSchema = `
      model User {
        id        String   @id @default(cuid())
        email     String   @unique
        name      String?

        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt
        deletedAt DateTime?

        posts     Post[]

        @@index([email])
      }

      model Post {
        id        String   @id @default(cuid())
        title     String
        content   String?
        status    PostStatus @default(DRAFT)

        userId    String
        user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt

        @@index([userId])
        @@index([status])
      }

      enum PostStatus {
        DRAFT
        PUBLISHED
        ARCHIVED
      }
    `;

    const result = await schemaGate(validSchema);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.stats.tablesChecked).toBe(2);
  });

  it('should fail schema missing required fields', async () => {
    const invalidSchema = `
      model BadModel {
        id     Int     @id @default(autoincrement())
        name   String
      }
    `;

    const result = await schemaGate(invalidSchema);

    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.rule === 'required-timestamps')).toBe(true);
    expect(result.issues.some(i => i.rule === 'required-id')).toBe(true);
  });

  it('should flag missing FK indexes', async () => {
    const schemaNoIndex = `
      model Order {
        id        String   @id @default(cuid())
        userId    String

        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt
      }
    `;

    const result = await schemaGate(schemaNoIndex);

    expect(result.issues.some(i => i.rule === 'foreign-key-index')).toBe(true);
  });

  it('should flag wrong enum casing', async () => {
    const badEnumSchema = `
      enum Status {
        active
        pending
        completed
      }
    `;

    const result = await schemaGate(badEnumSchema);

    expect(result.issues.some(i => i.rule === 'enum-uppercase')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// API GATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('API Gate', () => {
  it('should pass valid API route', async () => {
    const files = [
      {
        path: 'src/app/api/v1/users/route.ts',
        content: `
          import { NextResponse } from 'next/server';
          import { createClient } from '@/lib/supabase/server';
          import { z } from 'zod';

          const createUserSchema = z.object({
            email: z.string().email(),
            name: z.string().min(1),
          });

          export async function GET() {
            const supabase = createClient();
            const { data: user } = await supabase.auth.getUser();

            if (!user) {
              return NextResponse.json({
                error: { code: 'AUTH_SESSION_INVALID', message: 'Not authenticated' }
              }, { status: 401 });
            }

            const users = await prisma.user.findMany();
            return NextResponse.json({ data: users });
          }

          export async function POST(request: Request) {
            const body = await request.json();
            const parsed = createUserSchema.safeParse(body);

            if (!parsed.success) {
              return NextResponse.json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid input' }
              }, { status: 422 });
            }

            const user = await prisma.user.create({ data: parsed.data });
            return NextResponse.json({ data: user }, { status: 201 });
          }
        `,
      },
    ];

    const result = await apiGate(files);

    expect(result.passed).toBe(true);
    expect(result.stats.apiRoutesChecked).toBe(1);
  });

  it('should flag missing auth check', async () => {
    const files = [
      {
        path: 'src/app/api/v1/products/route.ts',
        content: `
          import { NextResponse } from 'next/server';

          export async function GET() {
            const products = await getProducts();
            return NextResponse.json(products);
          }
        `,
      },
    ];

    const result = await apiGate(files);

    expect(result.issues.some(i => i.rule === 'auth-default-protected')).toBe(true);
  });

  it('should flag missing Zod validation on POST', async () => {
    const files = [
      {
        path: 'src/app/api/v1/orders/route.ts',
        content: `
          import { NextResponse } from 'next/server';
          import { createClient } from '@/lib/supabase/server';

          export async function POST(request: Request) {
            const supabase = createClient();
            const body = await request.json();
            const order = await createOrder(body);
            return NextResponse.json({ data: order });
          }
        `,
      },
    ];

    const result = await apiGate(files);

    expect(result.issues.some(i => i.rule === 'input-validated')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY GATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Gate', () => {
  it('should pass secure code', async () => {
    const files = [
      {
        path: 'src/lib/utils.ts',
        content: `
          import DOMPurify from 'dompurify';

          export function sanitizeHtml(html: string): string {
            return DOMPurify.sanitize(html);
          }

          export function formatPrice(cents: number): string {
            return (cents / 100).toFixed(2);
          }
        `,
      },
    ];

    const result = await securityGate(files);

    expect(result.passed).toBe(true);
    expect(result.stats.hasEval).toBe(false);
    expect(result.stats.hasHardcodedSecrets).toBe(false);
  });

  it('should flag eval usage', async () => {
    const files = [
      {
        path: 'src/lib/dangerous.ts',
        content: `
          export function runCode(code: string) {
            return eval(code);
          }
        `,
      },
    ];

    const result = await securityGate(files);

    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.rule === 'no-eval')).toBe(true);
    expect(result.stats.hasEval).toBe(true);
  });

  it('should flag innerHTML usage', async () => {
    const files = [
      {
        path: 'src/components/Renderer.tsx',
        content: `
          export function Renderer({ html }: { html: string }) {
            const ref = useRef<HTMLDivElement>(null);

            useEffect(() => {
              if (ref.current) {
                ref.current.innerHTML = html;
              }
            }, [html]);

            return <div ref={ref} />;
          }
        `,
      },
    ];

    const result = await securityGate(files);

    expect(result.issues.some(i => i.rule === 'no-innerHTML')).toBe(true);
    expect(result.stats.hasInnerHTML).toBe(true);
  });

  it('should flag localStorage for tokens', async () => {
    const files = [
      {
        path: 'src/lib/auth.ts',
        content: `
          export function saveToken(token: string) {
            localStorage.setItem('token', token);
          }

          export function getToken() {
            return localStorage.getItem('token');
          }
        `,
      },
    ];

    const result = await securityGate(files);

    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.rule === 'no-localstorage-secrets')).toBe(true);
  });

  it('should skip test files', async () => {
    const files = [
      {
        path: 'src/lib/utils.test.ts',
        content: `
          // Test file - eval allowed for testing
          const result = eval('1 + 1');
          expect(result).toBe(2);
        `,
      },
    ];

    const result = await securityGate(files);

    expect(result.stats.filesChecked).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Architecture Orchestrator', () => {
  it('should run all gates', async () => {
    const files = [
      {
        path: 'src/app/api/v1/users/route.ts',
        content: `
          import { NextResponse } from 'next/server';
          import { createClient } from '@/lib/supabase/server';

          export async function GET() {
            const supabase = createClient();
            const users = await prisma.user.findMany();
            return NextResponse.json({ data: users });
          }
        `,
      },
    ];

    const schema = `
      model User {
        id        String   @id @default(cuid())
        email     String   @unique
        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt
        @@index([email])
      }
    `;

    const result = await validateArchitecture(files, schema);

    expect(result.gates).toHaveProperty('schema');
    expect(result.gates).toHaveProperty('api');
    expect(result.gates).toHaveProperty('security');
    // Duration might be 0 on fast systems (sub-millisecond execution)
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should skip gates when requested', async () => {
    const orchestrator = new ArchitectureOrchestrator();

    const result = await orchestrator.validate([], undefined, {
      skipSchema: true,
      skipApi: true,
      skipSecurity: true,
    });

    expect(Object.keys(result.gates)).toHaveLength(0);
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle empty schema', async () => {
    const result = await schemaGate('');
    expect(result.stats.tablesChecked).toBe(0);
  });

  it('should handle empty files array', async () => {
    const apiResult = await apiGate([]);
    const securityResult = await securityGate([]);

    expect(apiResult.stats.apiRoutesChecked).toBe(0);
    expect(securityResult.stats.filesChecked).toBe(0);
  });

  it('should handle malformed schema', async () => {
    const badSchema = 'model { broken syntax }';
    const result = await schemaGate(badSchema);
    // Should not crash
    expect(result).toBeDefined();
  });
});
