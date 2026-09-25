import React from 'react';

export default function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  title
}) {
  const sizeStyles = {
    sm: {
      track: 'h-5 w-9 border-2 border-transparent',
      thumb: 'h-4 w-4',
      translateActive: 'translate-x-4',
      translateInactive: 'translate-x-0',
    },
    md: {
      track: 'h-6 w-11 border-2 border-transparent',
      thumb: 'h-5 w-5',
      translateActive: 'translate-x-5',
      translateInactive: 'translate-x-0',
    },
    lg: {
      track: 'h-7 w-14 border-2 border-transparent',
      thumb: 'h-6 w-6',
      translateActive: 'translate-x-7',
      translateInactive: 'translate-x-0',
    }
  }[size] || {
    track: 'h-6 w-11 border-2 border-transparent',
    thumb: 'h-5 w-5',
    translateActive: 'translate-x-5',
    translateInactive: 'translate-x-0',
  };

  const defaultTitle = checked ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title || defaultTitle}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 select-none ${
        checked
          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
          : 'bg-slate-300 dark:bg-slate-700/80 border border-slate-300/40 dark:border-slate-600/50'
      } ${sizeStyles.track} ${className}`}
    >
      <span
        className={`pointer-events-none inline-block transform rounded-full bg-white shadow-md shadow-slate-900/30 ring-0 transition-transform duration-200 ease-in-out ${
          checked ? sizeStyles.translateActive : sizeStyles.translateInactive
        } ${sizeStyles.thumb}`}
      />
    </button>
  );
}
