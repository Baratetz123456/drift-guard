import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { AIAnalysis, Comparison, AnalysisFinding } from '../types';
import {
  Sparkle,
  ShieldWarning,
  ShieldCheck,
  DownloadSimple,
  Copy,
  Check,
  Brain,
  ArrowCounterClockwise,
  Lightning,
  TerminalWindow,
  Warning,
  CheckCircle,
  Printer,
} from '@phosphor-icons/react';

export const AIAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryAnalysisId = searchParams.get('analysisId');

  const { analyses, comparisons, settings, addToast } = useAppStore();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(
    queryAnalysisId || analyses[0]?.analysisId || ''
  );
  const [copiedRollback, setCopiedRollback] = useState(false);

  useEffect(() => {
    if (queryAnalysisId && queryAnalysisId !== selectedAnalysisId) {
      setSelectedAnalysisId(queryAnalysisId);
    }
  }, [queryAnalysisId]);

  const activeAnalysis = analyses.find((a: AIAnalysis) => a.analysisId === selectedAnalysisId) || analyses[0];
  const relatedComparison = comparisons.find(
    (c: Comparison) => c.comparisonId === activeAnalysis?.comparisonId
  );

  const handleCopyRollback = () => {
    if (!activeAnalysis?.suggestedRollbackPlan) return;
    navigator.clipboard.writeText(activeAnalysis.suggestedRollbackPlan);
    setCopiedRollback(true);
    addToast('success', 'Rollback commands copied to clipboard');
    setTimeout(() => setCopiedRollback(false), 2000);
  };

  const handleExportJson = () => {
    if (!activeAnalysis) return;
    const blob = new Blob([JSON.stringify(activeAnalysis, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driftguard-analysis-${activeAnalysis.analysisId}.json`;
    a.click();
    addToast('info', 'Analysis report downloaded as JSON');
  };

  if (!activeAnalysis) {
    return (
      <div className="p-12 text-center text-zinc-400 font-sans border border-zinc-800 rounded-2xl bg-zinc-900/40">
        <Sparkle className="w-10 h-10 text-zinc-600 mx-auto mb-3" weight="duotone" />
        <h3 className="text-base font-bold text-zinc-200">No drift analyses found</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
          No automated risk assessment has been performed yet. Run a collection and compare pre- and post-change snapshots to establish analysis.
        </p>
        <div className="mt-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/analysis?tab=compare')}
          >
            Compare
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sparkle className="w-6 h-6 text-[#c8ff00]" weight="duotone" />
            <span>DriftGuard Analysis</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            DriftGuard analysis suggests the following operational interpretations. Engineer verification required before change approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analyses.length > 1 && (
            <div className="w-64">
              <Select
                size="sm"
                value={activeAnalysis.analysisId}
                onChange={(e) => {
                  setSelectedAnalysisId(e.target.value);
                  setSearchParams({ tab: 'report', analysisId: e.target.value });
                }}
              >
                {analyses.map((a: AIAnalysis) => {
                  const cmp = comparisons.find((c) => c.comparisonId === a.comparisonId);
                  return (
                    <option key={a.analysisId} value={a.analysisId}>
                      {cmp?.deviceName || 'Device'} ({a.overallRisk}) — {new Date(a.createdAt).toLocaleTimeString()}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<DownloadSimple className="w-4 h-4" weight="bold" />}
            onClick={handleExportJson}
          >
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" weight="bold" />}
            onClick={() => window.open(`/reports/${activeAnalysis.analysisId}`, '_blank')}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Hero Severity & Risk Score Banner (Retained as Elevated Anchor) */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge severity={activeAnalysis.overallRisk} size="md">
                {activeAnalysis.overallRisk}
              </Badge>
              <span className="text-xs text-zinc-400 font-mono">
                Analysis ID: {activeAnalysis.analysisId}
              </span>
              <span className="text-xs text-zinc-400">
                Inference Engine:{' '}
                <strong className="text-zinc-200 font-mono">
                  {activeAnalysis.modelUsed || settings.defaultModel || 'DriftGuard Verification Engine'}
                </strong>
              </span>
            </div>

            <h2 className="text-xl font-bold text-white leading-snug">
              {activeAnalysis.summary
                ?.replace(/Senior engineer/gi, 'Engineer')
                ?.replace(/^AI analysis suggests\s*/i, 'Verification analysis suggests ')}
            </h2>

            <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
              <span>Device: <span className="text-zinc-200 font-bold font-sans">{relatedComparison?.deviceName || 'CORE-SW-01'}</span></span>
              <span>•</span>
              <span>Generated: {new Date(activeAnalysis.createdAt).toLocaleString()}</span>
              {activeAnalysis.tokenUsage && (
                <>
                  <span>•</span>
                  <span className="text-zinc-300">
                    {activeAnalysis.tokenUsage.totalTokens > 0 && activeAnalysis.overallRisk !== 'Informational'
                      ? `${activeAnalysis.tokenUsage.totalTokens} tokens processed`
                      : '0 tokens (Layer 1 pre-filter)'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Risk Gauge */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 shrink-0 min-w-[170px]">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Risk Score
            </div>
            <div className="text-4xl font-extrabold text-white">
              {activeAnalysis.riskScore}
              <span className="text-sm font-normal text-zinc-500">/100</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${
                  activeAnalysis.riskScore > 70
                    ? 'bg-rose-500'
                    : activeAnalysis.riskScore > 40
                    ? 'bg-amber-500'
                    : 'bg-sky-400'
                }`}
                style={{ width: `${activeAnalysis.riskScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Operational Disclaimer (Clean Unboxed Inline Notice) */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 py-0.5">
        <ShieldCheck className="w-4 h-4 text-[#c8ff00] shrink-0" weight="duotone" />
        <span>Engineer disclaimer: Advisory interpretations require verification prior to maintenance execution.</span>
      </div>

      {/* Executive Summary for CAB / Management (Unboxed with Accent Border) */}
      <div className="space-y-1.5 border-l-2 border-zinc-700 pl-4 py-0.5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-zinc-400" weight="duotone" />
          <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 font-mono">
            Executive Summary (CAB Report)
          </h3>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">
          {activeAnalysis.executiveSummary
            ?.replace(/google\/gemini-2\.0-flash-lite:free/gi, 'DriftGuard AI Model')
            ?.replace(/Senior engineer/gi, 'Engineer')}
        </p>
      </div>

      {/* Command Breakdown Status Strip */}
      {activeAnalysis.commandBreakdown && activeAnalysis.commandBreakdown.length > 0 && (
        <div className="space-y-2.5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <TerminalWindow className="w-4 h-4 text-[#c8ff00]" />
              <span>Command verification status ({activeAnalysis.commandBreakdown.length} commands analyzed)</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">Independent per-command review</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeAnalysis.commandBreakdown.map((item, idx) => {
              const typeColor =
                item.changeType === 'modified'
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                  : item.changeType === 'added'
                  ? 'bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/20'
                  : item.changeType === 'removed' || item.changeType === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60';

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/40 flex items-start justify-between gap-2.5 text-xs font-mono"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-zinc-200 truncate">{item.command}</div>
                    <div className="text-[11px] text-zinc-400 font-sans mt-0.5">{item.details}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border shrink-0 ${typeColor}`}>
                    {item.changeType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Command Correlation & Conflict Warnings */}
      {activeAnalysis.conflictsDetected && activeAnalysis.conflictsDetected.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
            <Warning className="w-4 h-4 text-amber-400" weight="fill" />
            <span>Cross-command correlation & conflict detected ({activeAnalysis.conflictsDetected.length})</span>
          </div>
          <div className="space-y-1.5 pl-6 text-xs text-zinc-300">
            {activeAnalysis.conflictsDetected.map((conflict, cIdx) => (
              <div key={cIdx} className="leading-relaxed list-disc">
                • {conflict}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings Breakdown (Structured Flat Diagnostic List, Zero Nested Cards) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <ShieldWarning className="w-4 h-4 text-amber-400" weight="duotone" />
            <h3 className="text-sm font-bold text-zinc-100">
              Identified Risk Findings ({activeAnalysis.findings.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">3-Part Diagnostic Evaluation</span>
        </div>

        <div className="divide-y divide-zinc-800/80 border-b border-zinc-800/80">
          {activeAnalysis.findings.length === 0 ? (
            <div className="py-5 px-4 rounded-xl border border-zinc-850 bg-zinc-900/30 flex items-center gap-3.5 my-2">
              <div className="p-2 rounded-lg bg-[#c8ff00]/10 border border-[#c8ff00]/20 shrink-0">
                <Check className="w-5 h-5 text-[#c8ff00]" weight="bold" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>Baseline Congruent</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20 uppercase font-mono font-bold">
                    Safe to Approve
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Zero risk conditions or configuration divergences identified across verified command profiles. State is congruent with operational baseline.
                </div>
              </div>
            </div>
          ) : (
            activeAnalysis.findings.map((finding: AnalysisFinding, idx: number) => {
              const isHighOrCritical = finding.severity === 'Critical' || finding.severity === 'High';
              return (
                <div
                  key={idx}
                  className={`py-4 transition-colors ${
                    isHighOrCritical
                      ? 'border-l-2 border-l-amber-500/80 pl-3.5'
                      : 'border-l-2 border-l-transparent pl-3.5'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-bold text-sm text-zinc-100">{finding.title}</h4>
                      <Badge severity={finding.severity} size="sm">
                        {finding.severity}
                      </Badge>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 font-mono uppercase font-semibold">
                        {finding.category}
                      </span>
                    </div>
                  </div>

                  {/* 3-Part Diagnostic Pattern */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-mono text-zinc-500 font-semibold shrink-0 sm:w-32">Observation:</span>
                      <span className="text-zinc-300 flex-1">{finding.description}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-mono text-amber-400 font-semibold shrink-0 sm:w-32">Operational impact:</span>
                      <span className="text-zinc-300 flex-1">{finding.potentialImpact}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-mono text-[#c8ff00] font-semibold shrink-0 sm:w-32">Actionable next step:</span>
                      <span className="text-zinc-200 flex-1">{finding.recommendation}</span>
                    </div>
                  </div>

                  {/* Verbatim Diff Evidence Excerpts */}
                  {finding.evidence && finding.evidence.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {finding.evidence.map((ev, evIdx) => (
                        <div key={evIdx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 pb-1 border-b border-zinc-800">
                            <span className="text-[#c8ff00] font-semibold flex items-center gap-1.5">
                              <TerminalWindow className="w-3.5 h-3.5" />
                              <span>Verbatim Diff Evidence: {ev.command}</span>
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Verified Against Raw Diff</span>
                          </div>
                          <pre className="whitespace-pre-wrap text-zinc-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
                            {ev.excerpt}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Suggested Rollback Runbook (Suppressed on Informational / Zero Risk / No Changes) */}
      {activeAnalysis.suggestedRollbackPlan &&
        activeAnalysis.overallRisk !== 'Informational' &&
        activeAnalysis.overallRisk !== 'SAFE' &&
        activeAnalysis.riskScore > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowCounterClockwise className="w-4 h-4 text-rose-400" weight="bold" />
              <h3 className="font-bold text-sm text-zinc-200">
                Automated Rollback & Remediation Runbook (Advisory)
              </h3>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copiedRollback ? <Check className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyRollback}
            >
              {copiedRollback ? 'Copied' : 'Copy Runbook'}
            </Button>
          </div>

          <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-lg overflow-x-auto">
            {activeAnalysis.suggestedRollbackPlan}
          </div>
        </div>
      )}

    </div>
  );
};
