/**
 * Simple API - One function. Zero config.
 *
 *   const code = await vision("Create a login form");
 */

import { VisionOrchestratorV2, GenerationRequest, GenerationEvent } from './orchestrator-v2';
import { isErr } from './core';

export interface VisionOptions {
  quiet?: boolean;
  timeout?: number;
  withImages?: boolean;
  onProgress?: (event: ProgressEvent) => void;
}

export interface ProgressEvent {
  phase: 'start' | 'generating' | 'complete' | 'error';
  message: string;
  durationMs?: number;
}

export interface VisionResult {
  code: string;
  images?: Array<{ url: string; prompt: string }>;
  durationMs: number;
  traceId: string;
}

let orchestrator: VisionOrchestratorV2 | null = null;

const getOrchestrator = () => orchestrator ??= new VisionOrchestratorV2();

const HELP: Record<string, string> = {
  MISSING_API_KEY: 'Set ANTHROPIC_API_KEY',
  INVALID_API_KEY: 'Check key at console.anthropic.com',
  RATE_LIMITED: 'Wait and retry',
  PROMPT_TOO_LONG: 'Under 10,000 chars',
  TIMEOUT: 'Simplify prompt or increase timeout',
  CIRCUIT_OPEN: 'Service recovering, wait 30s',
};

export async function vision(prompt: string, options: VisionOptions = {}): Promise<string> {
  return (await visionFull(prompt, options)).code;
}

export async function visionFull(prompt: string, options: VisionOptions = {}): Promise<VisionResult> {
  const { quiet = false, timeout = 120_000, withImages = false, onProgress } = options;
  const orch = getOrchestrator();
  const start = Date.now();

  const emit = (phase: ProgressEvent['phase'], message: string, durationMs?: number) => {
    if (!quiet || onProgress) {
      onProgress?.({ phase, message, durationMs });
      if (!quiet && !onProgress) {
        const icon = { start: '>', generating: '.', complete: '+', error: '!' }[phase];
        console.log(`[${icon}] ${message}`);
      }
    }
  };

  let unsub: (() => void) | null = null;
  if (!quiet || onProgress) {
    unsub = orch.on((e: GenerationEvent) => {
      if (e.type === 'started') emit('start', 'Starting');
      if (e.type === 'code_started') emit('generating', 'Generating');
      if (e.type === 'completed' && e.success) emit('complete', `Done ${e.durationMs}ms`, e.durationMs);
    });
  }

  try {
    const result = await orch.generate({ prompt, options: { generateImages: withImages } }, { timeoutMs: timeout });

    if (isErr(result)) {
      emit('error', result.error.message);
      throw new Error(`${result.error.message}${HELP[result.error.code] ? ` — ${HELP[result.error.code]}` : ''}`);
    }

    if (!result.value.code) throw new Error('No code generated');

    return {
      code: result.value.code,
      images: withImages ? result.value.images.map(i => ({ url: i.url, prompt: i.prompt })) : undefined,
      durationMs: Date.now() - start,
      traceId: result.value.traceId,
    };
  } finally {
    unsub?.();
  }
}

vision.full = visionFull;
export default vision;
