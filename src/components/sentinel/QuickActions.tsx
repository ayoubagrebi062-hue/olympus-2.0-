'use client';

import { useState } from 'react';

interface QuickActionsProps {
  onScan: () => Promise<void>;
  onFixAll: () => Promise<void>;
}

export function QuickActions({ onScan, onFixAll }: QuickActionsProps) {
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScan();
    } finally {
      setScanning(false);
    }
  };

  const handleFixAll = async () => {
    setFixing(true);
    try {
      await onFixAll();
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleScan}
        disabled={scanning}
        className="px-4 py-2 text-sm rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {scanning ? 'Scanning...' : 'Run Scan'}
      </button>
      <button
        onClick={handleFixAll}
        disabled={fixing}
        className="px-4 py-2 text-sm rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {fixing ? 'Fixing...' : 'Fix All Safe'}
      </button>
    </div>
  );
}
