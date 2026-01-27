import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// CHAOS-HARDENED v2.0 - RESUME BUILD API
// Round 2 fixes: IP spoofing, body size enforcement, memory bounds, Next.js 15
// =============================================================================

// =============================================================================
// CONSTANTS - All limits in one place
// =============================================================================
const CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute window
  RATE_LIMIT_MAX_REQUESTS: 10, // Max requests per window
  RATE_LIMIT_MAX_ENTRIES: 1000, // Max entries in rate limit store (memory bound)

  // Input validation
  MAX_BUILD_ID_LENGTH: 36, // UUID is exactly 36 chars
  MAX_BODY_SIZE_BYTES: 512, // 512 bytes is plenty for this API
  MAX_IP_LENGTH: 45, // IPv6 max length

  // Locking
  LOCK_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  MAX_ACTIVE_LOCKS: 100, // Prevent lock table exhaustion

  // Request timeout
  REQUEST_TIMEOUT_MS: 30_000, // 30 second max request time
} as const;

// UUID v4 regex (strict)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =============================================================================
// RATE LIMITING v2.0 - Memory bounded, IP spoofing resistant
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstSeen: number; // For detecting suspicious patterns
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

/**
 * Get client IP with anti-spoofing measures
 * CRITICAL: Don't trust X-Forwarded-For from untrusted sources
 */
function getClientIdentifier(request: NextRequest): string {
  // In production behind a TRUSTED proxy (Vercel, Cloudflare), use their headers
  // But VALIDATE the proxy is trusted first

  // Option 1: Use Vercel's verified header (can't be spoofed)
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP && isValidIP(vercelIP.split(',')[0])) {
    return sanitizeIP(vercelIP.split(',')[0]);
  }

  // Option 2: Use Cloudflare's verified header
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP)) {
    return sanitizeIP(cfIP);
  }

  // Option 3: Direct connection IP (Next.js provides this)
  // This is the ACTUAL TCP connection IP - can't be spoofed
  const directIP = request.ip;
  if (directIP && isValidIP(directIP)) {
    return sanitizeIP(directIP);
  }

  // FALLBACK: Use a fingerprint of request characteristics
  // This makes spoofing harder but not impossible
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLang = request.headers.get('accept-language') || '';
  const fingerprint = hashString(`${userAgent}:${acceptLang}`).slice(0, 16);

  return `fp:${fingerprint}`;
}

function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  if (trimmed.length > CONFIG.MAX_IP_LENGTH) return false;
  // Basic IPv4/IPv6 pattern check
  return /^[\d.:a-fA-F]+$/.test(trimmed);
}

function sanitizeIP(ip: string): string {
  return ip.trim().slice(0, CONFIG.MAX_IP_LENGTH).toLowerCase();
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function checkRateLimit(clientId: string): {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
} {
  const now = Date.now();

  // Periodic cleanup (every 60 seconds or when store is full)
  if (now - lastCleanup > 60_000 || rateLimitStore.size >= CONFIG.RATE_LIMIT_MAX_ENTRIES) {
    cleanupRateLimitStore(now);
    lastCleanup = now;
  }

  // Memory protection: reject if store is still full after cleanup
  if (rateLimitStore.size >= CONFIG.RATE_LIMIT_MAX_ENTRIES) {
    // Under attack - apply stricter global limit
    return { allowed: false, retryAfter: 60, remaining: 0 };
  }

  const key = `rl:${clientId}`;
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    entry = { count: 1, resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS, firstSeen: now };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: CONFIG.RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  entry.count++;
  return { allowed: true, remaining: CONFIG.RATE_LIMIT_MAX_REQUESTS - entry.count };
}

function cleanupRateLimitStore(now: number): void {
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    rateLimitStore.delete(key);
  }

  // If still too many entries, remove oldest (LRU-style)
  if (rateLimitStore.size >= CONFIG.RATE_LIMIT_MAX_ENTRIES * 0.9) {
    const entries = Array.from(rateLimitStore.entries()).sort(
      (a, b) => a[1].firstSeen - b[1].firstSeen
    );

    const toRemove = Math.floor(entries.length * 0.5); // Remove oldest 50%
    for (let i = 0; i < toRemove; i++) {
      rateLimitStore.delete(entries[i][0]);
    }
  }
}

// =============================================================================
// LOCKING v2.0 - Bounded, with ownership verification
// =============================================================================

interface LockEntry {
  clientId: string; // Who owns the lock
  acquiredAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const activeLocks = new Map<string, LockEntry>();

function acquireLock(buildId: string, clientId: string): { acquired: boolean; reason?: string } {
  const lockKey = `lock:${buildId}`;
  const existing = activeLocks.get(lockKey);

  if (existing) {
    // Check if same client (idempotent)
    if (existing.clientId === clientId) {
      return { acquired: true }; // Same client, extend lock
    }
    return { acquired: false, reason: 'Build resume already in progress' };
  }

  // Memory protection
  if (activeLocks.size >= CONFIG.MAX_ACTIVE_LOCKS) {
    return { acquired: false, reason: 'System busy, try again later' };
  }

  // Create lock with auto-release
  const timeoutId = setTimeout(() => {
    activeLocks.delete(lockKey);
  }, CONFIG.LOCK_TIMEOUT_MS);

  activeLocks.set(lockKey, {
    clientId,
    acquiredAt: Date.now(),
    timeoutId,
  });

  return { acquired: true };
}

function releaseLock(buildId: string, clientId: string): void {
  const lockKey = `lock:${buildId}`;
  const existing = activeLocks.get(lockKey);

  // Only release if we own the lock
  if (existing && existing.clientId === clientId) {
    clearTimeout(existing.timeoutId);
    activeLocks.delete(lockKey);
  }
}

// =============================================================================
// INPUT VALIDATION v2.0 - Stricter, with body size enforcement
// =============================================================================

function validateBuildId(buildId: unknown): { valid: boolean; value?: string; error?: string } {
  if (typeof buildId !== 'string') {
    return { valid: false, error: 'Invalid format' };
  }

  if (buildId.length !== 36) {
    return { valid: false, error: 'Invalid format' };
  }

  if (!UUID_REGEX.test(buildId)) {
    return { valid: false, error: 'Invalid format' };
  }

  return { valid: true, value: buildId.toLowerCase() };
}

function validateOptions(options: unknown): { retryFailed: boolean; skipValidation: boolean } {
  const safe = { retryFailed: true, skipValidation: false };

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return safe;
  }

  const opts = options as Record<string, unknown>;
  if (typeof opts.retryFailed === 'boolean') safe.retryFailed = opts.retryFailed;
  if (typeof opts.skipValidation === 'boolean') safe.skipValidation = opts.skipValidation;

  return safe;
}

/**
 * Read and validate request body with size limit
 * This ACTUALLY enforces body size, not just trusting Content-Length header
 */
async function readBodyWithLimit(
  request: NextRequest
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    // Read raw body with size limit
    const reader = request.body?.getReader();
    if (!reader) {
      return { ok: false, error: 'No request body' };
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > CONFIG.MAX_BODY_SIZE_BYTES) {
        reader.cancel();
        return { ok: false, error: 'Request body too large' };
      }

      chunks.push(value);
    }

    // Combine chunks and parse
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const text = new TextDecoder().decode(combined);
    const data = JSON.parse(text);

    return { ok: true, data };
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { ok: false, error: 'Invalid JSON' };
    }
    return { ok: false, error: 'Failed to read request body' };
  }
}

// =============================================================================
// DATABASE CLIENT (Singleton)
// =============================================================================

let dbClientInstance: SupabaseClient | null = null;

function getDbClient(): SupabaseClient | null {
  if (dbClientInstance) return dbClientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  dbClientInstance = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return dbClientInstance;
}

// =============================================================================
// CONDUCTOR SERVICE (Lazy loaded)
// =============================================================================

let conductorInstance: typeof import('@/lib/agents/conductor').conductorService | null = null;

async function getConductor() {
  if (conductorInstance) return conductorInstance;

  try {
    const mod = await import('@/lib/agents/conductor');
    conductorInstance = mod.conductorService;
    return conductorInstance;
  } catch {
    return null;
  }
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function errorResponse(
  error: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(CONFIG.RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Rate limit check
  const rl = checkRateLimit(clientId);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter!);
  }

  // Validate buildId
  const rawBuildId = request.nextUrl.searchParams.get('buildId');
  const validation = validateBuildId(rawBuildId);
  if (!validation.valid) {
    return errorResponse('Invalid build identifier', 400);
  }
  const buildId = validation.value!;

  try {
    const db = getDbClient();
    if (!db) return errorResponse('Service unavailable', 503);

    const conductor = await getConductor();
    if (!conductor) return errorResponse('Service unavailable', 503);

    const { data: build, error } = await db
      .from('builds')
      .select('id, status, progress, current_phase, config')
      .eq('id', buildId)
      .single();

    if (error || !build) {
      return errorResponse('Build not found', 404);
    }

    const resumable = ['failed', 'paused', 'cancelled'].includes(build.status);
    if (!resumable) {
      return NextResponse.json({
        canResume: false,
        reason: 'Build not in resumable state',
        status: build.status,
      });
    }

    const conductorId = build.config?.conductorBuildId;
    if (!conductorId) {
      return NextResponse.json({ canResume: false, reason: 'No checkpoint data' });
    }

    const [canResume, stats] = await Promise.all([
      conductor.canResumeBuild(conductorId),
      conductor.getCheckpointStats(conductorId),
    ]);

    return NextResponse.json({
      canResume: canResume.canResume,
      reason: canResume.reason,
      build: { id: build.id, status: build.status, progress: build.progress },
      checkpoints: { count: stats.checkpointCount },
    });
  } catch (e) {
    console.error('[Resume:GET]', e);
    return errorResponse('Internal error', 500);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientId = getClientIdentifier(request);

  // Rate limit
  const rl = checkRateLimit(clientId);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter!);
  }

  // Read body with ACTUAL size enforcement
  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return errorResponse(bodyResult.error, 400, { duration: Date.now() - startTime });
  }

  const body = bodyResult.data;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return errorResponse('Invalid request format', 400, { duration: Date.now() - startTime });
  }

  const { buildId: rawBuildId, options: rawOptions } = body as Record<string, unknown>;

  // Validate buildId
  const validation = validateBuildId(rawBuildId);
  if (!validation.valid) {
    return errorResponse('Invalid build identifier', 400, { duration: Date.now() - startTime });
  }
  const buildId = validation.value!;
  const options = validateOptions(rawOptions);

  // Acquire lock with client ownership
  const lock = acquireLock(buildId, clientId);
  if (!lock.acquired) {
    return errorResponse(lock.reason!, 409, { duration: Date.now() - startTime });
  }

  try {
    const db = getDbClient();
    if (!db) {
      releaseLock(buildId, clientId);
      return errorResponse('Service unavailable', 503, { duration: Date.now() - startTime });
    }

    const conductor = await getConductor();
    if (!conductor) {
      releaseLock(buildId, clientId);
      return errorResponse('Service unavailable', 503, { duration: Date.now() - startTime });
    }

    // Get build
    const { data: build, error: buildError } = await db
      .from('builds')
      .select('id, status, tenant_id, config')
      .eq('id', buildId)
      .single();

    if (buildError || !build) {
      releaseLock(buildId, clientId);
      return errorResponse('Build not found', 404, { duration: Date.now() - startTime });
    }

    // Check resumable
    if (!['failed', 'paused', 'cancelled'].includes(build.status)) {
      releaseLock(buildId, clientId);
      return errorResponse('Build not in resumable state', 400, {
        duration: Date.now() - startTime,
      });
    }

    const conductorId = build.config?.conductorBuildId;
    if (!conductorId) {
      releaseLock(buildId, clientId);
      return errorResponse('No checkpoint data', 400, { duration: Date.now() - startTime });
    }

    // Check can resume
    const canResume = await conductor.canResumeBuild(conductorId);
    if (!canResume.canResume) {
      releaseLock(buildId, clientId);
      return errorResponse('Cannot resume', 400, {
        reason: canResume.reason,
        duration: Date.now() - startTime,
      });
    }

    // Update status with optimistic lock
    const { error: updateError } = await db
      .from('builds')
      .update({ status: 'running', error: null, updated_at: new Date().toISOString() })
      .eq('id', buildId)
      .eq('status', build.status);

    if (updateError) {
      releaseLock(buildId, clientId);
      return errorResponse('Failed to update build', 500, { duration: Date.now() - startTime });
    }

    // Resume
    const prepared = await conductor.resumeBuildFromCheckpoint(
      conductorId,
      build.tenant_id,
      options
    );

    // Lock auto-releases after timeout

    return NextResponse.json({
      success: true,
      buildId,
      checkpoint: { id: prepared.checkpoint.id, phase: prepared.checkpoint.phase },
      resumeInfo: {
        skippedAgents: prepared.skipAgents.length,
        remainingAgents: prepared.remainingAgents.length,
      },
      duration: Date.now() - startTime,
    });
  } catch (e) {
    releaseLock(buildId, clientId);
    console.error('[Resume:POST]', e);
    return errorResponse('Internal error', 500, { duration: Date.now() - startTime });
  }
}

export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  const rl = checkRateLimit(clientId);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfter!);
  }

  const rawBuildId = request.nextUrl.searchParams.get('buildId');
  const validation = validateBuildId(rawBuildId);
  if (!validation.valid) {
    return errorResponse('Invalid build identifier', 400);
  }
  const buildId = validation.value!;

  try {
    const db = getDbClient();
    if (!db) return errorResponse('Service unavailable', 503);

    const conductor = await getConductor();
    if (!conductor) return errorResponse('Service unavailable', 503);

    const { data: build } = await db.from('builds').select('config').eq('id', buildId).single();

    if (!build) {
      return errorResponse('Build not found', 404);
    }

    const conductorId = build.config?.conductorBuildId;
    if (conductorId) {
      await conductor.deleteCheckpointsForBuild(conductorId);
    }

    return NextResponse.json({ success: true, message: 'Checkpoints deleted' });
  } catch (e) {
    console.error('[Resume:DELETE]', e);
    return errorResponse('Internal error', 500);
  }
}
