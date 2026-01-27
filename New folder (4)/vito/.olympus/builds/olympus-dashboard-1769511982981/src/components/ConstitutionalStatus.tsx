import React from 'react';

export function ConstitutionalStatus() {
  const articles = [
    { name: 'No Shipping Without Understanding', status: 'compliant' },
    { name: 'Constitutional Tests Pass', status: 'warning' },
    { name: 'Intent Satisfaction', status: 'violation' },
    { name: 'Hostile Resistance', status: 'compliant' },
    { name: 'Stability Envelope', status: 'compliant' },
    { name: 'Architecture Integrity', status: 'warning' },
    { name: 'Explanation Provided', status: 'compliant' }
  ];

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Constitutional Status</h2>
      <ul className="space-y-2">
        {articles.map(article => (
          <li key={article.name} className="flex justify-between">
            <span>{article.name}</span>
            <span className={
              article.status === 'compliant' ? 'text-success' :
              article.status === 'warning' ? 'text-warning' :
              'text-destructive'
            }>{article.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}