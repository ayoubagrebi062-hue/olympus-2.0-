/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   STREAMING GENERATION - Real-Time Code As It's Written                       ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   What competitors have that we didn't:                                       ║
 * ║                                                                               ║
 * ║   Vercel v0:  ████████████████░░░░ "Creating login form..."                   ║
 * ║   Us before:  [........30 seconds of nothing........] "Here's your code"     ║
 * ║                                                                               ║
 * ║   Now:                                                                        ║
 * ║                                                                               ║
 * ║   for await (const chunk of vision.stream("Create a login form")) {          ║
 * ║     process.stdout.write(chunk.text);  // Real-time output!                  ║
 * ║   }                                                                           ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import Anthropic from '@anthropic-ai/sdk';
import { VisionErrorCode, createError, VisionError } from './core';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface StreamChunk {
  /** The type of chunk */
  type: 'text' | 'thinking' | 'done' | 'error';

  /** Text content (for 'text' and 'thinking' types) */
  text?: string;

  /** Full accumulated code so far */
  accumulated?: string;

  /** Progress estimate (0-1) */
  progress?: number;

  /** Error details (for 'error' type) */
  error?: VisionError;

  /** Final result (for 'done' type) */
  result?: StreamResult;
}

export interface StreamResult {
  /** The complete generated code */
  code: string;

  /** Total generation time (ms) */
  durationMs: number;

  /** Token usage */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };

  /** Trace ID for debugging */
  traceId: string;
}

export interface StreamOptions {
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;

  /** Called when thinking/reasoning (for extended thinking models) */
  onThinking?: (text: string) => void;

  /** Called on each text chunk */
  onText?: (text: string, accumulated: string) => void;

  /** Called with progress updates (0-1) */
  onProgress?: (progress: number) => void;
}

// ════════════════════════════════════════════════════════════════════════════════
// STREAMING GENERATOR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Stream code generation in real-time.
 *
 * @example
 * ```typescript
 * // As async iterator
 * for await (const chunk of visionStream("Create a login form")) {
 *   if (chunk.type === 'text') {
 *     process.stdout.write(chunk.text);
 *   }
 * }
 *
 * // With callbacks
 * const result = await visionStream("Create a dashboard", {
 *   onText: (text) => process.stdout.write(text),
 *   onProgress: (p) => updateProgressBar(p)
 * });
 * ```
 */
export async function* visionStream(
  prompt: string,
  options: StreamOptions = {}
): AsyncGenerator<StreamChunk, StreamResult, undefined> {
  const { timeout = 120_000, signal, onThinking, onText, onProgress } = options;

  const startTime = Date.now();
  const traceId = generateTraceId();

  // Get API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error = createError(
      VisionErrorCode.MISSING_API_KEY,
      'ANTHROPIC_API_KEY not set. Add it to your environment.'
    );
    yield { type: 'error', error };
    throw new Error(error.message);
  }

  const client = new Anthropic({ apiKey });

  // Build the prompt
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(prompt);

  let accumulated = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Create streaming request
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      stream.abort();
    }, timeout);

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        stream.abort();
      });
    }

    // Estimate progress based on expected output size
    const estimatedTokens = 2000; // Rough estimate for typical component
    let tokenCount = 0;

    // Process stream events
    for await (const event of stream) {
      // Check for cancellation
      if (signal?.aborted) {
        clearTimeout(timeoutId);
        const error = createError(VisionErrorCode.CANCELLED, 'Generation cancelled');
        yield { type: 'error', error };
        throw new Error(error.message);
      }

      if (event.type === 'content_block_delta') {
        const delta = event.delta;

        if ('text' in delta && delta.text) {
          const text = delta.text;
          accumulated += text;
          tokenCount += Math.ceil(text.length / 4); // Rough token estimate

          const progress = Math.min(0.95, tokenCount / estimatedTokens);
          onProgress?.(progress);

          // Check if this looks like thinking/reasoning
          if (accumulated.length < 200 && !accumulated.includes('```')) {
            onThinking?.(text);
            yield {
              type: 'thinking',
              text,
              progress,
            };
          } else {
            onText?.(text, accumulated);
            yield {
              type: 'text',
              text,
              accumulated,
              progress,
            };
          }
        }
      } else if (event.type === 'message_start' && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
    }

    clearTimeout(timeoutId);

    // Extract code from accumulated response
    const code = extractCode(accumulated);
    const durationMs = Date.now() - startTime;

    onProgress?.(1);

    const result: StreamResult = {
      code,
      durationMs,
      usage: {
        inputTokens,
        outputTokens,
      },
      traceId,
    };

    yield {
      type: 'done',
      progress: 1,
      result,
    };

    return result;
  } catch (error) {
    const visionError = createError(
      VisionErrorCode.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Stream failed',
      { cause: error instanceof Error ? error : undefined }
    );

    yield { type: 'error', error: visionError };
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SIMPLE STREAMING API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Stream to a callback - simplest streaming API.
 *
 * @example
 * ```typescript
 * const code = await streamTo("Create a form", (chunk) => {
 *   process.stdout.write(chunk);
 * });
 * ```
 */
export async function streamTo(
  prompt: string,
  onChunk: (text: string) => void,
  options?: Omit<StreamOptions, 'onText'>
): Promise<string> {
  let result: StreamResult | undefined;

  for await (const chunk of visionStream(prompt, { ...options, onText: onChunk })) {
    if (chunk.type === 'done') {
      result = chunk.result;
    }
  }

  if (!result) {
    throw new Error('Stream ended without result');
  }

  return result.code;
}

/**
 * Stream to console with nice formatting.
 *
 * @example
 * ```typescript
 * const code = await streamToConsole("Create a login form");
 * ```
 */
export async function streamToConsole(prompt: string, options?: StreamOptions): Promise<string> {
  console.log('\n🚀 Generating...\n');
  console.log('─'.repeat(60));

  let lastProgress = 0;
  let inCodeBlock = false;

  const result = await streamTo(
    prompt,
    text => {
      // Detect code block boundaries for formatting
      if (text.includes('```')) {
        inCodeBlock = !inCodeBlock;
      }
      process.stdout.write(text);
    },
    {
      ...options,
      onProgress: progress => {
        // Show progress bar every 10%
        const progressPercent = Math.floor(progress * 100);
        if (progressPercent >= lastProgress + 10) {
          lastProgress = progressPercent;
          // Move to start of line, clear, print progress
          process.stdout.write(`\r[${progressPercent}%] `);
        }
        options?.onProgress?.(progress);
      },
    }
  );

  console.log('\n' + '─'.repeat(60));
  console.log('✅ Done!\n');

  return result;
}

// ════════════════════════════════════════════════════════════════════════════════
// WEB STREAMING (Server-Sent Events)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create a ReadableStream for web/edge environments.
 * Perfect for Next.js API routes.
 *
 * @example
 * ```typescript
 * // Next.js API route
 * export async function POST(req: Request) {
 *   const { prompt } = await req.json();
 *   const stream = createWebStream(prompt);
 *   return new Response(stream, {
 *     headers: { 'Content-Type': 'text/event-stream' }
 *   });
 * }
 * ```
 */
export function createWebStream(
  prompt: string,
  options?: StreamOptions
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of visionStream(prompt, options)) {
          // Format as Server-Sent Event
          const data = JSON.stringify(chunk);
          const event = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(event));

          if (chunk.type === 'done' || chunk.type === 'error') {
            controller.close();
            return;
          }
        }
      } catch (error) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });
}

/**
 * Create SSE response for Next.js/Express.
 */
export function createSSEResponse(prompt: string, options?: StreamOptions): Response {
  return new Response(createWebStream(prompt, options), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

function generateTraceId(): string {
  return `vis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function buildSystemPrompt(): string {
  return `You are an expert React/TypeScript developer. Generate clean, production-ready code.

RULES:
1. Use TypeScript with proper types (never 'any')
2. Use Tailwind CSS for styling
3. Include all imports
4. Make components self-contained
5. Add proper error handling
6. Include loading and error states where appropriate
7. Use semantic HTML
8. Ensure accessibility (ARIA labels, keyboard navigation)

OUTPUT FORMAT:
- Start with a brief comment explaining the component
- Then provide the complete code in a single code block
- Use \`\`\`tsx for the code block`;
}

function buildUserPrompt(prompt: string): string {
  return `Create the following React component:

${prompt}

Provide complete, working code that I can copy and paste directly.`;
}

function extractCode(response: string): string {
  // Extract code from markdown code blocks
  const codeBlockRegex = /```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)```/g;
  const matches = Array.from(response.matchAll(codeBlockRegex));

  if (matches.length > 0) {
    // Return the largest code block (most likely the main component)
    return matches.map(m => m[1].trim()).sort((a, b) => b.length - a.length)[0];
  }

  // If no code blocks, return the whole response (might be raw code)
  return response.trim();
}

// ════════════════════════════════════════════════════════════════════════════════
// REACT HOOK (for client-side streaming)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * React hook for streaming generation.
 * Use this with the SSE endpoint.
 *
 * @example
 * ```typescript
 * // In your component
 * const { code, isStreaming, progress, error, generate } = useVisionStream();
 *
 * return (
 *   <div>
 *     <button onClick={() => generate("Create a form")}>
 *       Generate
 *     </button>
 *     {isStreaming && <ProgressBar value={progress} />}
 *     <pre>{code}</pre>
 *   </div>
 * );
 * ```
 *
 * Note: This is the hook signature. Implementation requires React.
 * Copy this to your React app and implement with useState/useCallback.
 */
export interface UseVisionStreamReturn {
  /** Current accumulated code */
  code: string;
  /** Is currently streaming */
  isStreaming: boolean;
  /** Progress (0-1) */
  progress: number;
  /** Error if any */
  error: Error | null;
  /** Start generation */
  generate: (prompt: string) => Promise<void>;
  /** Cancel current generation */
  cancel: () => void;
}

// Hook implementation example (for documentation)
export const useVisionStreamExample = `
import { useState, useCallback, useRef } from 'react';

export function useVisionStream(endpoint = '/api/vision/stream') {
  const [code, setCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (prompt: string) => {
    setIsStreaming(true);
    setCode('');
    setProgress(0);
    setError(null);

    abortRef.current = new AbortController();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\\n\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              setCode(data.accumulated);
              setProgress(data.progress);
            } else if (data.type === 'done') {
              setProgress(1);
            } else if (data.type === 'error') {
              setError(new Error(data.error.message));
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [endpoint]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { code, isStreaming, progress, error, generate, cancel };
}
`;
