'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

interface ViolationListProps {
  findings: Finding[];
  onFix?: (finding: Finding) => void;
  onDismiss?: (finding: Finding) => void;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; shape: string; label: string }> =
  {
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', shape: '!', label: 'CRITICAL' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-400', shape: '^', label: 'HIGH' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', shape: '~', label: 'MEDIUM' },
    low: { bg: 'bg-blue-500/10', text: 'text-blue-400', shape: '-', label: 'LOW' },
  };

export function ViolationList({ findings, onFix, onDismiss }: ViolationListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, findings.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          setExpandedIndex(prev => (prev === selectedIndex ? null : selectedIndex));
          break;
        case 'f':
          if (onFix && findings[selectedIndex]) {
            e.preventDefault();
            onFix(findings[selectedIndex]);
          }
          break;
        case 'd':
          if (onDismiss && findings[selectedIndex]) {
            e.preventDefault();
            onDismiss(findings[selectedIndex]);
          }
          break;
      }
    },
    [selectedIndex, findings, onFix, onDismiss]
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-8 text-center">
        <p className="text-green-400 text-lg font-medium">No violations detected</p>
        <p className="text-slate-500 text-sm mt-1">Codebase is clean</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      tabIndex={0}
      role="listbox"
      aria-label="Violations list. Use J/K or arrow keys to navigate, Enter to expand, F to fix, D to dismiss."
      className="rounded-lg border border-[#2D2D3D] bg-[#0A0A0F] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
    >
      <div className="px-4 py-2 border-b border-[#2D2D3D] flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {findings.length} violation{findings.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-600">
          J/K navigate | Enter expand | F fix | D dismiss
        </span>
      </div>
      <div className="divide-y divide-[#2D2D3D]" aria-live="polite">
        {findings.map((f, i) => {
          const sev = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.low;
          const isSelected = i === selectedIndex;
          const isExpanded = i === expandedIndex;

          return (
            <div
              key={`${f.file}-${f.line}-${i}`}
              role="option"
              aria-selected={isSelected}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'
              }`}
              onClick={() => {
                setSelectedIndex(i);
                setExpandedIndex(prev => (prev === i ? null : i));
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${sev.bg} ${sev.text}`}
                  role="img"
                  aria-label={`Severity: ${sev.label}`}
                >
                  {sev.shape}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200 font-medium truncate">
                      {f.pattern.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs ${sev.text}`}>{sev.label}</span>
                    <span className="text-xs text-slate-600">
                      {(f.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {f.file}:{f.line}
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 ml-9 space-y-2">
                  <p className="text-sm text-slate-300">{f.message}</p>
                  <pre className="text-xs bg-black/30 rounded p-2 overflow-x-auto text-slate-400">
                    {f.codeSnippet}
                  </pre>
                  <div className="flex gap-2 pt-1">
                    {onFix && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onFix(f);
                        }}
                        className="px-3 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      >
                        Fix (F)
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDismiss(f);
                        }}
                        className="px-3 py-1 text-xs rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-colors"
                      >
                        Dismiss (D)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
