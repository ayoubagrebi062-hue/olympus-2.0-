// src/lib/buildService.ts

interface TokenStore {
  [sessionId: string]: number;
}

interface BuildResult {
  buildId: string;
  sessionId: string;
  tokens: number;
}

interface TokenResult {
  sessionId: string;
  tokens: number;
}

const tokenStore: TokenStore = {};

export async function startBuild(prompt: string, sessionId: string): Promise<BuildResult> {
  // Logic to start the build process
  if (!tokenStore[sessionId] || tokenStore[sessionId] <= 0) {
    throw new Error('Insufficient tokens');
  }
  tokenStore[sessionId] -= 1; // Decrement token
  // Simulate build process
  const buildId = Math.random().toString(36).substring(2, 15);
  return { buildId, sessionId, tokens: tokenStore[sessionId] };
}

export async function checkTokens(sessionId: string): Promise<TokenResult> {
  return { sessionId, tokens: tokenStore[sessionId] || 0 };
}
