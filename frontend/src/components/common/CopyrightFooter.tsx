import React from 'react';
import { Link } from 'react-router-dom';

interface CopyrightFooterProps {
  variant?: 'sidebar' | 'full' | 'auth' | 'minimal';
  className?: string;
}

export const CopyrightFooter: React.FC<CopyrightFooterProps> = ({
  variant = 'full',
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  if (variant === 'sidebar') {
    return (
      <div className={`px-4 py-3 text-[11px] text-zinc-500 font-mono space-y-1 ${className}`}>
        <div className="text-[10px] text-zinc-500 leading-tight">
          © {currentYear} DriftGuard. All rights reserved.
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-0.5">
          <Link to="/terms" className="hover:text-zinc-300 transition-colors">
            Terms
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-zinc-300 transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div className={`text-center space-y-2 text-xs text-zinc-400 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <Link to="/terms" className="hover:text-zinc-200 transition-colors">
            Terms of service
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-zinc-200 transition-colors">
            Privacy policy
          </Link>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          © {currentYear} DriftGuard. All rights reserved.
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`text-xs text-zinc-500 font-mono ${className}`}>
        © {currentYear} DriftGuard. All rights reserved.
      </div>
    );
  }

  // Default 'full' variant for main viewports and document ends
  return (
    <footer
      className={`pt-8 pb-4 mt-8 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-sans ${className}`}
    >
      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
        <span>© {currentYear} DriftGuard. All rights reserved.</span>
        <span className="hidden sm:inline text-zinc-700">•</span>
        <span className="hidden sm:inline text-zinc-500">Dual-Phase Change Verification</span>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium">
        <Link to="/terms" className="hover:text-zinc-200 transition-colors">
          Terms of service
        </Link>
        <span className="text-zinc-750">•</span>
        <Link to="/privacy" className="hover:text-zinc-200 transition-colors">
          Privacy policy
        </Link>
      </div>
    </footer>
  );
};
