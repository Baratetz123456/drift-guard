import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import {
  HardDrives,
  Camera,
  GitDiff,
  Sparkle,
  ShieldCheck,
  ShieldWarning,
  Lightning,
  ArrowRight,
  TerminalWindow,
  LockKey,
  CheckCircle,
  ClockCounterClockwise,
  SlidersHorizontal,
  Compass,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../hooks/usePageMetadata';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Overview — DriftGuard',
    canonicalPath: '/',
    robots: 'noindex, nofollow',
  });

  return (
    <div className="space-y-12 font-sans w-full max-w-6xl pb-16">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL HERO & ABOUT DRIFTGUARD                                      */}
      {/* ========================================================================= */}
      <div className="space-y-4 border-b border-zinc-800/80 pb-8">
        {/* Brand Tagline Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-xs font-mono font-bold text-[#c8ff00]">
          <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse" />
          <span>Before. After. Understood.</span>
        </div>

        {/* Operational Headline in Sentence Case */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Automated change verification for enterprise Cisco networks
        </h1>

        <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-4xl">
          DriftGuard is a purpose-built desktop verification instrument that validates Cisco router and switch configurations before and after maintenance windows. By comparing cryptographic state snapshots, DriftGuard isolates syntactic divergences, eliminates configuration drift, and generates advisory AI risk interpretations before production traffic is impacted.
        </p>

        {/* Safety & Compliance Assurance Row */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-sm font-mono text-zinc-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#c8ff00]" weight="fill" />
            <span className="text-white font-semibold">Read-Only Safety</span>
            <span className="text-zinc-400">• show commands only</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <LockKey className="w-4 h-4 text-[#c8ff00]" weight="fill" />
            <span className="text-white font-semibold">KMS Envelope Encryption</span>
            <span className="text-zinc-400">• zero plaintext secrets</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <TerminalWindow className="w-4 h-4 text-[#c8ff00]" weight="fill" />
            <span className="text-white font-semibold">Multi-Driver Support</span>
            <span className="text-zinc-400">• IOS-XE, IOS-XR, NX-OS, ASA</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DIRECT MODULE QUICK-JUMP BAR                                           */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#c8ff00]" weight="bold" />
            <span>Workflow Modules</span>
          </span>
          <span className="text-xs text-zinc-400 font-mono">Direct navigation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/setup?tab=devices')}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-white mb-2.5">
              <HardDrives className="w-5 h-5 text-[#c8ff00]" />
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white">1. Setup Inventory</div>
            <div className="text-xs text-zinc-400 mt-1">Devices & command sets</div>
          </button>

          <button
            onClick={() => navigate('/operations?tab=capture')}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-white mb-2.5">
              <Camera className="w-5 h-5 text-sky-400" />
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white">2. Run Collection</div>
            <div className="text-xs text-zinc-400 mt-1">3-step snapshot capture</div>
          </button>

          <button
            onClick={() => navigate('/analysis?tab=compare')}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-white mb-2.5">
              <GitDiff className="w-5 h-5 text-[#c8ff00]" />
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white">3. Compare Diffs</div>
            <div className="text-xs text-zinc-400 mt-1">Line-by-line CLI inspector</div>
          </button>

          <button
            onClick={() => navigate('/analysis?tab=report')}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-white mb-2.5">
              <Sparkle className="w-5 h-5 text-amber-400" weight="fill" />
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white">4. AI Analysis</div>
            <div className="text-xs text-zinc-400 mt-1">Advisory risk evaluation</div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTINUOUS TIMELINE STREAM: HOW TO USE EFFICIENTLY                    */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            How to use DriftGuard efficiently
          </h2>
          <p className="text-sm text-zinc-300 mt-1">
            Follow this 4-stage operational lifecycle to maintain full configuration visibility throughout maintenance windows.
          </p>
        </div>

        {/* Continuous Connected Vertical Line Container */}
        <div className="relative pl-8 sm:pl-10 space-y-12 before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">

          {/* STAGE 1 */}
          <div className="relative space-y-3.5">
            {/* Numbered Voltage Node */}
            <div className="absolute -left-8 sm:-left-10 top-0 w-7 h-7 rounded-full bg-zinc-900 border border-[#c8ff00]/60 ring-2 ring-zinc-950 flex items-center justify-center text-sm font-mono font-bold text-[#c8ff00] shadow-sm">
              1
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">
                  Stage 1: Register Inventory & Command Profiles
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  /setup
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Add target Cisco routers and switches via single device registration or bulk CSV import. Assign devices to logical clusters such as <code className="text-[#c8ff00] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-xs">Core Backbone</code> or <code className="text-[#c8ff00] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-xs">DC Fabric</code>, and associate driver-compatible command sets.
              </p>
            </div>

            {/* Flat Inline Technical Code Tokens */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 font-mono text-sm space-y-2">
              <div className="text-xs text-zinc-400 uppercase font-semibold">Standard Telemetry Command Sets</div>
              <div className="text-zinc-200 flex items-center gap-2.5">
                <span className="text-zinc-500">›</span>
                <span className="text-sky-400 font-semibold">show ip interface brief</span>
                <span className="text-zinc-400 text-xs">— Port IP addressing and line protocol status</span>
              </div>
              <div className="text-zinc-200 flex items-center gap-2.5">
                <span className="text-zinc-500">›</span>
                <span className="text-sky-400 font-semibold">show ip bgp summary</span>
                <span className="text-zinc-400 text-xs">— Autonomous system peer session uptime and prefix counts</span>
              </div>
              <div className="text-zinc-200 flex items-center gap-2.5">
                <span className="text-zinc-500">›</span>
                <span className="text-sky-400 font-semibold">show ip route summary</span>
                <span className="text-zinc-400 text-xs">— Routing table RIB size, protocol breakdown, and path counts</span>
              </div>
            </div>

            {/* Engineer Efficiency Pro-Tip */}
            <div className="p-3.5 rounded-lg border-l-2 border-[#c8ff00] bg-zinc-900/40 text-sm text-zinc-200 space-y-1">
              <span className="font-bold text-[#c8ff00]">Efficiency Pro-Tip: </span>
              <span>
                Pre-group nodes by maintenance scope before scheduled change windows. Grouping allows 1-click concurrent collection across all nodes in the window, eliminating the need to poll devices individually.
              </span>
            </div>

            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/setup?tab=devices')}
              >
                Go to Inventory Setup
              </Button>
            </div>
          </div>

          {/* STAGE 2 */}
          <div className="relative space-y-3.5">
            {/* Numbered Voltage Node */}
            <div className="absolute -left-8 sm:-left-10 top-0 w-7 h-7 rounded-full bg-zinc-900 border border-sky-500/60 ring-2 ring-zinc-950 flex items-center justify-center text-sm font-mono font-bold text-sky-400 shadow-sm">
              2
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">
                  Stage 2: Capture Pre-Change Baseline Snapshots
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  /operations
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Before making any configuration changes or executing cutovers, initiate a <span className="text-sky-400 font-semibold">Pre-Change Baseline</span> capture. DriftGuard uses non-interactive Netmiko SSH sessions to archive immutable configuration state directly to the vault with the maintenance ticket number bound.
              </p>
            </div>

            {/* 3-Step Flow Inline Callout */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-sm text-zinc-200 font-mono space-y-1.5">
              <div className="text-xs text-zinc-400 uppercase font-semibold">Snapshot Collector Guided Flow</div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-[#c8ff00] font-bold">1. Select Target</span>
                <span className="text-zinc-500">→</span>
                <span className="text-sky-400 font-bold">2. Set Command Profile & Ticket</span>
                <span className="text-zinc-500">→</span>
                <span className="text-white font-bold">3. Pre-flight Verification & Run</span>
              </div>
            </div>

            {/* Engineer Efficiency Pro-Tip */}
            <div className="p-3.5 rounded-lg border-l-2 border-[#c8ff00] bg-zinc-900/40 text-sm text-zinc-200 space-y-1">
              <span className="font-bold text-[#c8ff00]">Efficiency Pro-Tip: </span>
              <span>
                Always supply the operational change ticket number (e.g. <code className="font-mono text-[#c8ff00]">CHG-998214</code>). When post-change collection runs under the same ticket, the comparison engine automatically suggests the matching baseline pair.
              </span>
            </div>

            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/operations?tab=capture')}
              >
                Go to Snapshot Collector
              </Button>
            </div>
          </div>

          {/* STAGE 3 */}
          <div className="relative space-y-3.5">
            {/* Numbered Voltage Node */}
            <div className="absolute -left-8 sm:-left-10 top-0 w-7 h-7 rounded-full bg-zinc-900 border border-[#c8ff00]/60 ring-2 ring-zinc-950 flex items-center justify-center text-sm font-mono font-bold text-[#c8ff00] shadow-sm">
              3
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">
                  Stage 3: Run Post-Change Capture & Timeline Diff Comparison
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  /analysis
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Immediately after deploying routing modifications or interface alterations, execute a <span className="text-[#c8ff00] font-semibold">Post-Change Verification</span> capture. DriftGuard automatically compiles line-by-line syntactic diffs between the baseline and post-change outputs.
              </p>
            </div>

            {/* Diff Syntax Visual Guide */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 font-mono text-sm space-y-2">
              <div className="text-xs text-zinc-400 uppercase font-semibold">Syntactic Diff Inspector Legend</div>
              <div className="flex items-center gap-2.5 text-[#c8ff00]">
                <span className="bg-[#c8ff00]/15 px-2 py-0.5 rounded font-bold">+</span>
                <span className="text-zinc-200">Added state: Newly established BGP sessions, active routes, or interfaces</span>
              </div>
              <div className="flex items-center gap-2.5 text-rose-400">
                <span className="bg-rose-950 px-2 py-0.5 rounded font-bold">-</span>
                <span className="text-zinc-200">Removed state: Withdrawn prefixes, downed neighbor relationships, or dropped subnets</span>
              </div>
            </div>

            {/* Engineer Efficiency Pro-Tip */}
            <div className="p-3.5 rounded-lg border-l-2 border-[#c8ff00] bg-zinc-900/40 text-sm text-zinc-200 space-y-1">
              <span className="font-bold text-[#c8ff00]">Efficiency Pro-Tip: </span>
              <span>
                Use the <span className="font-semibold text-white">Auto-pair Latest</span> action in the comparison timeline. It instantaneously selects the newest baseline and verification snapshot pair for the target device without manual date matching.
              </span>
            </div>

            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/analysis?tab=compare')}
              >
                Go to Diff Comparison
              </Button>
            </div>
          </div>

          {/* STAGE 4 */}
          <div className="relative space-y-3.5">
            {/* Numbered Voltage Node */}
            <div className="absolute -left-8 sm:-left-10 top-0 w-7 h-7 rounded-full bg-zinc-900 border border-amber-500/60 ring-2 ring-zinc-950 flex items-center justify-center text-sm font-mono font-bold text-amber-400 shadow-sm">
              4
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">
                  Stage 4: Review Advisory AI Risk Synthesis & Audit Trail
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  /analysis?tab=report
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Open the dedicated AI Analysis report for an automated architectural risk assessment. The model analyzes syntactic diffs for BGP neighbor flapping, blackholed default routes, and MTU mismatches across dual peers.
              </p>
            </div>

            {/* 3-Part Error & Diagnostic Pattern Callout */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-sm space-y-2.5">
              <div className="text-xs font-mono font-semibold text-zinc-400 uppercase">
                3-Part Engineering Diagnostic Pattern
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-zinc-200">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="font-bold text-sky-400 block mb-1 font-mono text-xs uppercase">1. Observation</span>
                  <span className="text-xs text-zinc-300 leading-relaxed">What happened: Exact CLI state divergence identified.</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="font-bold text-amber-400 block mb-1 font-mono text-xs uppercase">2. Impact</span>
                  <span className="text-xs text-zinc-300 leading-relaxed">What it means: Routing blast radius and forwarding risk.</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="font-bold text-[#c8ff00] block mb-1 font-mono text-xs uppercase">3. Next Step</span>
                  <span className="text-xs text-zinc-300 leading-relaxed">Action required: Remediation or rollback show command.</span>
                </div>
              </div>
            </div>

            {/* Advisory Framing Disclaimer */}
            <div className="p-3.5 rounded-lg border-l-2 border-amber-500 bg-zinc-900/40 text-sm text-zinc-200 space-y-1">
              <span className="font-bold text-amber-400">Advisory Engineering Protocol: </span>
              <span>
                DriftGuard AI evaluations are strictly advisory interpretations. The licensed network engineer retains complete operational authority and responsibility before approving change sign-offs.
              </span>
            </div>

            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/analysis?tab=report')}
              >
                Go to AI Risk Analysis
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TECHNICAL SPECIFICATIONS & READ-ONLY WHITELIST REFERENCE               */}
      {/* ========================================================================= */}
      <div className="border-t border-zinc-800/80 pt-8 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
            Platform Specifications & Operational Guarantees
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            Architecture and safety constraints enforced across all sessions and automated collectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-300">
          {/* Col 1 */}
          <div className="space-y-2 p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <ShieldCheck className="w-5 h-5 text-[#c8ff00]" weight="fill" />
              <span>Read-Only Whitelist Enforcement</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              DriftGuard strictly executes read-only <code className="font-mono text-zinc-100">show</code> commands. Mutating Cisco CLI directives (<code className="font-mono text-rose-400">reload</code>, <code className="font-mono text-rose-400">write erase</code>, <code className="font-mono text-rose-400">configure terminal</code>) are rejected by the AST parser before transmission.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2 p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <LockKey className="w-5 h-5 text-[#c8ff00]" weight="fill" />
              <span>Zero-Plaintext Secret Architecture</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              All SSH credentials, passphrases, and vendor API tokens are encrypted via AWS KMS customer master keys prior to DynamoDB persistence. Authentication tokens are bound to ephemeral browser session storage with 30-minute inactivity timeouts.
            </p>
          </div>

          {/* Col 3 */}
          <div className="space-y-2 p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <ClockCounterClockwise className="w-5 h-5 text-[#c8ff00]" weight="fill" />
              <span>Immutable Snapshot Vault</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Every snapshot captured is timestamped and written to an immutable archive. Historical states cannot be modified or rewritten, preserving a complete audit record for compliance and post-mortem analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
