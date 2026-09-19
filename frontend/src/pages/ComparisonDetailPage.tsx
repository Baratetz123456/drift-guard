import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DiffResult } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LineByLineDiffViewer } from '../components/diff/LineByLineDiffViewer';
import {
  ClockCounterClockwise,
  ArrowLeft,
  CaretRight,
  Trash,
  GitDiff,
  Sparkle,
  HardDrives,
  ArrowsLeftRight,
  Copy,
  Check,
  Printer,
} from '@phosphor-icons/react';

export const ComparisonDetailPage: React.FC = () => {
  const { comparisonId } = useParams<{ comparisonId: string }>();
  const navigate = useNavigate();
  const { comparisons, analyses, deleteComparison, runAIAnalysis, settings } = useAppStore();

  const comparison = comparisons.find((c) => c.comparisonId === comparisonId);
  const matchingAnalysis = analyses.find((a) => a.comparisonId === comparisonId);

  const [activeDiffCommand, setActiveDiffCommand] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const diffList: DiffResult[] = comparison ? Object.values(comparison.commandDiffs || {}) : [];

  React.useEffect(() => {
    if (diffList.length > 0 && !activeDiffCommand) {
      setActiveDiffCommand(diffList[0].command);
    }
  }, [diffList, activeDiffCommand]);

  const handleCopyId = () => {
    if (!comparison) return;
    navigator.clipboard.writeText(comparison.comparisonId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!comparison) {
    return (
      <div className="space-y-6 font-sans w-full">
        <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <ClockCounterClockwise className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">Comparison Record Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">The requested timeline diff comparison does not exist or was deleted.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/analysis?tab=history')}
            className="mt-4"
          >
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  const selectedDiff: DiffResult | undefined =
    (activeDiffCommand && comparison.commandDiffs?.[activeDiffCommand]) || diffList[0];

  const handleConfirmDelete = () => {
    deleteComparison(comparison.comparisonId);
    navigate('/analysis?tab=history');
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await runAIAnalysis(comparison.comparisonId);
      navigate(`/analysis?tab=report&analysisId=${analysis.analysisId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          to="/analysis?tab=compare"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <GitDiff className="w-3.5 h-3.5" />
          <span>Compare</span>
        </Link>
        <span className="text-zinc-600">/</span>
        <Link
          to="/analysis?tab=history"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <ClockCounterClockwise className="w-3.5 h-3.5" />
          <span>History</span>
        </Link>
        <CaretRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-100 font-mono font-bold">{comparison.comparisonId}</span>
      </div>

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <HardDrives className="w-6 h-6 text-[#c8ff00]" weight="duotone" />
              <span>{comparison.deviceName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-zinc-400">
            <span className="font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 flex items-center gap-1.5">
              <span className="text-zinc-500 text-[11px]">ID:</span>
              <span className="font-semibold">{comparison.comparisonId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                title="Copy comparison ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-[#c8ff00]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </span>
            <span>•</span>
            <span className="font-mono text-zinc-400">{new Date(comparison.createdAt).toLocaleString()}</span>
            {matchingAnalysis && (
              <Badge severity={matchingAnalysis.overallRisk} size="sm">
                {matchingAnalysis.overallRisk} RISK
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {matchingAnalysis ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Sparkle className="w-4 h-4 text-amber-400" weight="fill" />}
              onClick={() => navigate(`/analysis?tab=report&analysisId=${matchingAnalysis.analysisId}`)}
            >
              AI Report
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isAnalyzing}
              leftIcon={<Sparkle className={`w-4 h-4 text-zinc-950 ${isAnalyzing ? 'animate-spin' : ''}`} weight="fill" />}
              onClick={handleRunAnalysis}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<GitDiff className="w-4 h-4" weight="bold" />}
            onClick={() =>
              navigate(
                `/analysis?tab=compare&preSnapId=${comparison.preSnapshotId}&postSnapId=${comparison.postSnapshotId}`
              )
            }
          >
            Compare Workbench
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            leftIcon={<Trash className="w-4 h-4" />}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Prominent AI Analysis Report Callout Card */}
      {matchingAnalysis ? (
        <div className="p-4 rounded-xl border border-[#c8ff00]/40 bg-zinc-900/90 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center shrink-0">
              <Sparkle className="w-5 h-5 text-[#c8ff00]" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">AI Analysis Report Available</h3>
                <Badge severity={matchingAnalysis.overallRisk} size="sm">
                  {matchingAnalysis.overallRisk} RISK
                </Badge>
                <span className="text-xs font-mono text-zinc-400">Score: {matchingAnalysis.riskScore}/100</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 line-clamp-1">
                {matchingAnalysis.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" weight="bold" />}
              onClick={() => window.open(`/reports/${matchingAnalysis.analysisId}`, '_blank')}
            >
              Print Report
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Sparkle className="w-4 h-4 text-zinc-950" weight="fill" />}
              onClick={() => navigate(`/analysis?tab=report&analysisId=${matchingAnalysis.analysisId}`)}
            >
              View AI Report
            </Button>
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center gap-3">
          <Sparkle className="w-5 h-5 text-[#c8ff00] animate-spin shrink-0" weight="fill" />
          <div>
            <div className="text-sm font-semibold text-white">Generating AI Verification Analysis...</div>
            <div className="text-xs text-zinc-400 mt-0.5">Evaluating operational risk, routing state divergence, and blast radius.</div>
          </div>
        </div>
      ) : null}

      {/* Inline Telemetry Strip (Hairline Separators, Upgraded Typography & Hierarchy) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 border-y border-zinc-800/80 py-4 font-mono">
        <div className="px-4 py-1.5">
          <span className="text-zinc-400 uppercase tracking-wider block text-xs font-semibold mb-1">
            Changed Commands
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-zinc-100 text-xl">
              {comparison.diffSummary.changedCommands}
            </span>
            <span className="text-xs font-normal text-zinc-400">
              of {comparison.diffSummary.totalCommands} profiles
            </span>
          </div>
        </div>

        <div className="px-4 py-1.5">
          <span className="text-zinc-400 uppercase tracking-wider block text-xs font-semibold mb-1">
            Additions
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-[#c8ff00] text-xl">
              +{comparison.diffSummary.totalAdditions}
            </span>
            <span className="text-xs font-normal text-zinc-400">lines</span>
          </div>
        </div>

        <div className="px-4 py-1.5">
          <span className="text-zinc-400 uppercase tracking-wider block text-xs font-semibold mb-1">
            Deletions
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-rose-400 text-xl">
              -{comparison.diffSummary.totalDeletions}
            </span>
            <span className="text-xs font-normal text-zinc-400">lines</span>
          </div>
        </div>

        <div className="px-4 py-1.5">
          <span className="text-zinc-400 uppercase tracking-wider block text-xs font-semibold mb-1">
            Snapshot Scope
          </span>
          <div className="space-y-1 text-xs mt-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-zinc-400 text-[11px] font-semibold">PRE:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 truncate">
                {comparison.preSnapshotId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-zinc-400 text-[11px] font-semibold">POST:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 truncate">
                {comparison.postSnapshotId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk Assessment Inline Action (When No Analysis Present) */}
      {!matchingAnalysis && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkle className="w-4 h-4 text-amber-400 shrink-0" weight="duotone" />
            <div>
              <span className="font-semibold text-zinc-200">AI Operational Risk & Drift Analysis:</span>
              <span className="text-zinc-400 ml-1.5">
                Evaluate configuration divergence, interface status changes, and generate an advisory rollback runbook.
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isAnalyzing}
            leftIcon={<Sparkle className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} weight="fill" />}
            onClick={handleRunAnalysis}
            className="shrink-0"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
          </Button>
        </div>
      )}

      {/* Unboxed CLI Syntax Diff Section */}
      <div className="space-y-3">
        {/* Command Selector & View Mode Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitDiff className="w-4 h-4 text-zinc-400" />
            <h3 className="font-bold text-sm text-zinc-200">CLI Syntax Diff Output</h3>
            <span className="text-xs font-mono text-zinc-500">
              ({diffList.length} command {diffList.length === 1 ? 'profile' : 'profiles'})
            </span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Unified
            </button>
          </div>
        </div>

        {/* Command Selector Tabs */}
        {diffList.length > 0 && (
          <div className="flex flex-wrap gap-2 py-1">
            {diffList.map((d) => {
              const isSelected = (activeDiffCommand || diffList[0]?.command) === d.command;
              return (
                <button
                  key={d.command}
                  type="button"
                  onClick={() => setActiveDiffCommand(d.command)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm ring-1 ring-[#c8ff00]/40'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span>{d.command}</span>
                  {d.hasDiff ? (
                    <span className="px-1.5 py-0.2 rounded text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] font-bold font-mono">
                      +{d.additions} -{d.deletions}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[11px] text-zinc-500 font-mono">
                      Identical
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Diff Viewport */}
        {selectedDiff ? (
          <LineByLineDiffViewer
            diffResult={selectedDiff}
            viewMode={viewMode}
            command={selectedDiff.command}
          />
        ) : (
          <div className="text-zinc-400 italic p-8 text-center text-sm border border-zinc-800 rounded-xl bg-zinc-900/20">
            No command diff available.
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate('/analysis?tab=compare')}
            >
              Back to Compare
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ClockCounterClockwise className="w-3.5 h-3.5" />}
              onClick={() => navigate('/analysis?tab=history')}
            >
              History
            </Button>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete Comparison ${comparison.comparisonId}`}
          message={`Delete comparison record "${comparison.comparisonId}"? Historical diff records and calculated line deltas will be removed.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
