import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  message = 'Loading telemetry...',
  rows = 3,
  className = ''
}) {
  return (
    <div className={`space-y-4 p-6 ${className}`}>
      <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        <span className="text-xs font-mono font-medium">{message}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
