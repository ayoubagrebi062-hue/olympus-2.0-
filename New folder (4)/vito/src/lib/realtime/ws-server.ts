/**
 * OLYMPUS Standalone WebSocket Server
 *
 * Run separately from Next.js app.
 * Handles all realtime communication.
 *
 * Usage: npx ts-node src/lib/realtime/ws-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { handleConnection, handleDisconnection, handleCommand } from './server';
import { ServerEvent, ClientCommand } from './protocol';
import { safeJsonParse } from '@/lib/utils/safe-json';

// =============================================================================
// CONFIG
// =============================================================================

const PORT = parseInt(process.env.WS_PORT || '3001', 10);

// =============================================================================
// SERVER
// =============================================================================

const wss = new WebSocketServer({ port: PORT });

// Track connections
const connections = new Map<string, { ws: WebSocket; buildId: string }>();

wss.on('listening', () => {
  console.log(`[WS Server] Listening on port ${PORT}`);
});

wss.on('connection', (ws, req) => {
  // Extract build ID from URL path: /ws/build/:buildId
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'ws' || pathParts[1] !== 'build' || !pathParts[2]) {
    console.error('[WS Server] Invalid path:', url.pathname);
    ws.close(1002, 'Invalid path. Use /ws/build/:buildId');
    return;
  }

  const buildId = pathParts[2];
  const connectionId = generateConnectionId();

  console.log(`[WS Server] New connection: ${connectionId} for build ${buildId}`);

  // Store connection
  connections.set(connectionId, { ws, buildId });

  // Create send function for this connection
  const sendFn = (event: ServerEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  };

  // Register with server logic
  handleConnection(buildId, connectionId, sendFn);

  // Handle messages - 50X RELIABILITY: Safe JSON parsing to prevent DoS
  ws.on('message', (data) => {
    const command = safeJsonParse<ClientCommand | null>(
      data.toString(),
      null,
      'websocket:message'
    );

    if (!command) {
      console.warn(`[WS Server] Received malformed JSON from ${connectionId}, ignoring`);
      return; // Don't crash, just ignore bad messages
    }

    if (!command.type) {
      console.warn(`[WS Server] Received command without type from ${connectionId}, ignoring`);
      return;
    }

    console.log(`[WS Server] Command from ${connectionId}:`, command.type);
    handleCommand(connectionId, command);
  });

  // Handle close
  ws.on('close', (code, reason) => {
    console.log(`[WS Server] Connection closed: ${connectionId} (${code} ${reason})`);
    connections.delete(connectionId);
    handleDisconnection(connectionId);
  });

  // Handle error
  ws.on('error', (error) => {
    console.error(`[WS Server] Connection error: ${connectionId}`, error);
  });
});

wss.on('error', (error) => {
  console.error('[WS Server] Server error:', error);
});

// =============================================================================
// HELPERS
// =============================================================================

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n[WS Server] Shutting down...');

  // Close all connections
  for (const [connectionId, { ws }] of connections) {
    ws.close(1001, 'Server shutting down');
    handleDisconnection(connectionId);
  }

  wss.close(() => {
    console.log('[WS Server] Closed');
    process.exit(0);
  });
});

console.log('[WS Server] Starting...');
