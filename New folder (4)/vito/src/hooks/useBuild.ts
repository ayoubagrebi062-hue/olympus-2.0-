// Hook for managing build process and tokens
import { useState, useEffect, useCallback } from 'react';
import { buildApi } from '../lib/api';

export const useBuild = (initialPrompt: string) => {
  const [tokens, setTokens] = useState(5);
  const [sessionId, setSessionId] = useState('');
  const [buildId, setBuildId] = useState('');
  const [status, setStatus] = useState('');

  const startBuild = async () => {
    const result = await buildApi.startBuild(initialPrompt, sessionId);
    setBuildId(result.buildId);
    setSessionId(result.sessionId);
    setTokens(result.tokens);
    setStatus('Building...');
  };

  const checkTokens = useCallback(async () => {
    if (!sessionId) return;
    const result = await buildApi.checkTokens(sessionId);
    setTokens(result.tokens);
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(checkTokens, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, checkTokens]);

  return { tokens, startBuild, buildId, status };
};
