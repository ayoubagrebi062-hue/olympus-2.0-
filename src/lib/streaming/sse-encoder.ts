import { StreamEvent } from './types';

/**
 * Server-Sent Events encoder
 */
export class SSEEncoder {
  private encoder: TextEncoder;

  constructor() {
    this.encoder = new TextEncoder();
  }

  /**
   * Encode a stream event as SSE format
   */
  encode(event: StreamEvent): Uint8Array {
    const lines: string[] = [];

    // Event type
    lines.push(`event: ${event.type}`);

    // Event ID
    lines.push(`id: ${event.id}`);

    // Data (JSON)
    const data = JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
    });
    lines.push(`data: ${data}`);

    // Empty line to end event
    lines.push('');
    lines.push('');

    return this.encoder.encode(lines.join('\n'));
  }

  /**
   * Encode a comment (keepalive)
   */
  encodeComment(comment: string): Uint8Array {
    return this.encoder.encode(`: ${comment}\n\n`);
  }

  /**
   * Encode a retry directive
   */
  encodeRetry(ms: number): Uint8Array {
    return this.encoder.encode(`retry: ${ms}\n\n`);
  }

  /**
   * Create SSE headers
   */
  static getHeaders(): HeadersInit {
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    };
  }
}

/**
 * SSE decoder for client-side
 */
export class SSEDecoder {
  private buffer: string = '';

  /**
   * Decode SSE data into events
   */
  decode(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    // Split on double newlines
    const parts = this.buffer.split('\n\n');

    // Keep last incomplete part in buffer
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim()) continue;

      const event = this.parseEvent(part);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  private parseEvent(raw: string): StreamEvent | null {
    const lines = raw.split('\n');
    let eventType: string | null = null;
    let data: string | null = null;
    let id: string | null = null;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      } else if (line.startsWith('id:')) {
        id = line.slice(3).trim();
      }
    }

    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      } as StreamEvent;
    } catch {
      return null;
    }
  }

  /**
   * Reset decoder state
   */
  reset(): void {
    this.buffer = '';
  }
}
