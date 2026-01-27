'use client';

import { useEffect, useState } from 'react';

export function useBuilds() {
  const [builds, setBuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuilds() {
      try {
        const res = await fetch('/api/builds');
        if (!res.ok) throw new Error('Failed to load builds');
        setBuilds(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchBuilds();
  }, []);

  return { builds, isLoading, error };
}