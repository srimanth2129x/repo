import React from 'react'

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const variantStyles = {
    shield: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    threat: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    info: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  }

  const dotStyles = {
    shield: 'bg-emerald-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    threat: 'bg-red-500',
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
    neutral: 'bg-slate-400',
    indigo: 'bg-indigo-500',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-full border transition-colors ${
        variantStyles[variant] || variantStyles.neutral
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant] || dotStyles.neutral}`} />
      )}
      <span>{children}</span>
    </span>
  )
}
