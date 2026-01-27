'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BuildDetail } from './components/BuildDetail';

export default function BuildDetailPage({ params }: { params: { buildId: string } }) {
  const [build, setBuild] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchBuild() {
      try {
        const res = await fetch(`/api/builds/${params.buildId}`);
        if (!res.ok) throw new Error('Failed to load build details');
        setBuild(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchBuild();
  }, [params.buildId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <BuildDetail build={build} />;
}