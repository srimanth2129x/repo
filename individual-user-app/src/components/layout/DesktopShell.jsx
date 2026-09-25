import React from 'react';

export default function DesktopShell({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-graphite-950 text-slate-900 dark:text-slate-100 antialiased font-sans select-none">
      {children}
    </div>
  );
}
