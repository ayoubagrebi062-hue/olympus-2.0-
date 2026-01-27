import React from 'react';
import { useBuilds } from '@/hooks/useBuilds';
import { useRouter } from 'next/router';

export function BuildList() {
  const { data, error, isLoading } = useBuilds();
  const router = useRouter();

  if (isLoading) return <p>Loading builds...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Build List</h2>
      <ul>
        {data.map(build => (
          <li key={build.id} className="mb-2">
            <button
              onClick={() => router.push(`/console/builds/${build.id}`)}
              className="text-primary underline"
            >
              {build.name} - {build.status}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}