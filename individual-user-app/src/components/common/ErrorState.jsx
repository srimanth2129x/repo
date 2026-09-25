import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Telemetry Synchronization Error',
  message = 'Failed to communicate with the endpoint. The application is operating in safe offline mode.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            {title}
          </h4>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="shrink-0 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
}
