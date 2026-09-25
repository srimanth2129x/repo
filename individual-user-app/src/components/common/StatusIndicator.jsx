import React from 'react';

export default function StatusIndicator({
  status = 'healthy', // healthy | warning | error | offline | neutral
  label,
  pulse = true,
  size = 'md',
  className = ''
}) {
  const styles = {
    healthy: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      ping: 'bg-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    warning: {
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      ping: 'bg-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    error: {
      dot: 'bg-rose-500',
      text: 'text-rose-700 dark:text-rose-400',
      ping: 'bg-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20'
    },
    offline: {
      dot: 'bg-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
      ping: 'bg-slate-400',
      bg: 'bg-slate-500/10 border-slate-500/20'
    },
    neutral: {
      dot: 'bg-cyan-500',
      text: 'text-cyan-700 dark:text-cyan-400',
      ping: 'bg-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20'
    }
  }[status] || {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    ping: 'bg-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20'
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  }[size] || 'w-2 h-2';

  return (
    <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${styles.bg} ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && status === 'healthy' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.ping}`} />
        )}
        <span className={`relative inline-flex rounded-full ${dotSizes} ${styles.dot}`} />
      </span>
      {label && <span className={styles.text}>{label}</span>}
    </div>
  );
}
