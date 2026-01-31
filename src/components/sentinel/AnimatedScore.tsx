'use client';

import { useState, useEffect } from 'react';

interface AnimatedScoreProps {
  score: number;
  label?: string;
}

export function AnimatedScore({ score, label = 'Health Score' }: AnimatedScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = score;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 90) return '#22c55e';
    if (s >= 70) return '#eab308';
    if (s >= 50) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(displayScore);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#2D2D3D" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {displayScore}
          </span>
        </div>
      </div>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
