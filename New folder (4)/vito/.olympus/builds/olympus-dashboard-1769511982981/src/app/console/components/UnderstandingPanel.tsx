'use client';

export default function UnderstandingPanel() {
  const components = ['Component A', 'Component B'];
  const decisions = ['Decision 1', 'Decision 2'];
  const risks = ['Risk 1', 'Risk 2'];

  return (
    <div>
      <h2 className="text-xl font-bold">Understanding Your Build</h2>
      <div>
        <h3>What was built</h3>
        <ul>
          {components.map((component) => (
            <li key={component}>{component}</li>
          ))}
        </ul>
        <h3>Why it was built this way</h3>
        <ul>
          {decisions.map((decision) => (
            <li key={decision}>{decision}</li>
          ))}
        </ul>
        <h3>Known risks</h3>
        <ul>
          {risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}