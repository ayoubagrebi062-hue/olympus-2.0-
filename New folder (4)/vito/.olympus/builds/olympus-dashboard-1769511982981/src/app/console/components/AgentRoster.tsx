'use client';

export default function AgentRoster() {
  const agents = [
    { name: 'Agent 1', role: 'discovery', status: 'idle', task: null },
    { name: 'Agent 2', role: 'design', status: 'working', task: 'Designing UI' }
    // More agents...
  ];

  return (
    <div>
      <h2 className="text-xl font-bold">Agent Roster</h2>
      <ul>
        {agents.map((agent) => (
          <li key={agent.name}>
            <span>{agent.name} - {agent.role}</span>
            <span>{agent.status} {agent.task && `(${agent.task})`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}