/**
 * In-memory token store for password reset tokens
 * In production, use a database (PostgreSQL, Redis, etc.)
 */

interface TokenData {
  email: string;
  expiry: number;
}

class TokenStore {
  private tokens = new Map<string, TokenData>();

  set(token: string, data: TokenData): void {
    this.cleanup();
    this.tokens.set(token, data);
  }

  get(token: string): TokenData | undefined {
    this.cleanup();
    return this.tokens.get(token);
  }

  delete(token: string): boolean {
    return this.tokens.delete(token);
  }

  verify(token: string): { valid: boolean; email?: string } {
    const data = this.get(token);

    if (!data) {
      return { valid: false };
    }

    if (data.expiry < Date.now()) {
      this.delete(token);
      return { valid: false };
    }

    return { valid: true, email: data.email };
  }

  // Clean up expired tokens
  private cleanup(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    this.tokens.forEach((data, token) => {
      if (data.expiry < now) {
        expiredTokens.push(token);
      }
    });

    expiredTokens.forEach(token => this.tokens.delete(token));
  }
}

// Singleton instance
export const tokenStore = new TokenStore();
