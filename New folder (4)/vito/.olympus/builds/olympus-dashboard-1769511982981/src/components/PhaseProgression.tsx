import React from 'react';

export function PhaseProgression() {
  const phases = [
    'discovery',
    'design',
    'architecture',
    'frontend',
    'backend',
    'integration',
    'testing',
    'deployment'
  ];

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Phase Progression</h2>
      <ul className="space-y-2">
        {phases.map(phase => (
          <li key={phase} className="flex justify-between">
            <span>{phase}</span>
            <span className="text-muted-foreground">pending</span>
          </li>
        ))}
      </ul>
    </div>
  );
}