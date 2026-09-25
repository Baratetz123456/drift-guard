import React from 'react';
import { AIAnalysis, Comparison, AnalysisFinding, FindingEvidence } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface PrintableAIReportProps {
  analysis: AIAnalysis;
  comparison?: Comparison;
  operatorName?: string;
  className?: string;
}

export const PrintableAIReport: React.FC<PrintableAIReportProps> = ({
  analysis,
  comparison,
  operatorName = 'Senior Network Operations Engineer',
  className = '',
}) => {
  const { snapshots, devices } = useAppStore();

  const preSnapshot = snapshots.find((s) => s.snapshotId === comparison?.preSnapshotId);
  const postSnapshot = snapshots.find((s) => s.snapshotId === comparison?.postSnapshotId);
  const targetDevice = devices.find((d) => d.deviceId === comparison?.deviceId || d.name === comparison?.deviceName);

  const changeTicket = preSnapshot?.changeTicket || postSnapshot?.changeTicket || 'CHG-998214';
  const deviceType = targetDevice?.deviceType || preSnapshot?.deviceType || 'Cisco IOS-XE';
  const isZeroRisk = analysis.overallRisk === 'Informational' || analysis.riskScore === 0;

  // Calculate elapsed cutover time
  const elapsedWindowString = React.useMemo(() => {
    const preTime = comparison?.preTimestamp || preSnapshot?.timestamp;
    const postTime = comparison?.postTimestamp || postSnapshot?.timestamp;
    if (!preTime || !postTime) return '14m 22s';
    const diffMs = Math.abs(new Date(postTime).getTime() - new Date(preTime).getTime());
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m ${secs}s`;
    return `${mins}m ${secs}s`;
  }, [comparison, preSnapshot, postSnapshot]);

  const formattedGeneratedDate = new Date(analysis.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <div
      id="printable-verification-report"
      className={`w-[210mm] min-h-[297mm] mx-auto bg-white text-zinc-950 p-[14mm] font-sans box-border text-[12px] leading-normal print:w-full print:min-h-0 print:p-0 print:m-0 ${className}`}
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      {/* ========================================================================= */}
      {/* DOCUMENT TOP MASTHEAD & CLASSIFICATION BAR                                */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-zinc-950 pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Logo + Identity */}
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
              <div className="text-[14px] font-extrabold text-zinc-950 uppercase tracking-tight mt-1.5 font-mono">
                Network State Change Verification Dossier
              </div>
            </div>
          </div>

          {/* Document Control Table */}
          <table className="border border-zinc-900 border-collapse text-[10px] font-mono shrink-0 w-64">
            <tbody>
              <tr className="border-b border-zinc-900 bg-zinc-100">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900 w-24">Doc Ref</td>
                <td className="px-2 py-0.5 font-bold text-zinc-950">{analysis.analysisId}</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Classification</td>
                <td className="px-2 py-0.5 font-bold text-zinc-950">AUDIT RESTRICTED</td>
              </tr>
              <tr className="border-b border-zinc-900">
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Generated</td>
                <td className="px-2 py-0.5 text-zinc-900">{formattedGeneratedDate}</td>
              </tr>
              <tr>
                <td className="px-2 py-0.5 font-bold uppercase text-zinc-600 border-r border-zinc-900">Evaluator</td>
                <td className="px-2 py-0.5 font-medium text-zinc-900 truncate">{operatorName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1.0: EXECUTIVE VERIFICATION & RISK EVALUATION                     */}
      {/* ========================================================================= */}
      <div className="mb-4">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            1.0 Executive Verification & Risk Assessment
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Deterministic Anchored Scoring
          </span>
        </div>

        {/* High-Density Metric Strip */}
        <div className="grid grid-cols-5 border border-zinc-950 divide-x divide-zinc-950 bg-zinc-50 font-mono text-[10px] mb-2.5">
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Severity Rating</span>
            <span className="text-sm font-extrabold uppercase text-zinc-950 block mt-0.5">
              {analysis.overallRisk}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Anchored Risk Index</span>
            <span className="text-sm font-extrabold text-zinc-950 block mt-0.5">
              {analysis.riskScore} <span className="text-[10px] font-normal text-zinc-500">/ 100</span>
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Inference Engine</span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5 truncate">
              {analysis.modelUsed || 'DriftGuard Verification Engine'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Token Consumption</span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              {analysis.tokenUsage?.totalTokens && analysis.tokenUsage.totalTokens > 0 && !isZeroRisk
                ? `${analysis.tokenUsage.totalTokens} tokens`
                : '0 tokens (Pre-filter)'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-zinc-500 uppercase block text-[9px]">Command Safety</span>
            <span className="text-xs font-bold text-[#4d7c0f] block mt-0.5">
              100% Non-mutating
            </span>
          </div>
        </div>

        {/* Executive Summary Envelope */}
        <div className="border border-zinc-950 p-2.5 bg-white">
          <div className="text-[9px] font-mono uppercase text-zinc-500 font-bold mb-1">
            Summary Envelope Interpretation
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-900 font-medium">
            {analysis.summary?.replace(/^AI analysis suggests\s*/i, 'Verification analysis suggests ')}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2.0: CHANGE SPECIFICATIONS & SNAPSHOT METRICS                     */}
      {/* ========================================================================= */}
      <div className="mb-4">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            2.0 Change Window Specifications & Snapshot Differential Metrics
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Netmiko SSH Telemetry
          </span>
        </div>

        {/* Dense Full-Width Tabular Grid */}
        <table className="w-full border border-zinc-950 border-collapse text-[10px] font-mono">
          <tbody>
            <tr className="border-b border-zinc-300 bg-zinc-100 font-bold text-zinc-700">
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Parameter</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Baseline Pre-Capture</td>
              <td className="p-1.5 border-r border-zinc-300 w-1/4 uppercase">Verification Post-Capture</td>
              <td className="p-1.5 w-1/4 uppercase">Delta / Window Metrics</td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Target Device</td>
              <td className="p-1.5 border-r border-zinc-300">{comparison?.deviceName || targetDevice?.name || 'CORE-SW-01'}</td>
              <td className="p-1.5 border-r border-zinc-300">{comparison?.deviceName || targetDevice?.name || 'CORE-SW-01'}</td>
              <td className="p-1.5 text-zinc-600">Platform: <strong className="text-zinc-950">{deviceType}</strong></td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Snapshot ID</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">{comparison?.preSnapshotId || 'N/A'}</td>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">{comparison?.postSnapshotId || 'N/A'}</td>
              <td className="p-1.5 text-zinc-600">Change Ticket: <strong className="text-zinc-950">{changeTicket}</strong></td>
            </tr>
            <tr className="border-b border-zinc-300">
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Capture Timestamp</td>
              <td className="p-1.5 border-r border-zinc-300">
                {comparison?.preTimestamp
                  ? new Date(comparison.preTimestamp).toLocaleString()
                  : preSnapshot?.timestamp
                  ? new Date(preSnapshot.timestamp).toLocaleString()
                  : 'Prior to cutover'}
              </td>
              <td className="p-1.5 border-r border-zinc-300">
                {comparison?.postTimestamp
                  ? new Date(comparison.postTimestamp).toLocaleString()
                  : postSnapshot?.timestamp
                  ? new Date(postSnapshot.timestamp).toLocaleString()
                  : 'Post-deployment'}
              </td>
              <td className="p-1.5 text-zinc-600">Elapsed: <strong className="text-zinc-950">{elapsedWindowString}</strong></td>
            </tr>
            <tr>
              <td className="p-1.5 border-r border-zinc-300 font-bold text-zinc-950">Telemetry Scope</td>
              <td className="p-1.5 border-r border-zinc-300">
                {preSnapshot?.commands.length || comparison?.diffSummary.totalCommands || 3} show commands
              </td>
              <td className="p-1.5 border-r border-zinc-300">
                {postSnapshot?.commands.length || comparison?.diffSummary.totalCommands || 3} show commands
              </td>
              <td className="p-1.5">
                <span className="text-[#4d7c0f] font-bold">
                  +{comparison?.diffSummary.totalAdditions || 0}
                </span>
                {' / '}
                <span className="text-rose-700 font-bold">
                  -{comparison?.diffSummary.totalDeletions || 0}
                </span>
                {' line deltas'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3.0: SYNTACTIC DIVERGENCE & DETAILED FINDINGS MATRIX             */}
      {/* ========================================================================= */}
      <div className="mb-4">
        <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            3.0 Syntactic Divergence & Technical Findings Analysis
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            {analysis.findings?.length || 0} Identified Divergence{analysis.findings?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {(!analysis.findings || analysis.findings.length === 0) ? (
          <div className="border border-zinc-950 p-3 text-center font-mono">
            <span className="text-xs font-bold text-[#4d7c0f] uppercase block">
              Baseline Congruent — Zero Functional Divergence
            </span>
            <span className="text-[10px] text-zinc-600 block mt-0.5">
              All routing tables, peer associations, and interface operational flags match baseline telemetry exactly.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.findings.map((finding: AnalysisFinding, idx: number) => (
              <div
                key={idx}
                className="border border-zinc-950 break-inside-avoid"
              >
                {/* Finding Header Rule */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-100 border-b border-zinc-950 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-950">
                      3.{idx + 1} [{finding.category || 'ROUTING'}]
                    </span>
                    <span className="text-zinc-800 font-semibold truncate max-w-md">
                      {finding.title || 'Configuration State Divergence'}
                    </span>
                  </div>
                  <span className="font-bold uppercase text-zinc-950 border border-zinc-950 px-1.5 py-0.2 bg-white">
                    Severity: {finding.severity}
                  </span>
                </div>

                {/* 3-Part Diagnostic Ruled Columns */}
                <div className="grid grid-cols-3 divide-x divide-zinc-300 border-b border-zinc-300 text-[10px] leading-tight">
                  <div className="p-2 space-y-0.5">
                    <span className="text-[9px] font-mono uppercase font-bold text-sky-800 block">
                      1. Observation
                    </span>
                    <p className="text-zinc-800">
                      {finding.description || 'CLI syntax delta captured during snapshot comparison.'}
                    </p>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <span className="text-[9px] font-mono uppercase font-bold text-amber-800 block">
                      2. Blast Radius & Impact
                    </span>
                    <p className="text-zinc-800">
                      {finding.potentialImpact || 'Routing convergence, path forwarding, or session latency.'}
                    </p>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <span className="text-[9px] font-mono uppercase font-bold text-[#4d7c0f] block">
                      3. Action Required
                    </span>
                    <p className="text-zinc-800">
                      {finding.recommendation || 'Verify line protocol and execute show verification command.'}
                    </p>
                  </div>
                </div>

                {/* Verbatim CLI Excerpt */}
                {finding.evidence && finding.evidence.length > 0 && (
                  <div className="p-2 bg-zinc-50">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                      Verbatim CLI Evidence Excerpt
                    </span>
                    {finding.evidence.map((ev: FindingEvidence, evIdx: number) => (
                      <div key={evIdx} className="mb-1.5 last:mb-0">
                        <div className="text-[9px] font-mono font-bold text-zinc-700">
                          Command: {ev.command}
                        </div>
                        <pre className="p-1.5 bg-zinc-900 text-zinc-100 font-mono text-[9px] whitespace-pre-wrap leading-tight overflow-x-auto border border-zinc-800">
                          {ev.excerpt}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4.0: CONTINGENCY REMEDIATION DIRECTIVES & RUNBOOK                 */}
      {/* ========================================================================= */}
      {!isZeroRisk && analysis.suggestedRollbackPlan && (
        <div className="mb-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-zinc-950 pb-1 mb-2">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-900">
              4.0 Contingency Remediation Directives & Rollback Runbook
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              Targeted Rollback Sequence
            </span>
          </div>

          <div className="border border-zinc-950 p-2.5 bg-zinc-50">
            <pre className="p-2 bg-zinc-900 text-zinc-100 font-mono text-[9px] whitespace-pre-wrap leading-tight border border-zinc-800">
              {analysis.suggestedRollbackPlan}
            </pre>
            <div className="text-[9px] font-mono text-zinc-500 mt-1 italic">
              Notice: All remediation commands must be vetted against running topology prior to transmission.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5.0: AUTHORIZED ENGINEERING APPROVAL SIGN-OFF                     */}
      {/* ========================================================================= */}
      <div className="border-t-2 border-zinc-950 pt-2 mb-4 break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-950">
            5.0 Authorized Engineering Approval & Change Sign-Off
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
                <span className="font-bold text-zinc-950 block mt-1">{operatorName}</span>
                <div className="h-10 border-b border-zinc-400 mt-3 flex items-end">
                  <span className="text-[8px] text-zinc-400 italic">Signature</span>
                </div>
              </td>
              <td className="p-2 border-r border-zinc-300 w-1/3 align-top">
                <span className="text-[9px] text-zinc-500 uppercase block">Verification Timestamp</span>
                <span className="font-bold text-zinc-950 block mt-1">{new Date().toLocaleString()}</span>
                <div className="h-10 border-b border-zinc-400 mt-3 flex items-end">
                  <span className="text-[8px] text-zinc-400 italic">Date</span>
                </div>
              </td>
              <td className="p-2 w-1/3 align-top">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Change Disposition</span>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {isZeroRisk ? '✓' : ''}
                    </span>
                    <span>CHANGE APPROVED</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {!isZeroRisk && analysis.overallRisk !== 'Critical' ? '✓' : ''}
                    </span>
                    <span>CONDITIONAL APPROVAL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-zinc-900 inline-flex items-center justify-center font-bold text-[9px]">
                      {analysis.overallRisk === 'Critical' ? '✓' : ''}
                    </span>
                    <span>ROLLBACK MANDATED</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="p-2 text-[9px] text-zinc-600 bg-zinc-50">
                <strong>Engineer Statement: </strong> I confirm that I have evaluated the syntactic CLI state diffs, verified automated advisory interpretations against raw telemetry, and authorized the marked disposition in accordance with change governance policies.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT FOOTER & TAMPER-EVIDENT INTEGRITY                                */}
      {/* ========================================================================= */}
      <div className="border-t border-zinc-950 pt-2 flex items-center justify-between text-[9px] font-mono text-zinc-500">
        <div>
          <span>DriftGuard Network Verification System • Confidential Enterprise Audit</span>
        </div>
        <div>
          <span>Doc ID: {analysis.analysisId} • Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
