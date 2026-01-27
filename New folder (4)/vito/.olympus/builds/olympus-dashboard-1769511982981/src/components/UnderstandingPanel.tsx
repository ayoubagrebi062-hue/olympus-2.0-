import React from 'react';

export function UnderstandingPanel() {
  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Understanding Your Build</h2>
      <div>
        <h3 className="text-md font-semibold">What was built</h3>
        <ul className="list-disc pl-5">
          <li>Component A</li>
          <li>Component B</li>
        </ul>
      </div>
      <div>
        <h3 className="text-md font-semibold">Why it was built this way</h3>
        <p>Key decisions and reasoning here...</p>
      </div>
      <div>
        <h3 className="text-md font-semibold">Known risks</h3>
        <p>Identified risks and mitigation strategies here...</p>
      </div>
    </div>
  );
}