import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, WarningCircle, Info, Warning, X } from '@phosphor-icons/react';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

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

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration ?? 10000;
  const remainingTimeRef = useRef<number>(duration);
  const startTimestampRef = useRef<number>(Date.now());
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerClose = useCallback(() => {
    setIsExiting(true);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    startTimestampRef.current = Date.now();
    timerIdRef.current = setTimeout(() => {
      triggerClose();
    }, remainingTimeRef.current);

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [triggerClose]);

  const handleMouseEnter = () => {
    if (isExiting) return;
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    const elapsed = Date.now() - startTimestampRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (isExiting) return;
    if (remainingTimeRef.current <= 0) {
      triggerClose();
      return;
    }
    startTimestampRef.current = Date.now();
    timerIdRef.current = setTimeout(() => {
      triggerClose();
    }, remainingTimeRef.current);
  };

  return (
    <div
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md text-slate-100 transition-all duration-200 ease-out transform ${
        borderMap[toast.type]
      } ${
        isExiting
          ? 'opacity-0 translate-x-6 scale-95 pointer-events-none'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {iconMap[toast.type]}
        <span className="text-xs font-semibold leading-5">{toast.message}</span>
      </div>
      <button
        onClick={triggerClose}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-100 p-0.5 rounded transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none font-sans">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
