import React, { useState, useRef, useEffect } from 'react';
import {
  DownloadSimple,
  CaretDown,
  FileXls,
  FileCsv,
  FileCode,
} from '@phosphor-icons/react';

export interface ExportOption {
  id: 'excel' | 'csv' | 'json';
  label: string;
  description: string;
  formatBadge: string;
  onClick: () => void;
}

interface ExportDropdownProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportJson?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  label = 'Export',
  variant = 'secondary',
  size = 'sm',
  onExportExcel,
  onExportCsv,
  onExportJson,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 font-semibold',
    md: 'px-4 py-2 text-xs gap-2 font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-[#c8ff00] text-zinc-950 hover:bg-[#b8ea00] font-bold shadow-sm shadow-[#c8ff00]/10 focus:ring-[#c8ff00]',
    secondary:
      'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-[#c8ff00]/50 focus:ring-zinc-700',
    outline:
      'border border-zinc-800 hover:border-[#c8ff00]/40 bg-transparent text-zinc-300 hover:bg-zinc-900 focus:ring-zinc-700',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 ${sizeClasses[size]} ${variantClasses[variant]}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <DownloadSimple className="w-3.5 h-3.5" weight="bold" />
        <span>{label}</span>
        <CaretDown
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#c8ff00]' : 'text-zinc-400'}`}
          weight="bold"
        />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800 shadow-2xl shadow-black/80 z-50 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-zinc-800/60 font-sans">
          <div className="px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Select Export Format
            </div>
          </div>

          <div className="py-1">
            {/* Excel Option */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-zinc-900/80 transition-colors group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-[#c8ff00]/10 text-[#c8ff00] group-hover:bg-[#c8ff00] group-hover:text-zinc-950 transition-all shrink-0 mt-0.5">
                <FileXls className="w-4 h-4" weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    Excel Workbook
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    .XLSX
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Multi-sheet summary & command tabs
                </div>
              </div>
            </button>

            {/* CSV Option */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportCsv();
              }}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-zinc-900/80 transition-colors group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-400 group-hover:text-zinc-950 transition-all shrink-0 mt-0.5">
                <FileCsv className="w-4 h-4" weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    Comma-Separated
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    .CSV
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Flat tabular layout for BI & scripts
                </div>
              </div>
            </button>

            {/* JSON Option */}
            {onExportJson && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportJson();
                }}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-zinc-900/80 transition-colors group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-400 group-hover:text-zinc-950 transition-all shrink-0 mt-0.5">
                  <FileCode className="w-4 h-4" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      JSON Archive
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      .JSON
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    Immutable raw payload archive
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
