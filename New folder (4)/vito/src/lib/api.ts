// API client for interacting with the backend

interface BuildResponse {
  buildId: string;
  sessionId: string;
  tokens: number;
}

interface TokenResponse {
  sessionId: string;
  tokens: number;
}

const API_BASE = '/api/v1';

async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export const buildApi = {
  startBuild: async (prompt: string, sessionId: string): Promise<BuildResponse> => {
    return apiPost<BuildResponse>('/guest/build', { prompt, sessionId });
  },
  checkTokens: async (sessionId: string): Promise<TokenResponse> => {
    return apiGet<TokenResponse>(`/guest/build?sessionId=${sessionId}`);
  },
};
