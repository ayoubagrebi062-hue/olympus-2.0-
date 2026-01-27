'use client';

export default function ConstitutionalStatus() {
  const checks = [
    { article: 'No Shipping Without Understanding', status: 'compliant', explanation: 'All components are documented.' },
    { article: 'Constitutional Tests Pass', status: 'warning', explanation: 'Some tests are failing.' }
    // More checks...
  ];

  return (
    <div>
      <h2 className="text-xl font-bold">Constitutional Status</h2>
      <ul>
        {checks.map((check) => (
          <li key={check.article}>
            <span>{check.article} - {check.status}</span>
            <span>{check.explanation}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}