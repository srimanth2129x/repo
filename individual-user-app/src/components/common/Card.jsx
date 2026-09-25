import React from 'react'

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  icon: Icon,
  variant = 'default',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-none',
    subtle: 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/80',
    glass: 'glass-panel shadow-sm',
    accent: 'bg-gradient-to-br from-emerald-500/5 to-transparent dark:from-emerald-500/10 border-emerald-500/20',
    warning: 'bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10 border-amber-500/20',
    threat: 'bg-gradient-to-br from-red-500/5 to-transparent dark:from-red-500/10 border-red-500/20',
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all duration-200 ${variantStyles[variant] || variantStyles.default} ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {(title || Icon || action) && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={title || Icon || action ? 'p-6' : 'p-6'}>{children}</div>
    </div>
  )
}
