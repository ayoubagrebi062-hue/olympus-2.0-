/**
 * API
 *
 * Anthropic API client with streaming support.
 *
 * LESSON: Dependency Injection
 * The Anthropic client is injected, not created here.
 * This makes it easy to:
 * - Test with mock clients
 * - Swap implementations
 * - Configure differently per environment
 */

import Anthropic from '@anthropic-ai/sdk';
import type { StreamingResponse, TokenCallback } from './types';
import {
  DEFAULT_MODEL,
  MAX_TOKENS,
  OLLAMA_URL,
  LOCAL_MODEL,
  LOCAL_MODEL_TIMEOUT_MS,
} from './config';
import { CancellationError, createError } from './errors';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * The system prompt that defines Vito's behavior.
 *
 * LESSON: Prompt Engineering Matters
 * A good system prompt is the difference between
 * "code that works" and "code that's production-ready".
 *
 * Key elements:
 * 1. Clear mandate (what we do)
 * 2. Standards (how we do it)
 * 3. Output format (what we return)
 * 4. Example (show, don't tell)
 */
const SYSTEM_PROMPT = `You are Vito, an expert TypeScript/React code generator.

YOUR MANDATE:
- Generate production-ready code, not prototypes
- Every component must be complete and functional
- Types must be strict and comprehensive
- Styling uses Tailwind CSS with good defaults
- Error handling where appropriate
- Accessibility basics included (aria labels, semantic HTML)

CODE STANDARDS:
- TypeScript strict mode compatible
- React functional components with hooks
- Named exports preferred
- Props interfaces defined
- No 'any' types unless absolutely necessary
- Comments only for non-obvious logic

OUTPUT FORMAT:
- Return ONLY a single code block
- No explanations before or after
- No "Here's the code" or similar phrases
- The code block should be the entire response

EXAMPLE OUTPUT:
\`\`\`tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = "primary",
  disabled = false
}: ButtonProps) {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`\${baseStyles} \${variants[variant]}\`}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}
\`\`\``;

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

/**
 * Lazy-initialized Anthropic client.
 *
 * WHY lazy?
 * - Don't create if never used
 * - Picks up env vars at runtime
 * - Can be replaced for testing
 */
let client: Anthropic | null = null;

/**
 * Get or create the Anthropic client.
 */
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Set a custom client (for testing).
 */
export function setClient(customClient: Anthropic): void {
  client = customClient;
}

/**
 * Reset to default client.
 */
export function resetClient(): void {
  client = null;
}

// ============================================================================
// STREAMING API
// ============================================================================

/**
 * Call the Anthropic API with streaming.
 *
 * @param task - The user's request
 * @param context - Optional additional context
 * @param model - Model to use (defaults to Sonnet)
 * @param onToken - Callback for each token
 * @param signal - AbortSignal for cancellation
 * @returns The complete response with token count
 *
 * LESSON: Streaming improves perceived performance.
 * Users see progress immediately instead of waiting.
 */
export async function streamGeneration(
  task: string,
  context: string | undefined,
  model: string | undefined,
  onToken: TokenCallback,
  signal?: AbortSignal
): Promise<StreamingResponse> {
  // Build the user prompt
  let userPrompt = task;
  if (context) {
    userPrompt = `Context:\n${context}\n\n${task}`;
  }

  try {
    const stream = await getClient().messages.stream({
      model: model || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let content = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      // Check for cancellation
      if (signal?.aborted) {
        stream.controller.abort();
        throw new CancellationError();
      }

      // Handle different event types
      switch (event.type) {
        case 'content_block_delta':
          if (event.delta.type === 'text_delta') {
            content += event.delta.text;
            onToken(event.delta.text);
          }
          break;

        case 'message_start':
          if (event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
          break;

        case 'message_delta':
          if (event.usage) {
            outputTokens = event.usage.output_tokens;
          }
          break;
      }
    }

    return {
      content,
      tokens: inputTokens + outputTokens,
    };
  } catch (error) {
    throw createError(error);
  }
}

// ============================================================================
// LOCAL MODEL FALLBACK
// ============================================================================

/**
 * Try to generate using local Ollama model.
 *
 * @param task - The user's request
 * @param onToken - Optional callback for streaming
 * @param signal - AbortSignal for cancellation
 * @returns Generated content or null if failed
 *
 * LESSON: Always have a fallback.
 * When the cloud is down, local saves the day.
 */
export async function tryLocalGeneration(
  task: string,
  onToken?: TokenCallback,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOCAL_MODEL_TIMEOUT_MS);

    // Make request
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        prompt: `You are a TypeScript/React code generator. Generate production-ready code for:\n\n${task}\n\nReturn only a code block, no explanations.`,
        stream: true,
      }),
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    let content = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            content += data.response;
            onToken?.(data.response);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return content || null;
  } catch {
    return null;
  }
}

// ============================================================================
// CONNECTION CHECK
// ============================================================================

/**
 * Check if we can reach the Anthropic API.
 *
 * @param signal - AbortSignal for cancellation
 * @returns true if online, false if offline
 */
export async function checkConnection(signal?: AbortSignal): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch('https://api.anthropic.com', {
      method: 'HEAD',
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
