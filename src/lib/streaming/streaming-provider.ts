import { StreamController } from './stream-controller';
import { StreamConfig, StreamCompleteEvent, StreamErrorEvent } from './types';

/**
 * Streaming response from AI provider
 */
export interface StreamingResponse {
  controller: StreamController;
  content: () => string;
  waitForComplete: () => Promise<string>;
}

/**
 * Options for streaming completion
 */
export interface StreamingCompletionOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  streamConfig?: Partial<StreamConfig>;
  signal?: AbortSignal;
}

/**
 * Anthropic client interface (minimal)
 */
interface AnthropicClient {
  messages: {
    stream: (options: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
    }) => AsyncIterable<{
      type: string;
      delta?: { text?: string };
    }>;
  };
}

/**
 * OpenAI client interface (minimal)
 */
interface OpenAIClient {
  chat: {
    completions: {
      create: (options: {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        stream: boolean;
      }) => AsyncIterable<{
        choices: Array<{ delta?: { content?: string } }>;
      }>;
    };
  };
}

/**
 * Wrap Anthropic streaming API
 */
export async function streamAnthropicCompletion(
  client: AnthropicClient,
  options: StreamingCompletionOptions
): Promise<StreamingResponse> {
  const controller = new StreamController(options.streamConfig);

  await controller.start({
    model: options.model,
    agentId: undefined, // Set by caller if needed
  });

  // Start streaming in background
  (async () => {
    try {
      const stream = await client.messages.stream({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        messages: options.messages,
        temperature: options.temperature,
      });

      for await (const event of stream) {
        if (controller.getSignal().aborted || options.signal?.aborted) {
          controller.abort();
          break;
        }

        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta && 'text' in delta && delta.text) {
            await controller.pushChunk(delta.text);
          }
        }
      }

      await controller.complete();
    } catch (error) {
      await controller.error(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return {
    controller,
    content: () => controller.getContent(),
    waitForComplete: () => new Promise((resolve, reject) => {
      const unsubscribe = controller.subscribe((event) => {
        if (event.type === 'stream:complete') {
          unsubscribe();
          resolve((event as StreamCompleteEvent).data.content);
        } else if (event.type === 'stream:error') {
          unsubscribe();
          reject(new Error((event as StreamErrorEvent).data.error.message));
        }
      });
    }),
  };
}

/**
 * Wrap OpenAI streaming API
 */
export async function streamOpenAICompletion(
  client: OpenAIClient,
  options: StreamingCompletionOptions
): Promise<StreamingResponse> {
  const controller = new StreamController(options.streamConfig);

  await controller.start({
    model: options.model,
  });

  // Start streaming in background
  (async () => {
    try {
      const stream = await client.chat.completions.create({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        if (controller.getSignal().aborted || options.signal?.aborted) {
          controller.abort();
          break;
        }

        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          await controller.pushChunk(content);
        }
      }

      await controller.complete();
    } catch (error) {
      await controller.error(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return {
    controller,
    content: () => controller.getContent(),
    waitForComplete: () => new Promise((resolve, reject) => {
      const unsubscribe = controller.subscribe((event) => {
        if (event.type === 'stream:complete') {
          unsubscribe();
          resolve((event as StreamCompleteEvent).data.content);
        } else if (event.type === 'stream:error') {
          unsubscribe();
          reject(new Error((event as StreamErrorEvent).data.error.message));
        }
      });
    }),
  };
}
