'use client';

import { useState, useEffect } from 'react';

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 px-4 py-3 bg-[#1a1a2e] border border-green-500/30 text-green-400 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2"
    >
      <span className="text-green-500">+</span>
      <span className="text-sm">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Dismiss notification"
      >
        x
      </button>
    </div>
  );
}
