import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
}

export function useAgents() {
  const { data, error } = useSWR('/api/ai/agents', fetcher);
  return {
    data,
    error,
    isLoading: !error && !data
  };
}