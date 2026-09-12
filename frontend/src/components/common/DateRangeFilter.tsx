import React, { useState } from 'react';
import { Calendar, Clock, X } from '@phosphor-icons/react';

export type DateRangePreset = 'ALL' | 'TODAY' | '24H' | '7D' | '30D' | 'CUSTOM';

export interface DateRangeValue {
  preset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: '24H', label: 'Last 24h' },
  { id: '7D', label: 'Last 7d' },
  { id: '30D', label: 'Last 30d' },
  { id: 'CUSTOM', label: 'Custom' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(value.preset === 'CUSTOM');

  const handleSelectPreset = (preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      setShowCustomInputs(true);
      onChange({
        preset: 'CUSTOM',
        startDate: value.startDate || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        endDate: value.endDate || new Date().toISOString().slice(0, 10),
      });
    } else {
      setShowCustomInputs(false);
      onChange({
        preset,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', val: string) => {
    onChange({
      ...value,
      preset: 'CUSTOM',
      [field]: val,
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Preset Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mr-1 select-none font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeline:</span>
        </div>
        {PRESETS.map((p) => {
          const isSelected = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Expandable Custom Date Range Fields */}
      {showCustomInputs && (
        <div className="flex items-center gap-2 p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl max-w-lg">
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[11px] text-zinc-500 font-mono">From:</label>
            <input
              type="date"
              value={value.startDate || ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono w-full"
            />
          </div>
          <span className="text-zinc-600 text-xs">—</span>
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[11px] text-zinc-500 font-mono">To:</label>
            <input
              type="date"
              value={value.endDate || ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSelectPreset('ALL')}
            className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            title="Clear custom range"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Utility helper to test if an ISO timestamp string satisfies the DateRangeValue criteria.
 */
export function isWithinDateRange(isoTimestamp: string, range: DateRangeValue): boolean {
  if (range.preset === 'ALL') return true;

  const itemTime = new Date(isoTimestamp).getTime();
  const now = Date.now();

  switch (range.preset) {
    case 'TODAY': {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return itemTime >= todayStart.getTime();
    }
    case '24H': {
      return itemTime >= now - 24 * 3600 * 1000;
    }
    case '7D': {
      return itemTime >= now - 7 * 24 * 3600 * 1000;
    }
    case '30D': {
      return itemTime >= now - 30 * 24 * 3600 * 1000;
    }
    case 'CUSTOM': {
      if (range.startDate) {
        const start = new Date(range.startDate);
        start.setHours(0, 0, 0, 0);
        if (itemTime < start.getTime()) return false;
      }
      if (range.endDate) {
        const end = new Date(range.endDate);
        end.setHours(23, 59, 59, 999);
        if (itemTime > end.getTime()) return false;
      }
      return true;
    }
    default:
      return true;
  }
}
