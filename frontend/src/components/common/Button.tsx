import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 font-semibold',
    md: 'px-4 py-2 text-xs gap-2 font-semibold',
    lg: 'px-5 py-2.5 text-sm gap-2 font-semibold',
  };

  // Electric lime (#c8ff00) brand primary buttons
  const variantClasses = {
    primary:
      'bg-[#c8ff00] text-zinc-950 hover:bg-[#b8ea00] font-bold shadow-sm shadow-[#c8ff00]/10 focus:ring-[#c8ff00] active:scale-[0.99]',
    glow:
      'bg-[#c8ff00] text-zinc-950 hover:bg-[#b8ea00] font-bold shadow-sm shadow-[#c8ff00]/25 focus:ring-[#c8ff00] active:scale-[0.99]',
    secondary:
      'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-[#c8ff00]/50 focus:ring-zinc-700 active:scale-[0.99]',
    outline:
      'border border-zinc-800 hover:border-[#c8ff00]/40 bg-transparent text-zinc-300 hover:bg-zinc-900 focus:ring-zinc-700 active:scale-[0.99]',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 focus:ring-rose-500',
    ghost:
      'text-zinc-400 hover:text-white hover:bg-zinc-900 focus:ring-zinc-800',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
