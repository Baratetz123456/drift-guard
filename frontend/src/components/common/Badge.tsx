import React from 'react';
import { RiskSeverity } from '../../types';
import { Check } from '@phosphor-icons/react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'verified' | 'warning' | 'danger' | 'info' | 'purple';
  severity?: RiskSeverity;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  severity,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (severity) {
    const normalized =
      severity === 'SAFE' || severity === 'Informational'
        ? 'Informational'
        : severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

    // Fixed Severity Ramp: Critical=red-600, High=orange-500, Medium=amber-400, Low=sky-400, Informational=slate-400
    const severityMap: Record<string, string> = {
      Critical: 'bg-red-600/20 text-red-300 border-red-500/40 glow-rose animate-pulse',
      High: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      Medium: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      Low: 'bg-sky-400/20 text-sky-300 border-sky-400/40',
      Informational: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    };

    const displayText = children || normalized;

    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${
          severityMap[normalized] || 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
        {displayText}
      </span>
    );
  }

  // Unified Verification (Voltage: #C8FF00 dark, #4D7C0F light) & Severity Palettes (Zero Emerald)
  const variantMap = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    outline: 'bg-transparent text-slate-300 border-slate-700',
    success: 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/30',
    verified: 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/30',
    warning: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    danger: 'bg-red-600/15 text-red-300 border-red-500/30',
    info: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    purple: 'bg-slate-800 text-slate-200 border-slate-700',
  };

  const isVerified = variant === 'success' || variant === 'verified';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${variantMap[variant]}`}
    >
      {isVerified && <Check className="w-3.5 h-3.5 mr-1 text-current shrink-0" weight="bold" />}
      {children}
    </span>
  );
};
