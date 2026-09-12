import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  WarningOctagon,
  Sparkle,
  Terminal,
  ShieldCheck,
  Scales,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Terms of Service — DriftGuard',
    description:
      'DriftGuard terms of service detailing Cisco read-only execution guarantees, fleet authorization, and advisory AI framing.',
    canonicalPath: '/terms',
    robots: 'index, follow',
  });

  const sections = [
    { id: 'acceptance', title: '1. Acceptance and fleet authorization' },
    { id: 'read-only', title: '2. Cisco read-only execution guarantee' },
    { id: 'ai-advisory', title: '3. Advisory AI risk and human authority' },
    { id: 'credentials', title: '4. Credential custody and access security' },
    { id: 'service-levels', title: '5. Service availability and thresholds' },
    { id: 'liability', title: '6. Limitation of operational liability' },
    { id: 'termination', title: '7. Termination and inventory purging' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-[#c8ff00] selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <Link to="/" className="flex items-center gap-2.5">
              <BrandLogo variant="full" size={24} />
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-500 hidden sm:inline">Legal documentation:</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-bold border border-zinc-800">
              Terms of service
            </span>
            <Link
              to="/privacy"
              className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Privacy policy
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-16 space-y-12">
        {/* Document Title Header */}
        <div className="space-y-3 border-b border-zinc-800/80 pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
            <Scales className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
            <span>Operational Master Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of service
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            These terms govern the use of DriftGuard for network state collection, configuration diffing, and advisory AI risk evaluation across enterprise Cisco hardware.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-2">
            <span>Effective: September 11, 2026</span>
            <span>•</span>
            <span>Platform version: 1.2</span>
          </div>
        </div>

        {/* Quick Jump Table of Contents */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#c8ff00]" />
            Table of contents
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-zinc-400 hover:text-[#c8ff00] transition-colors py-0.5"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section id="acceptance" className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">01.</span>
              Acceptance and fleet authorization
            </h2>
            <p>
              By accessing or using the DriftGuard platform, you warrant that you are a certified or authorized network engineer, systems administrator, or infrastructure architect acting on behalf of your organization.
            </p>
            <p>
              You represent and warrant that you hold legitimate operational authorization to connect to, issue commands on, and gather configuration state from all Cisco IOS, XE, XR, and NX-OS devices registered in your inventory.
            </p>
          </section>

          {/* Section 2 */}
          <section id="read-only" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">02.</span>
              Cisco read-only execution guarantee
            </h2>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Terminal className="w-4 h-4 text-[#c8ff00]" weight="bold" />
                <span>Enforced show commands only</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                DriftGuard strictly enforces read-only operations. The system parser and transport daemon block all state-mutating commands (e.g. reload, write erase, configure terminal, no shutdown).
              </p>
            </div>
            <p>
              Users shall not attempt to circumvent regex validators, inject configuration blocks, or deploy commands that mutate device forwarding planes, routing processes, or administrative state. Any intentional attempt to bypass read-only safety filters constitutes an immediate violation of these terms.
            </p>
          </section>

          {/* Section 3 */}
          <section id="ai-advisory" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">03.</span>
              Advisory AI risk and human authority
            </h2>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <WarningOctagon className="w-4 h-4 text-rose-400" weight="fill" />
                <span>Advisory AI disclaimer</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                All AI-generated risk evaluations, anomaly detections, severity metrics, and remediation runbooks are strictly advisory guidance. The licensed network engineer retains complete operational authority and responsibility for all network changes.
              </p>
            </div>
            <p>
              DriftGuard's AI analysis serves as an automated second opinion to assist senior engineers during maintenance windows. DriftGuard does not automatically execute rollback runbooks or modify device configurations without explicit, human-controlled operator command entry.
            </p>
          </section>

          {/* Section 4 */}
          <section id="credentials" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">04.</span>
              Credential custody and access security
            </h2>
            <p>
              Operators are responsible for maintaining the confidentiality of their operator authentication credentials and configured SSH service accounts. We strongly recommend configuring dedicated read-only TACACS+ or RADIUS privilege levels (e.g. Cisco Privilege Level 1 or read-only view) for all DriftGuard collection targets.
            </p>
            <p>
              DriftGuard guarantees that credentials submitted to the platform are protected using cryptographic envelope encryption with hardware-grade security modules.
            </p>
          </section>

          {/* Section 5 */}
          <section id="service-levels" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">05.</span>
              Service availability and thresholds
            </h2>
            <p>
              DriftGuard operates on a high-availability cloud-native architecture engineered for 99.9% uptime. Automated snapshots are processed through parallel orchestration workers subject to the following default thresholds:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Default SSH execution timeout: 30 seconds per command</li>
              <li>Maximum concurrent collection targets: 50 devices per batch</li>
              <li>Snapshot vault retention: In accordance with configured lifecycle settings</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="liability" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">06.</span>
              Limitation of operational liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, DriftGuard and its contributors shall not be liable for any indirect, consequential, or operational damages, including but not limited to packet drop, BGP peer session flaps, forwarding interruptions, or revenue loss resulting from network changes executed during or following DriftGuard snapshot analyses.
            </p>
            <p>
              DriftGuard provides state diffing tools "as is" to aid visibility; the operator remains responsible for validating routing convergence and forwarding stability.
            </p>
          </section>

          {/* Section 7 */}
          <section id="termination" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">07.</span>
              Termination and inventory purging
            </h2>
            <p>
              An operator or organization may terminate access to DriftGuard at any time. Upon account retirement, all registered devices, encrypted credential records, and snapshot metadata in persistent datastores are deleted, and associated snapshot vault archives are permanently purged.
            </p>
          </section>
        </div>

        {/* Document Footer */}
        <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} DriftGuard Network Verification. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">
              Privacy policy
            </Link>
            <Link to="/login" className="text-[#c8ff00] font-bold hover:underline">
              Operator sign in &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
