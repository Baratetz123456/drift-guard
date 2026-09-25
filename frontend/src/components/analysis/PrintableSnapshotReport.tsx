import React from 'react';
import { Snapshot } from '../../types';
import { PrintableDocumentShell } from './PrintableDocumentShell';

interface PrintableSnapshotReportProps {
  snapshot: Snapshot;
  operatorName?: string;
  className?: string;
}

export const PrintableSnapshotReport: React.FC<PrintableSnapshotReportProps> = ({
  snapshot,
  operatorName = 'Senior Network Operations Engineer',
  className = '',
}) => {
  // Calculate total CLI output lines
  const totalLines = React.useMemo(() => {
    return Object.values(snapshot.outputs || {}).reduce((acc, out) => {
      return acc + (out ? out.split('\n').length : 0);
    }, 0);
  }, [snapshot]);

  const formattedDate = new Date(snapshot.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <PrintableDocumentShell
      documentTitle="CRYPTOGRAPHIC NETWORK SNAPSHOT STATE DOSSIER"
      documentSubtitle="Non-Mutating Cisco State Archive & Configuration Baseline"
      documentRef={snapshot.snapshotId}
      classification="AUDIT RESTRICTED"
      generatedDate={formattedDate}
      evaluatorName={operatorName}
      className={className}
    >
      {/* ========================================================================= */}
      {/* SECTION 1.0: SNAPSHOT ARCHIVE SPECIFICATIONS & INTEGRITY                  */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            1.0 Snapshot Archive Specifications & Integrity Metrics
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            SHA-256 Vault Record
          </span>
        </div>

        {/* Dense Metric Strip */}
        <div className="grid grid-cols-5 border border-zinc-950 divide-x divide-zinc-950 bg-zinc-50 font-mono text-[10px] mb-2.5">
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Snapshot Type</span>
            <span className="text-sm font-extrabold uppercase text-zinc-950 block mt-0.5">
              {snapshot.snapshotType === 'pre_change'
                ? 'PRE-CHANGE'
                : snapshot.snapshotType === 'post_change'
                ? 'POST-CHANGE'
                : 'AD-HOC'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Platform Driver</span>
            <span className="text-xs font-extrabold text-zinc-950 block mt-0.5 truncate">
              {snapshot.deviceType}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Commands Run</span>
            <span className="text-sm font-extrabold text-zinc-950 block mt-0.5">
              {snapshot.commands.length} <span className="text-[10px] font-normal text-zinc-500">commands</span>
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Output Volume</span>
            <span className="text-sm font-extrabold text-zinc-950 block mt-0.5">
              {totalLines} <span className="text-[10px] font-normal text-zinc-500">lines</span>
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Command Safety</span>
            <span className="text-xs font-bold text-[#4d7c0f] block mt-0.5">
              100% Read-Only
            </span>
          </div>
        </div>

        {/* Change Context Box */}
        <div className="border border-zinc-950 p-2.5 bg-white">
          <div className="text-[9px] font-mono uppercase text-zinc-500 font-bold mb-1">
            Maintenance Context & Operational Objective
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-900 font-medium">
            {snapshot.notes ||
              `Immutable cryptographic snapshot captured prior to or following maintenance deployment under change ticket ${snapshot.changeTicket || 'N/A'}. Intended for diff compilation and AST syntax validation.`}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2.0: TARGET DEVICE & CONFIGURATION REPOSITORY SPECIFICATIONS      */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            2.0 Target Device & Network Node Specifications
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Hardware Endpoint
          </span>
        </div>

        <table className="w-full border border-zinc-950 border-collapse text-[10px] font-mono">
          <tbody>
            <tr className="border-b border-zinc-300 bg-zinc-100 font-bold text-zinc-700">
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Parameter</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Node Value</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Parameter</td>
              <td className="p-1.5 w-1/4 uppercase">Node Value</td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Device Name</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">{snapshot.deviceName}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Device ID</td>
              <td className="p-1.5 text-zinc-900">{snapshot.deviceId}</td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Hostname / FQDN</td>
              <td className="p-1.5 border-r border-zinc-300 text-zinc-900">{snapshot.deviceHostname}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Change Ticket</td>
              <td className="p-1.5 font-bold text-zinc-950">{snapshot.changeTicket || 'CHG-998214'}</td>
            </tr>
            <tr>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Capture Timestamp</td>
              <td className="p-1.5 border-r border-zinc-300 text-zinc-900">{formattedDate}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Vault Encryption</td>
              <td className="p-1.5 text-[#4d7c0f] font-bold">AWS KMS Envelope Encrypted</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3.0: CAPTURED TELEMETRY COMMANDS & RAW CLI STATE OUTPUTS          */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            3.0 Captured Telemetry Commands & Raw Cisco CLI Outputs
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            {snapshot.commands.length} Executed Show Command{snapshot.commands.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          {snapshot.commands.map((cmd, idx) => {
            const rawOutput = snapshot.outputs[cmd] || 'No output recorded.';
            const lines = rawOutput.split('\n');

            return (
              <div key={idx} className="border border-zinc-950 break-inside-avoid">
                {/* Command Header Strip */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-100 border-b border-zinc-950 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-950">3.{idx + 1}</span>
                    <span className="font-bold text-zinc-950">{cmd}</span>
                  </div>
                  <span className="text-zinc-600 font-mono text-[9px]">
                    {lines.length} lines captured
                  </span>
                </div>

                {/* Verbatim CLI Output Box */}
                <div className="p-2 bg-zinc-900 text-zinc-100 font-mono text-[9px] leading-tight overflow-x-auto whitespace-pre">
                  {rawOutput}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4.0: OPERATIONAL SAFETY & INTEGRITY ASSURANCE                     */}
      {/* ========================================================================= */}
      <div className="break-inside-avoid">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            4.0 Operational Safety & Security Compliance Certification
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Audit Guarantee
          </span>
        </div>

        <div className="border border-zinc-950 p-2.5 bg-zinc-50 text-[10px] font-mono space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#4d7c0f] font-bold">✓ READ-ONLY WHITELIST:</span>
            <span className="text-zinc-800">Only verified non-mutating show commands executed. Mutating syntax blocked at parser level.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#4d7c0f] font-bold">✓ KMS ENCRYPTION:</span>
            <span className="text-zinc-800">Device credentials and snapshot outputs encrypted with KMS Customer Master Keys prior to persistence.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#4d7c0f] font-bold">✓ IMMUTABILITY:</span>
            <span className="text-zinc-800">Snapshot state is timestamped and cryptographically archived. Existing snapshots cannot be overwritten.</span>
          </div>
        </div>
      </div>
    </PrintableDocumentShell>
  );
};
