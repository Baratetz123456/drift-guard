import React from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface PaginationToolbarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const PaginationToolbar: React.FC<PaginationToolbarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25],
}) => {
  if (totalItems === 0) return null;

  const startIdx = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 text-sm text-zinc-300 font-sans border-t border-zinc-800/80">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-white font-semibold">{startIdx}</strong> to{' '}
          <strong className="text-white font-semibold">{endIdx}</strong> of{' '}
          <strong className="text-[#c8ff00] font-semibold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
            <span className="text-zinc-400 text-xs">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-[#c8ff00]/40 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous page"
        >
          <CaretLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 rounded-lg text-sm font-mono font-medium text-zinc-200 bg-zinc-900 border border-zinc-800">
          Page <strong className="text-[#c8ff00] font-bold">{currentPage}</strong> of {Math.max(totalPages, 1)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-[#c8ff00]/40 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next page"
        >
          <CaretRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
