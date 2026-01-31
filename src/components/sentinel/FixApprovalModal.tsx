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

interface FixPreview {
  diff: string;
  branchName: string;
  finding: Finding;
  dryRun: boolean;
}

interface FixApprovalModalProps {
  finding: Finding | null;
  onClose: () => void;
  onResult: (message: string) => void;
}

export function FixApprovalModal({ finding, onClose, onResult }: FixApprovalModalProps) {
  const [preview, setPreview] = useState<FixPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = finding !== null;

  // Fetch preview when finding changes
  useEffect(() => {
    if (!finding) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const res = await fetch('/api/sentinel/fix/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finding }),
        });
        const data = await res.json();
        if (res.ok && data.status === 'ok') {
          setPreview(data.preview);
        } else {
          setPreviewError(data.error || 'Failed to generate preview');
        }
      } catch {
        setPreviewError('Network error — could not reach fix preview API');
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [finding]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleApprove = useCallback(async () => {
    if (!finding) return;
    setApplying(true);
    try {
      const res = await fetch('/api/sentinel/fix/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding, action: 'approve' }),
      });
      const data = await res.json();
      if (res.ok && data.result?.success) {
        const prInfo = data.result.prUrl ? ` — PR: ${data.result.prUrl}` : '';
        const testInfo = data.result.testsPassed ? ' (tests passed)' : '';
        onResult(`Fix applied to ${data.result.branchName}${testInfo}${prInfo}`);
      } else {
        onResult(`Fix failed: ${data.result?.error || data.error || 'Unknown error'}`);
      }
    } catch {
      onResult('Network error — could not apply fix');
    } finally {
      setApplying(false);
      onClose();
    }
  }, [finding, onClose, onResult]);

  const handleReject = useCallback(async () => {
    if (!finding) return;
    try {
      await fetch('/api/sentinel/fix/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding, action: 'reject' }),
      });
      onResult(`Rejected fix for ${finding.pattern} in ${finding.file}:${finding.line}`);
    } catch {
      onResult('Could not record rejection');
    }
    onClose();
  }, [finding, onClose, onResult]);

  if (!isOpen) return null;

  const severityColors: Record<string, string> = {
    critical: 'text-red-400 bg-red-400/10 border-red-400/30',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    low: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Fix approval"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-[#2D2D3D] bg-[#12121A] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2D2D3D]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Fix Preview</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded border ${severityColors[finding.severity] ?? 'text-slate-400'}`}
            >
              {finding.severity.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors text-lg leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Finding Info */}
        <div className="px-5 py-3 border-b border-[#2D2D3D] space-y-1">
          <p className="text-xs text-[#94A3B8]">
            <span className="font-medium text-[#F8FAFC]">{finding.pattern}</span> in{' '}
            <code className="text-xs text-blue-400">
              {finding.file}:{finding.line}
            </code>
          </p>
          <p className="text-xs text-[#94A3B8]">{finding.message}</p>
          <p className="text-xs text-[#94A3B8]">
            Confidence: {(finding.confidence * 100).toFixed(0)}%
          </p>
        </div>

        {/* Diff Preview */}
        <div className="flex-1 overflow-auto px-5 py-3">
          {loadingPreview ? (
            <div className="space-y-2">
              <div className="h-4 w-48 bg-white/5 animate-pulse rounded" />
              <div className="h-4 w-64 bg-white/5 animate-pulse rounded" />
              <div className="h-4 w-56 bg-white/5 animate-pulse rounded" />
              <p className="text-xs text-[#94A3B8] mt-2">Generating fix with Claude Code CLI...</p>
            </div>
          ) : previewError ? (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded p-3">
              {previewError}
            </div>
          ) : preview ? (
            <div>
              <p className="text-xs text-[#94A3B8] mb-2">
                Branch: <code className="text-blue-400">{preview.branchName}</code>
              </p>
              {preview.diff ? (
                <pre className="text-xs font-mono bg-[#0A0A0F] border border-[#2D2D3D] rounded p-3 overflow-x-auto whitespace-pre">
                  {preview.diff.split('\n').map((line, i) => {
                    let cls = 'text-[#94A3B8]';
                    if (line.startsWith('+') && !line.startsWith('+++')) cls = 'text-green-400';
                    else if (line.startsWith('-') && !line.startsWith('---')) cls = 'text-red-400';
                    else if (line.startsWith('@@')) cls = 'text-blue-400';
                    return (
                      <span key={i} className={cls}>
                        {line}
                        {'\n'}
                      </span>
                    );
                  })}
                </pre>
              ) : (
                <p className="text-xs text-[#94A3B8]">No changes generated.</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2D2D3D]">
          <button
            onClick={handleReject}
            disabled={applying}
            className="px-4 py-1.5 text-xs font-medium text-[#94A3B8] bg-white/5 border border-[#2D2D3D] rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={applying || loadingPreview || !!previewError}
            className="px-4 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-500 rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying...' : 'Approve & Fix'}
          </button>
        </div>
      </div>
    </div>
  );
}
