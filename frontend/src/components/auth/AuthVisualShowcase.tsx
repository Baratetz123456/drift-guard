import React, { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Camera,
  GitDiff,
  Sparkle,
  ShieldCheck,
  HardDrives,
} from '@phosphor-icons/react';
import { BrandLogo } from '../common/BrandLogo';

export const AuthVisualShowcase: React.FC = () => {
  const [hasLottieError, setHasLottieError] = useState(false);

  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 bg-slate-950 border-r border-slate-900/80 overflow-hidden select-none">
      {/* Ambient background glow accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#c8ff00]/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#c8ff00]/4 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <BrandLogo variant="full" showTagline={true} size={32} />
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30">
            v1.2
          </span>
        </div>

        <div className="pt-3">
          <h2 className="text-2xl xl:text-3xl font-semibold text-white tracking-tight leading-tight">
            Before. After. Understood.
          </h2>
          <p className="text-xs xl:text-sm text-slate-400 mt-2 leading-relaxed font-sans">
            Network change verification for Cisco infrastructure. Capture pre-change snapshots, inspect line-by-line diffs, and assess operational risk.
          </p>
        </div>
      </div>

      {/* Center: DotLottie Network Infrastructure Animation */}
      <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center">
        {!hasLottieError ? (
          <div className="w-full max-w-md h-64 xl:h-72 flex items-center justify-center">
            <DotLottieReact
              src="/animations/network-mesh.json"
              loop
              autoplay
              className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(200,255,0,0.12)]"
              onError={() => setHasLottieError(true)}
            />
          </div>
        ) : (
          /* High-tech SVG fallback if WebAssembly canvas encounters constraint */
          <div className="w-full max-w-md h-64 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-2xl bg-[#c8ff00]/10 text-[#c8ff00] mb-3">
              <HardDrives className="w-10 h-10" weight="duotone" />
            </div>
            <span className="text-xs font-bold text-zinc-200">
              Cisco Fleet Telemetry
            </span>
            <span className="text-[11px] text-zinc-500 mt-1">
              Live read-only SSH transport & automated capture stream
            </span>
          </div>
        )}
      </div>

      {/* Bottom: 3 Enterprise Telemetry Pillars */}
      <div className="relative z-10 space-y-4 pt-4 border-t border-zinc-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <Camera className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
              <span>Immutable snapshots</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Dual-phase CLI states archived immutably to AWS S3.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <GitDiff className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
              <span>Syntax diff engine</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Side-by-side token diff with counter normalization.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <Sparkle className="w-3.5 h-3.5 text-[#c8ff00]" weight="fill" />
              <span>Advisory AI risk</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              3-part diagnostics (Observation, Impact, Next step).
            </p>
          </div>
        </div>

        {/* Security standard micro-badge */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-3 border-t border-zinc-900/80">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
            KMS envelope encryption active
          </span>
          <span className="font-mono text-zinc-400">
            Cisco show commands only
          </span>
        </div>
      </div>
    </div>
  );
};
