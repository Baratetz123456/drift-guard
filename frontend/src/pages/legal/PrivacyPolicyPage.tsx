import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  HardDrives,
  Sparkle,
  FileText,
  Key,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Privacy Policy — DriftGuard',
    description:
      'DriftGuard privacy policy detailing cryptographic envelope encryption, secret scrubbing, and snapshot vault retention.',
    canonicalPath: '/privacy',
    robots: 'index, follow',
  });

  const sections = [
    { id: 'scope', title: '1. Scope and application' },
    { id: 'telemetry', title: '2. Fleet telemetry and data collected' },
    { id: 'kms', title: '3. Cryptographic envelope encryption' },
    { id: 'secret-masking', title: '4. Secret masking and AI telemetry' },
    { id: 's3-retention', title: '5. Snapshot storage and vault retention' },
    { id: 'audit-rights', title: '6. Operator audit trail and rights' },
    { id: 'contact', title: '7. Security contact and governance' },
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
            <Link
              to="/terms"
              className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Terms of service
            </Link>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-bold border border-zinc-800">
              Privacy policy
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-16 space-y-12">
        {/* Document Title Header */}
        <div className="space-y-3 border-b border-zinc-800/80 pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
            <span>Enterprise NetOps Security Specification</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy policy
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            This policy defines how DriftGuard collects, encrypts, processes, and archives network device configuration telemetry, credentials, and automated snapshot archives.
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

        {/* Legal Sections */}
        <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section id="scope" className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">01.</span>
              Scope and application
            </h2>
            <p>
              DriftGuard is a specialized network change verification and diff telemetry platform built for network engineers and infrastructure architects. This policy applies to all network state snapshots, authentication credentials, and diagnostic data processed across DriftGuard's cloud-native microservices and client interfaces.
            </p>
            <p>
              DriftGuard operates strictly within designated customer environments and virtual private networks. We do not sell, broker, or aggregate network telemetry for marketing purposes.
            </p>
          </section>

          {/* Section 2 */}
          <section id="telemetry" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">02.</span>
              Fleet telemetry and data collected
            </h2>
            <p>
              To execute automated pre- and post-change configuration diffing, DriftGuard gathers only operational CLI telemetry explicitly requested in command sets:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Device metadata:</strong> Management IPv4/IPv6 addresses, hostnames, device models, and operating system types (Cisco IOS, IOS-XE, IOS-XR, NX-OS, ASA).
              </li>
              <li>
                <strong className="text-zinc-200">State outputs:</strong> Read-only show command outputs (e.g. routing tables, BGP peer summaries, interface status, VLAN databases).
              </li>
              <li>
                <strong className="text-zinc-200">Change context:</strong> Optional change management ticket IDs (e.g. CHG-998214) and operator notes for baseline correlation.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="kms" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">03.</span>
              Cryptographic envelope encryption
            </h2>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Key className="w-4 h-4 text-[#c8ff00]" />
                <span>Zero-plaintext credential persistence</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                SSH passwords, private keys, enable secrets, and AI provider API keys are protected using cryptographic envelope encryption with AES-256-GCM prior to datastore persistence.
              </p>
            </div>
            <p>
              Plaintext credentials reside exclusively in ephemeral memory during active SSH collection tasks and are securely zeroed immediately upon session termination. Plaintext credentials are never written to disk, database records, audit logs, or client-side browser storage.
            </p>
          </section>

          {/* Section 4 */}
          <section id="secret-masking" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">04.</span>
              Secret masking and AI telemetry
            </h2>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkle className="w-4 h-4 text-[#c8ff00]" weight="fill" />
                <span>Automated pre-inference regex scrubbing</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When diffs are sent to configured AI models for advisory risk analysis, DriftGuard's token preparation engine strips sensitive strings using regex filters.
              </p>
            </div>
            <p>
              The following patterns are scrubbed and replaced with generic tokens prior to external model API transmission:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Cisco Type 5, 7, and 8 password hashes</li>
              <li>BGP MD5 neighbor authentication strings</li>
              <li>SNMP community strings and v3 authentication phrases</li>
              <li>Pre-shared IKE/IPsec VPN keys</li>
            </ul>
            <p className="text-xs text-zinc-400">
              DriftGuard enforces zero-data-retention agreements with supported AI model providers; customer configuration diffs are not used to train public foundation models.
            </p>
          </section>

          {/* Section 5 */}
          <section id="s3-retention" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">05.</span>
              Snapshot storage and vault retention
            </h2>
            <p>
              Snapshots and diff files are stored in an immutable encrypted snapshot archive vault with server-side encryption enabled (AES-256 with customer-managed keys). Snapshot vaults enforce strict network policies prohibiting public access and requiring TLS 1.3 for in-transit communication.
            </p>
            <p>
              Operators retain total lifecycle control over their snapshot archives. When a snapshot or device is deleted by an operator, the associated vault objects are unlinked and permanently purged in accordance with configured retention lifecycle rules.
            </p>
          </section>

          {/* Section 6 */}
          <section id="audit-rights" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">06.</span>
              Operator audit trail and rights
            </h2>
            <p>
              Every action executed within DriftGuard—including device registration, credential modification, snapshot capture, diff comparison, and AI risk analysis—is recorded in an immutable audit log. Each entry records the authenticated operator identity, IP address, timestamp, and target resource.
            </p>
            <p>
              Organizations have the right to export full audit trails as JSON or CSV at any time for compliance audits (SOC 2, ISO 27001, HIPAA).
            </p>
          </section>

          {/* Section 7 */}
          <section id="contact" className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#c8ff00] font-mono text-base">07.</span>
              Security contact and governance
            </h2>
            <p>
              For vulnerability disclosures, security audits, or inquiries regarding telemetry processing, contact the DriftGuard security and engineering team:
            </p>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono space-y-1">
              <div>Email: security@driftguard.local</div>
              <div>PGP Key ID: 0x9F2CD4A1</div>
              <div>Response SLA: Within 24 business hours</div>
            </div>
          </section>
        </div>

        {/* Document Footer */}
        <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} DriftGuard Network Verification. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">
              Terms of service
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
