import React from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'mark' | 'favicon';
  theme?: 'dark' | 'light' | 'monochrome';
  size?: number;
  className?: string;
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 24,
  className = '',
  showTagline = false,
}) => {
  // Color resolution per theme rules
  const shieldStroke =
    theme === 'dark' ? '#64748B' : theme === 'light' ? '#334155' : 'currentColor';
  const baselineStroke =
    theme === 'dark' ? '#94A3B8' : theme === 'light' ? '#64748B' : 'currentColor';
  const voltageColor =
    theme === 'dark' ? '#C8FF00' : theme === 'light' ? '#4D7C0F' : 'currentColor';
  const textColor =
    theme === 'dark' ? '#F8FAFC' : theme === 'light' ? '#0F172A' : 'currentColor';
  const taglineColor =
    theme === 'dark' ? '#94A3B8' : theme === 'light' ? '#64748B' : 'currentColor';

  // Mark SVG: 24x24 geometric shield with The Converged Trace
  const renderMark = (s = size) => {
    if (variant === 'favicon' || s <= 18) {
      // 16px Simplified Variant: Shield + single bowed trace + catch-point node
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden="true"
        >
          {/* Geometric Shield */}
          <path
            d="M4 3.5C4 3.5 12 2.5 12 2.5C12 2.5 20 3.5 20 3.5C20.5 3.5 21 3.9 21 4.5V13C21 17.5 16.8 20.8 12 22C7.2 20.8 3 17.5 3 13V4.5C3 3.9 3.5 3.5 4 3.5Z"
            stroke={shieldStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Simplified Converging Trace */}
          <path
            d="M6 14C8 14 9 7.5 12 7.5C14.2 7.5 15 12 16.5 14H18"
            stroke={voltageColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Catch-point node */}
          <circle cx="16.5" cy="14" r="1.8" fill={voltageColor} />
        </svg>
      );
    }

    // Standard Converged Trace: 24x24 geometric shield
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Geometric Shield Container */}
        <path
          d="M4 3.5C4 3.5 12 2.5 12 2.5C12 2.5 20 3.5 20 3.5C20.5 3.5 21 3.9 21 4.5V13C21 17.5 16.8 20.8 12 22C7.2 20.8 3 17.5 3 13V4.5C3 3.9 3.5 3.5 4 3.5Z"
          stroke={shieldStroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Straight Baseline Trace */}
        <line
          x1="6"
          y1="14"
          x2="18"
          y2="14"
          stroke={baselineStroke}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Drifted & Converging Trace */}
        <path
          d="M6 14C8 14 9 8 12 8C14 8 14.8 12.5 16 14"
          stroke={voltageColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Catch-Point Node (Moment of Verification) */}
        <circle cx="16" cy="14" r="1.6" fill={voltageColor} />
      </svg>
    );
  };

  if (variant === 'mark' || variant === 'favicon') {
    return <div className={`inline-flex items-center ${className}`}>{renderMark()}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {renderMark(size)}
      <div className="flex flex-col">
        <span
          className="font-semibold text-base leading-none tracking-[-0.02em] font-sans"
          style={{ color: textColor }}
        >
          DriftGuard
        </span>
        {showTagline && (
          <span
            className="text-[11px] font-mono tracking-tight mt-0.5"
            style={{ color: taglineColor }}
          >
            Before. After. Understood.
          </span>
        )}
      </div>
    </div>
  );
};
