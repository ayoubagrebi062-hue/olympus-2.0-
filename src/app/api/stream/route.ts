import { NextRequest } from 'next/server';
import { StreamController } from '@/lib/streaming/stream-controller';
import { SSEEncoder } from '@/lib/streaming/sse-encoder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = 'claude-sonnet-4-20250514', buildId, agentId } = body;

    // Auth check
    const authToken = request.headers.get('authorization');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new SSEEncoder();

    // Create readable stream
    const stream = new ReadableStream({
      async start(streamController) {
        const controller = new StreamController();

        // Subscribe to stream events
        controller.subscribe((event) => {
          const encoded = encoder.encode(event);
          streamController.enqueue(encoded);
        });

        // Start the stream
        await controller.start({ buildId, agentId, model });

        try {
          // In production, this would call the actual AI provider
          // For now, simulate streaming
          const response = "This is a simulated streaming response. In production, this would stream from the AI provider.";

          for (const char of response) {
            await controller.pushToken(char);
            await new Promise(resolve => setTimeout(resolve, 20)); // Simulate delay
          }

          await controller.complete();
        } catch (error) {
          await controller.error(error instanceof Error ? error : new Error(String(error)));
        } finally {
          streamController.close();
        }
      },
    });

    return new Response(stream, {
      headers: SSEEncoder.getHeaders(),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
