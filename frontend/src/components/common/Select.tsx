import React from 'react';
import { CaretDown } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  icon,
  size = 'sm',
  options,
  children,
  className = '',
  containerClassName = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'py-1.5 pl-3 pr-8 text-xs',
    md: 'py-2.5 pl-3.5 pr-9 text-sm',
  };

  const iconPadding = {
    sm: icon ? 'pl-8' : 'pl-3',
    md: icon ? 'pl-9' : 'pl-3.5',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <select
          disabled={disabled}
          aria-label={props['aria-label'] || label || 'Select option'}
          className={`w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans ${sizeClasses[size]} ${iconPadding[size]} [&>option]:bg-zinc-950 [&>option]:text-zinc-200 ${
            error ? 'border-rose-500 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none flex items-center justify-center">
          <CaretDown className="w-3.5 h-3.5" weight="bold" />
        </div>
      </div>

      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
