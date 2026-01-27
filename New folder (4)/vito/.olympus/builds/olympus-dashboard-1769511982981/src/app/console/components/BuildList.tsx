'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function BuildList() {
  const [builds, setBuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  if (isLoading) return <div>Loading builds...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold">Build List</h2>
      <ul>
        {builds.map((build: any) => (
          <li key={build.id} onClick={() => router.push(`/console/builds/${build.id}`)}>
            {build.name}
          </li>
        ))}
      </ul>
    </div>
  );
}