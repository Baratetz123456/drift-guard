import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  containerClassName = '',
  className = '',
  disabled,
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const inputElement = (
    <input
      type="checkbox"
      id={inputId}
      disabled={disabled}
      className={`w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-[#c8ff00] accent-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00]/40 focus:ring-offset-0 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );

  if (!label && !description) {
    return inputElement;
  }

  return (
    <label
      htmlFor={inputId}
      className={`flex items-start gap-3 cursor-pointer group select-none ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${containerClassName}`}
    >
      <div className="pt-0.5 shrink-0 flex items-center">{inputElement}</div>
      <div className="min-w-0 flex-1 text-xs">
        {label && (
          <div className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
            {label}
          </div>
        )}
        {description && (
          <div className="text-zinc-400 text-[11px] leading-relaxed mt-0.5 group-hover:text-zinc-300 transition-colors">
            {description}
          </div>
        )}
      </div>
    </label>
  );
};
