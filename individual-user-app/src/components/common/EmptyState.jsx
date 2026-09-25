import React from 'react';
import { ShieldCheck } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = ShieldCheck,
  title = 'No Items Found',
  description = 'Everything is in optimal operating condition.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}>
      <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
