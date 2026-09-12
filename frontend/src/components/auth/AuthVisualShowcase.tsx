import React from 'react';
import {
  Camera,
  GitDiff,
  Sparkle,
  ShieldCheck,
  TerminalWindow,
  Key,
  ShieldCheckered,
} from '@phosphor-icons/react';
import { BrandLogo } from '../common/BrandLogo';
import { NetworkTraceCanvas } from './NetworkTraceCanvas';

export const AuthVisualShowcase: React.FC = () => {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-10 xl:p-14 bg-slate-950 border-r border-slate-900/80 overflow-hidden select-none">
      {/* Ambient background subtle radial glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#c8ff00]/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-80 h-80 bg-[#c8ff00]/3 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand & Hero Typography */}
      <div className="relative z-10 space-y-4">
        {/* Brand Row */}
        <div className="flex items-center justify-between">
          <BrandLogo variant="full" showTagline={false} size={30} />
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30">
            v1.2
          </span>
        </div>

        {/* Tagline Pill */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/25 text-[#c8ff00] text-xs font-mono font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-ping" />
            <span>Before. After. Understood.</span>
          </div>
        </div>

        {/* Headline & Description */}
        <div className="space-y-2 pt-1">
          <h2 className="text-2xl xl:text-3xl font-semibold text-white tracking-tight leading-snug">
            Zero blind spots during production network changes.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-xl">
            Compare line-by-line CLI syntax, BGP peering tables, and interface states before and after maintenance windows to guarantee converged fleet health.
          </p>
        </div>
      </div>

      {/* Center: Borderless Streaming CLI Syntax & Topology Wave */}
      <div className="relative z-10 my-auto py-2 flex flex-col justify-center">
        <NetworkTraceCanvas />
      </div>

      {/* Bottom: Streamlined Telemetry Pillars & Security Standards */}
      <div className="relative z-10 space-y-4 pt-4 border-t border-slate-900/90">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
              <Camera className="w-4 h-4 text-[#c8ff00]" weight="bold" />
              <span>Immutable snapshots</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Dual-phase CLI states archived immutably to encrypted vault.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
              <GitDiff className="w-4 h-4 text-[#c8ff00]" weight="bold" />
              <span>Syntax diff engine</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Side-by-side token diff with counter normalization.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
              <Sparkle className="w-4 h-4 text-[#c8ff00]" weight="fill" />
              <span>Advisory AI risk</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              3-part diagnostics (Observation, Impact, Next step).
            </p>
          </div>
        </div>

        {/* Security Standard Micro-Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-slate-900/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
              KMS envelope active
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
              JWT session isolation
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-slate-400">
            <TerminalWindow className="w-3.5 h-3.5 text-slate-500" />
            Cisco show commands only
          </span>
        </div>
      </div>
    </div>
  );
};
