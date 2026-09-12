import React from 'react';
import { ClockCountdown, ShieldWarning, ArrowClockwise, SignOut } from '@phosphor-icons/react';
import { Button } from '../common/Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onSignOut: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onSignOut,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
            <ShieldWarning className="w-6 h-6" weight="duotone" />
          </div>
          <div className="space-y-1">
            <h2
              id="timeout-modal-title"
              className="text-lg font-semibold text-white tracking-tight"
            >
              Session expiring soon
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No operator interaction detected for 29 minutes. The session will automatically terminate to protect infrastructure access.
            </p>
          </div>
        </div>

        {/* Countdown Indicator */}
        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <ClockCountdown className="w-4 h-4 text-[#c8ff00]" weight="bold" />
            <span>Automatic sign out in</span>
          </div>
          <span className="font-mono text-sm font-bold text-[#c8ff00] bg-[#c8ff00]/10 px-2.5 py-1 rounded-lg border border-[#c8ff00]/20">
            {remainingSeconds}s
          </span>
        </div>

        {/* Operational Rationale */}
        <div className="text-[11px] text-zinc-400 space-y-1 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
          <span className="font-semibold text-zinc-300 block">Security policy</span>
          <span>
            DriftGuard enforces session limits on read-only SSH transport and cryptographic envelope sessions.
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onSignOut}
            leftIcon={<SignOut className="w-4 h-4" weight="bold" />}
            className="w-full sm:w-auto text-xs"
          >
            Sign out
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onExtend}
            leftIcon={<ArrowClockwise className="w-4 h-4" weight="bold" />}
            className="w-full sm:w-auto text-xs font-bold"
          >
            Keep session active
          </Button>
        </div>
      </div>
    </div>
  );
};
