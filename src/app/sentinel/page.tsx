'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatedScore } from '@/components/sentinel/AnimatedScore';
import { ViolationList } from '@/components/sentinel/ViolationList';
import { QuickActions } from '@/components/sentinel/QuickActions';
import { SuccessToast } from '@/components/sentinel/SuccessToast';
import { FixApprovalModal } from '@/components/sentinel/FixApprovalModal';

interface Finding {
  file: string;
  line: number;
  column: number;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  message: string;
  codeSnippet: string;
}

interface ScanData {
  totalFindings: number;
  filesScanned: number;
  healthScore: number;
  findings: Finding[];
  durationMs: number;
}

interface StatusData {
  governance: {
    state: string;
    reason: string;
    configSource: string;
    uptimeMs: number;
  };
  claude: {
    available: boolean;
    errorCount: number;
    circuitOpen: boolean;
    lastError: string | null;
    cliVersion: string | null;
  };
}

export default function SentinelDashboard() {
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [fixTarget, setFixTarget] = useState<Finding | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sentinel/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch {
      // Status unavailable
    }
  }, []);

  const runScan = useCallback(async () => {
    try {
      const res = await fetch('/api/sentinel/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: 'src' }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanData({
          totalFindings: data.scan.totalFindings,
          filesScanned: data.scan.filesScanned,
          healthScore: data.scan.healthScore,
          findings: data.findings,
          durationMs: data.scan.durationMs,
        });
        setToast(
          `Scan complete: ${data.scan.totalFindings} findings in ${data.scan.filesScanned} files`
        );
      }
    } catch {
      setToast('Scan failed — check server logs');
    }
  }, []);

  const handleFixAll = useCallback(async () => {
    setToast('Fix All is available in dry-run mode — check auto-fixer configuration');
  }, []);

  const handleFix = useCallback((finding: Finding) => {
    setFixTarget(finding);
  }, []);

  const handleDismiss = useCallback((finding: Finding) => {
    setScanData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.filter(f => !(f.file === finding.file && f.line === finding.line)),
        totalFindings: prev.totalFindings - 1,
      };
    });
    setToast(`Dismissed ${finding.pattern}`);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), runScan()]);
      setLoading(false);
    };
    init();
  }, [fetchStatus, runScan]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">OLYMPUS Sentinel</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Governance security dashboard</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: Score + Stats + Claude Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] p-4 flex items-center justify-center">
              <AnimatedScore score={scanData?.healthScore ?? 100} label="Health Score" />
            </div>

            {/* Stats */}
            <div className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] p-4 space-y-3">
              <h3 className="text-xs text-[#94A3B8] uppercase tracking-wider">Scan Results</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Files scanned</span>
                  <span className="text-sm font-medium">{scanData?.filesScanned ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Violations</span>
                  <span className="text-sm font-medium">{scanData?.totalFindings ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Scan time</span>
                  <span className="text-sm font-medium">{scanData?.durationMs ?? 0}ms</span>
                </div>
              </div>
            </div>

            {/* Governance State */}
            <div className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] p-4 space-y-3">
              <h3 className="text-xs text-[#94A3B8] uppercase tracking-wider">Governance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">State</span>
                  <span
                    className={`text-sm font-medium ${
                      statusData?.governance.state === 'HEALTHY'
                        ? 'text-green-400'
                        : statusData?.governance.state === 'DEGRADED'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {statusData?.governance.state ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Config</span>
                  <span className="text-sm font-medium">
                    {statusData?.governance.configSource ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Claude Status */}
            <div className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] p-4 space-y-3">
              <h3 className="text-xs text-[#94A3B8] uppercase tracking-wider">Claude Code</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Available</span>
                  <span
                    className={`text-sm font-medium ${
                      statusData?.claude.available ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {statusData?.claude.available ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Circuit</span>
                  <span
                    className={`text-sm font-medium ${
                      statusData?.claude.circuitOpen ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {statusData?.claude.circuitOpen ? 'OPEN' : 'Closed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Errors</span>
                  <span className="text-sm font-medium">{statusData?.claude.errorCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] p-4">
            <h3 className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">Quick Actions</h3>
            <QuickActions onScan={runScan} onFixAll={handleFixAll} />
          </div>

          {/* Violation List */}
          <div>
            <h3 className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">Violations</h3>
            <ViolationList
              findings={scanData?.findings ?? []}
              onFix={handleFix}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      )}

      <FixApprovalModal
        finding={fixTarget}
        onClose={() => setFixTarget(null)}
        onResult={msg => setToast(msg)}
      />
      <SuccessToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
