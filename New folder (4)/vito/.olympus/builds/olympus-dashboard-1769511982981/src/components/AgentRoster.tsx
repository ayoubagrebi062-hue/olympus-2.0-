import React from 'react';
import { useAgents } from '@/hooks/useAgents';

export function AgentRoster() {
  const { data, error, isLoading } = useAgents();

  if (isLoading) return <p>Loading agents...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Agent Roster</h2>
      <ul className="space-y-2">
        {data.map(agent => (
          <li key={agent.name} className="flex justify-between">
            <span>{agent.name}</span>
            <span className="text-muted-foreground">{agent.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}