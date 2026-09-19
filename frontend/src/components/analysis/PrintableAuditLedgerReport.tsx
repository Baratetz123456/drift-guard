import React from 'react';
import { AuditLogEntry } from '../../types';
import { PrintableDocumentShell } from './PrintableDocumentShell';

interface PrintableAuditLedgerReportProps {
  logs: AuditLogEntry[];
  operatorName?: string;
  className?: string;
}

export const PrintableAuditLedgerReport: React.FC<PrintableAuditLedgerReportProps> = ({
  logs,
  operatorName = 'Senior Security & Compliance Auditor',
  className = '',
}) => {
  const successCount = logs.filter((l) => l.status === 'SUCCESS').length;
  const uniqueUsers = Array.from(new Set(logs.map((l) => l.userEmail)));
  const ledgerId = `DG-LEDGER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  return (
    <PrintableDocumentShell
      documentTitle="COMPREHENSIVE AUDIT TRAIL LEDGER DOSSIER"
      documentSubtitle="Full Chronological Record of Network Operations & Automated Sweeps"
      documentRef={ledgerId}
      classification="SECURITY AUDIT • RESTRICTED"
      evaluatorName={operatorName}
      className={className}
    >
      {/* ========================================================================= */}
      {/* SECTION 1.0: AUDIT TRAIL AGGREGATION METRICS                              */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            1.0 Audit Trail Summary & System Ledger Aggregation
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Append-Only Datastore
          </span>
        </div>

        {/* Dense Metric Strip */}
        <div className="grid grid-cols-4 border border-zinc-950 divide-x divide-zinc-950 bg-zinc-50 font-mono text-[10px] mb-2.5">
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Total Recorded Events</span>
            <span className="text-sm font-extrabold text-zinc-950 block mt-0.5">
              {logs.length} <span className="text-[10px] font-normal text-zinc-500">events</span>
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Success Rate</span>
            <span className="text-sm font-extrabold text-[#4d7c0f] block mt-0.5">
              {logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100}%
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Active Operators</span>
            <span className="text-sm font-extrabold text-zinc-950 block mt-0.5">
              {uniqueUsers.length} <span className="text-[10px] font-normal text-zinc-500">engineers</span>
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Ledger Retention</span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              90-Day Auto-Purge
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2.0: CHRONOLOGICAL AUDIT LEDGER TABLE                            */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            2.0 Chronological Audit Event Log Entries
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Page 1 of {Math.ceil(logs.length / 25) || 1}
          </span>
        </div>

        <table className="w-full border border-zinc-950 border-collapse text-[9px] font-mono">
          <thead>
            <tr className="border-b border-zinc-950 bg-zinc-100 font-bold text-zinc-800">
              <th className="p-1.5 border-r border-zinc-300 text-left w-16">Status</th>
              <th className="p-1.5 border-r border-zinc-300 text-left w-28">Timestamp</th>
              <th className="p-1.5 border-r border-zinc-300 text-left">Action</th>
              <th className="p-1.5 border-r border-zinc-300 text-left">Resource ID</th>
              <th className="p-1.5 border-r border-zinc-300 text-left">Operator Email</th>
              <th className="p-1.5 text-left w-24">Event ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-center text-zinc-500 italic">
                  Zero audit log entries recorded in the current active session.
                </td>
              </tr>
            ) : (
              logs.map((entry, idx) => (
                <tr
                  key={entry.auditId || idx}
                  className="border-b border-zinc-200 hover:bg-zinc-50 even:bg-zinc-50/50"
                >
                  <td className="p-1 border-r border-zinc-200 font-bold">
                    <span
                      className={`inline-block px-1 py-0.2 rounded text-[8px] ${
                        entry.status === 'SUCCESS' ? 'text-[#4d7c0f]' : 'text-rose-700'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-1 border-r border-zinc-200 text-zinc-600 truncate">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="p-1 border-r border-zinc-200 font-bold text-zinc-900 truncate">
                    {entry.action}
                  </td>
                  <td className="p-1 border-r border-zinc-200 text-zinc-700 truncate">
                    {entry.resourceId}
                  </td>
                  <td className="p-1 border-r border-zinc-200 text-zinc-700 truncate">
                    {entry.userEmail}
                  </td>
                  <td className="p-1 text-zinc-500 font-mono truncate">
                    {entry.auditId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3.0: REGULATORY COMPLIANCE ATTESTATION                            */}
      {/* ========================================================================= */}
      <div className="break-inside-avoid">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            3.0 Regulatory Compliance & Immutability Attestation
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Certification
          </span>
        </div>

        <div className="border border-zinc-950 p-2.5 bg-zinc-50 text-[10px] font-mono space-y-1">
          <p className="text-zinc-800">
            This audit ledger represents an automated extract of immutable network configuration modification and verification events. All timestamp records are synchronized to authoritative NTP time standards and persisted with AES-256 KMS customer master key encryption.
          </p>
        </div>
      </div>
    </PrintableDocumentShell>
  );
};
