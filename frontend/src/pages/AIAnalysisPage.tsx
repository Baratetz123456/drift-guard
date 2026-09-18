import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
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
    a.download = `driftguard-ai-analysis-${activeAnalysis.analysisId}.json`;
    a.click();
    addToast('info', 'Analysis report downloaded as JSON');
  };

  if (!activeAnalysis) {
    return (
      <div className="p-12 text-center text-zinc-400 font-sans border border-zinc-800 rounded-2xl bg-zinc-900/40">
        <Sparkle className="w-10 h-10 text-zinc-600 mx-auto mb-3" weight="duotone" />
        <h3 className="text-base font-bold text-zinc-200">No AI analyses found</h3>
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
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Sparkle className="w-6 h-6 text-[#c8ff00]" weight="duotone" />
            <span>DriftGuard Analysis</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            DriftGuard analysis suggests the following operational interpretations. Senior engineer verification required before change approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analyses.length > 1 && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300">
              <span className="text-zinc-500 font-mono">Report:</span>
              <select
                value={activeAnalysis.analysisId}
                onChange={(e) => {
                  setSelectedAnalysisId(e.target.value);
                  setSearchParams({ tab: 'report', analysisId: e.target.value });
                }}
                className="bg-transparent border-none text-xs text-zinc-100 font-mono focus:outline-none cursor-pointer"
              >
                {analyses.map((a: AIAnalysis) => {
                  const cmp = comparisons.find((c) => c.comparisonId === a.comparisonId);
                  return (
                    <option key={a.analysisId} value={a.analysisId}>
                      {cmp?.deviceName || 'Device'} ({a.overallRisk}) — {new Date(a.createdAt).toLocaleTimeString()}
                    </option>
                  );
                })}
              </select>
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
                Model: <strong className="text-zinc-200 font-mono">{settings.defaultModel}</strong>
              </span>
            </div>

            <h2 className="text-xl font-bold text-white leading-snug">
              {activeAnalysis.summary}
            </h2>

            <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
              <span>Device: <span className="text-zinc-200 font-bold font-sans">{relatedComparison?.deviceName || 'CORE-SW-01'}</span></span>
              <span>•</span>
              <span>Generated: {new Date(activeAnalysis.createdAt).toLocaleString()}</span>
              {activeAnalysis.tokenUsage && (
                <>
                  <span>•</span>
                  <span className="text-zinc-300">
                    {activeAnalysis.tokenUsage.totalTokens} tokens processed
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
        <span>Senior engineer disclaimer: Advisory interpretations require verification prior to maintenance execution.</span>
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
          {activeAnalysis.executiveSummary}
        </p>
      </div>

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
          {activeAnalysis.findings.map((finding: AnalysisFinding, idx: number) => {
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Rollback Runbook (Retained as Actionable CLI Terminal) */}
      {activeAnalysis.suggestedRollbackPlan && (
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
