'use client';

export default function PhaseProgression() {
  const phases = [
    { name: 'discovery', status: 'completed' },
    { name: 'design', status: 'active' },
    { name: 'architecture', status: 'pending' },
    { name: 'frontend', status: 'pending' },
    { name: 'backend', status: 'pending' },
    { name: 'integration', status: 'pending' },
    { name: 'testing', status: 'pending' },
    { name: 'deployment', status: 'pending' }
  ];

  return (
    <div>
      <h2 className="text-xl font-bold">Phase Progression</h2>
      <ul>
        {phases.map((phase) => (
          <li key={phase.name} className={phase.status}>{phase.name}</li>
        ))}
      </ul>
    </div>
  );
}