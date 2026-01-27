// src/lib/tokenService.ts
// Token management for build sessions

const tokenStore: Record<string, number> = {};

export function initializeTokens(sessionId: string): void {
  tokenStore[sessionId] = 5; // Initialize with 5 tokens
}

export function useToken(sessionId: string): void {
  if (tokenStore[sessionId] > 0) {
    tokenStore[sessionId] -= 1;
  }
}

export function addTokens(sessionId: string, count: number): void {
  tokenStore[sessionId] = (tokenStore[sessionId] || 0) + count;
}

export function getTokens(sessionId: string): number {
  return tokenStore[sessionId] || 0;
}

export function hasTokens(sessionId: string): boolean {
  return (tokenStore[sessionId] || 0) > 0;
}
