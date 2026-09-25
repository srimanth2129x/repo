import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({
  label,
  options = [],
  value,
  onChange,
  icon: Icon,
  className = '',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-between space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
      >
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          <span>{selectedOption?.label || label || 'Select'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 text-xs ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 font-medium transition-colors flex items-center justify-between ${
                opt.value === value
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{opt.label}</span>
              {opt.desc && <span className="text-[10px] text-slate-400">{opt.desc}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
