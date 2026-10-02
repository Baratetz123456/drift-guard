import React from 'react';

interface PrintableDocumentShellProps {
  documentTitle: string;
  documentSubtitle?: string;
  documentRef: string;
  classification?: string;
  generatedDate?: string;
  evaluatorName?: string;
  children: React.ReactNode;
  isApprovedByDefault?: boolean;
  isConditionalApproved?: boolean;
  isRollbackMandated?: boolean;
  pageNotation?: string;
  className?: string;
}

export const PrintableDocumentShell: React.FC<PrintableDocumentShellProps> = ({
  documentTitle,
  documentSubtitle = 'Automated Cisco State Verification & Tamper-Evident Ledger',
  documentRef,
  classification = 'AUDIT RESTRICTED',
  generatedDate,
  evaluatorName = 'Senior Network Operations Engineer',
  children,
  isApprovedByDefault = true,
  isConditionalApproved = false,
  isRollbackMandated = false,
  pageNotation = 'Page 1 of 1',
  className = '',
}) => {
  const formattedDate =
    generatedDate ||
    new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

  return (
    <div
      id="printable-document-shell"
      className={`w-[210mm] min-h-[297mm] mx-auto bg-white text-zinc-950 p-[14mm] font-sans box-border text-[12px] leading-normal print:w-full print:min-h-0 print:p-0 print:m-0 ${className}`}
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      {/* ========================================================================= */}
      {/* UNIFIED DRIFTGUARD MASTHEAD & DOCUMENT CONTROL TABLE                     */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-zinc-950 pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-start gap-3">
            <svg
              className="w-10 h-10 text-zinc-950 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="DriftGuard Logo"
            >
              {/* Geometric Shield Outline */}
              <path
                d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                stroke="#09090b"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Baseline Trace (y = 8) */}
              <path
                d="M7 8h10"
                stroke="#4d7c0f"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Divergent Trace (y = 16 -> 12) */}
              <path
                d="M7 16h4l4-4h3"
                stroke="#09090b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Solid Catch-Point Node */}
              <circle cx="18" cy="12" r="2.25" fill="#4d7c0f" />
            </svg>

            <div>
              <div className="text-xl font-black tracking-tight text-zinc-950 uppercase font-mono leading-none">
                DriftGuard
              </div>
              <div className="text-[10px] font-mono text-[#4d7c0f] font-bold tracking-widest uppercase mt-0.5">
                Before. After. Understood.
              </div>
              <div className="text-[13px] font-extrabold text-zinc-950 uppercase tracking-tight mt-1 font-mono">
                {documentTitle}
              </div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                {documentSubtitle}
              </div>
            </div>
          </div>

          {/* Document Control Table */}
          <table className="border border-zinc-900 border-collapse text-[10px] font-mono shrink-0 w-64">
            <tbody>
              <tr className="border-b border-zinc-900 bg-zinc-100">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900 w-24">Doc Ref</td>
                <td className="px-2 py-0.5 font-bold text-zinc-950 truncate">{documentRef}</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Classification</td>
                <td className="px-2 py-0.5 font-bold text-zinc-950">{classification}</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Generated</td>
                <td className="px-2 py-0.5 text-zinc-900 truncate">{formattedDate}</td>
              </tr>
              <tr>
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Evaluator</td>
                <td className="px-2 py-0.5 font-medium text-zinc-900 truncate">{evaluatorName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT BODY CONTENT                                                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {children}
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED SENIOR NETWORK ENGINEER VERIFICATION SIGN-OFF BLOCK              */}
      {/* ========================================================================= */}
      <div className="border-t-2 border-zinc-950 pt-2.5 mt-5 break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            Authorized Engineering Approval & Cryptographic Sign-Off
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Mandatory Operator Authorization
          </span>
        </div>

        <table className="w-full border border-zinc-950 border-collapse text-[10px] font-mono">
          <tbody>
            <tr className="border-b border-zinc-300">
              <td className="p-2 border-r border-zinc-300 w-1/3 align-top">
                <span className="text-[9px] text-zinc-500 uppercase block">Lead Reviewer</span>
                <span className="font-bold text-zinc-950 block mt-1">{evaluatorName}</span>
                <div className="h-9 border-b border-zinc-400 mt-2.5 flex items-end">
                  <span className="text-[8px] text-zinc-400 italic">Signature</span>
                </div>
              </td>
              <td className="p-2 border-r border-zinc-300 w-1/3 align-top">
                <span className="text-[9px] text-zinc-500 uppercase block">Verification Timestamp</span>
                <span className="font-bold text-zinc-950 block mt-1">{new Date().toLocaleString()}</span>
                <div className="h-9 border-b border-zinc-400 mt-2.5 flex items-end">
                  <span className="text-[8px] text-zinc-400 italic">Date</span>
                </div>
              </td>
              <td className="p-2 w-1/3 align-top">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Operational Disposition</span>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {isApprovedByDefault ? '✓' : ''}
                    </span>
                    <span>CHANGE / STATE APPROVED</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {isConditionalApproved ? '✓' : ''}
                    </span>
                    <span>CONDITIONAL APPROVAL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {isRollbackMandated ? '✓' : ''}
                    </span>
                    <span>ROLLBACK / REVOCATION</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="p-2 text-[9px] text-zinc-600 bg-zinc-50">
                <strong>Attestation: </strong> I confirm that this document represents verified cryptographic telemetry, immutable audit logging, and read-only non-mutating Cisco state verified under DriftGuard operational safety protocols.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* REPEATING FOOTER & TAMPER-EVIDENT INTEGRITY                               */}
      {/* ========================================================================= */}
      <div className="border-t border-zinc-950 pt-2 mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-500">
        <div>
          <span>DriftGuard Automated Verification • SHA-256 Tamper-Evident Vault Log</span>
        </div>
        <div>
          <span>Doc Ref: {documentRef} • {pageNotation}</span>
        </div>
      </div>
    </div>
  );
};
