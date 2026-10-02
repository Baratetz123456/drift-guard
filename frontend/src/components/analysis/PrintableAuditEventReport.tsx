import React from 'react';
import { AuditLogEntry } from '../../types';
import { PrintableDocumentShell } from './PrintableDocumentShell';

interface PrintableAuditEventReportProps {
  log: AuditLogEntry;
  operatorName?: string;
  className?: string;
}

export const PrintableAuditEventReport: React.FC<PrintableAuditEventReportProps> = ({
  log,
  operatorName = 'Senior Security & Compliance Auditor',
  className = '',
}) => {
  const formattedDate = new Date(log.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <PrintableDocumentShell
      documentTitle="IMMUTABLE SECURITY AUDIT EVENT RECORD"
      documentSubtitle="Tamper-Evident Infrastructure Operations Ledger"
      documentRef={log.auditId}
      classification="SECURITY AUDIT • RESTRICTED"
      generatedDate={formattedDate}
      evaluatorName={operatorName}
      isApprovedByDefault={log.status === 'SUCCESS'}
      isRollbackMandated={log.status === 'FAILED'}
      className={className}
    >
      {/* ========================================================================= */}
      {/* SECTION 1.0: AUDIT EVENT SPECIFICATION & STATUS                           */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            1.0 Audit Event Specification & Execution Status
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Append-Only Audit Record
          </span>
        </div>

        {/* Dense Metric Strip */}
        <div className="grid grid-cols-5 border border-zinc-950 divide-x divide-zinc-950 bg-zinc-50 font-mono text-[10px] mb-2.5">
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Execution Status</span>
            <span
              className={`text-sm font-extrabold uppercase block mt-0.5 ${
                log.status === 'SUCCESS'
                  ? 'text-[#4d7c0f]'
                  : log.status === 'WARNING'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {log.status}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Event Action</span>
            <span className="text-xs font-extrabold text-zinc-950 block mt-0.5 truncate" title={log.action}>
              {log.action}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Resource Target</span>
            <span className="text-xs font-extrabold text-zinc-950 block mt-0.5 truncate">
              {log.resource || 'DEVICE'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Operator Email</span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5 truncate" title={log.userEmail}>
              {log.userEmail}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Origin IP</span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              {log.ipAddress || '127.0.0.1 (Local)'}
            </span>
          </div>
        </div>

        {/* Event Narrative Box */}
        <div className="border border-zinc-950 p-2.5 bg-white">
          <div className="text-[9px] font-mono uppercase text-zinc-500 font-bold mb-1">
            Audit Event Narrative & Impact Assessment
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-900 font-medium">
            Operator <strong className="text-zinc-950">{log.userEmail}</strong> executed operational action{' '}
            <strong className="text-zinc-950">{log.action}</strong> against resource{' '}
            <strong className="text-zinc-950 font-mono">{log.resourceId}</strong> ({log.resource}). Event was validated and committed to the immutable persistent audit ledger with execution status {log.status}.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2.0: OPERATOR IDENTITY & ACCESS CONTEXT                           */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            2.0 Operator Identity & Cryptographic Session Context
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Cognito User Pool ID
          </span>
        </div>

        <table className="w-full border border-zinc-950 border-collapse text-[10px] font-mono">
          <tbody>
            <tr className="border-b border-zinc-300 bg-zinc-100 font-bold text-zinc-700">
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Parameter</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Identity Value</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Parameter</td>
              <td className="p-1.5 w-1/4 uppercase">Security Property</td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">User Sub (UUID)</td>
              <td className="p-1.5 border-r border-zinc-300 text-zinc-900 truncate">{log.userId}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Session Storage</td>
              <td className="p-1.5 text-zinc-900">Ephemeral (tab-scoped)</td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Operator Email</td>
              <td className="p-1.5 border-r border-zinc-300 text-zinc-900">{log.userEmail}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Inactivity Limit</td>
              <td className="p-1.5 text-zinc-900">30 Minutes (Enforced)</td>
            </tr>
            <tr>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Event Timestamp</td>
              <td className="p-1.5 border-r border-zinc-300 text-zinc-900">{formattedDate}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Retention Period</td>
              <td className="p-1.5 text-[#4d7c0f] font-bold">90 Days (TTL Immutable)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3.0: STRUCTURED EVENT PAYLOAD & PARAMETERS                        */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            3.0 Event Action Parameters & Structured JSON Payload
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Payload Telemetry
          </span>
        </div>

        <div className="border border-zinc-950 p-2.5 bg-zinc-50">
          <pre className="p-2 bg-zinc-900 text-zinc-100 font-mono text-[9px] leading-tight overflow-x-auto whitespace-pre-wrap border border-zinc-800">
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4.0: COMPLIANCE & TAMPER-EVIDENT ARCHITECTURE                     */}
      {/* ========================================================================= */}
      <div className="break-inside-avoid">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            4.0 Cryptographic Integrity & Regulatory Compliance Statement
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Enterprise Certification
          </span>
        </div>

        <div className="border border-zinc-950 p-2.5 bg-zinc-50 text-[10px] font-mono space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#4d7c0f] font-bold">✓ APPEND-ONLY ARCHITECTURE:</span>
            <span className="text-zinc-800">Audit logs cannot be updated or modified by any user or administrator session.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#4d7c0f] font-bold">✓ KMS SIGNED:</span>
            <span className="text-zinc-800">Every operational entry is validated and sealed with cryptographic HMAC integrity keys.</span>
          </div>
        </div>
      </div>
    </PrintableDocumentShell>
  );
};
