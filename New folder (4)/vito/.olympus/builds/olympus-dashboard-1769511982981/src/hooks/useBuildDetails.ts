import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
}

export function useBuildDetails(buildId: string) {
  const { data, error } = useSWR(() => buildId ? `/api/builds/${buildId}` : null, fetcher);
  return {
    data,
    error,
    isLoading: !error && !data
  };
}