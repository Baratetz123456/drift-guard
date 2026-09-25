import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, WarningCircle, Info, Warning, X } from '@phosphor-icons/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none font-sans">
      {toasts.map((toast) => {
        const iconMap = {
          success: <CheckCircle className="w-5 h-5 text-[#c8ff00] shrink-0" weight="fill" />,
          error: <WarningCircle className="w-5 h-5 text-red-500 shrink-0" weight="fill" />,
          warning: <Warning className="w-5 h-5 text-amber-400 shrink-0" weight="fill" />,
          info: <Info className="w-5 h-5 text-sky-400 shrink-0" weight="fill" />,
        };

        const borderMap = {
          success: 'border-[#c8ff00]/40 bg-slate-950/95 shadow-[#c8ff00]/10',
          error: 'border-red-600/30 bg-slate-950/95 shadow-red-950/30',
          warning: 'border-amber-400/30 bg-slate-950/95 shadow-amber-950/30',
          info: 'border-sky-400/30 bg-slate-950/95 shadow-sky-950/30',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md text-slate-100 transition-all transform translate-y-0 opacity-100 ${borderMap[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              {iconMap[toast.type]}
              <span className="text-xs font-semibold leading-5">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-100 p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
