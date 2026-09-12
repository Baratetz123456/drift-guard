import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DiffResult } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
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
} from '@phosphor-icons/react';

export const ComparisonDetailPage: React.FC = () => {
  const { comparisonId } = useParams<{ comparisonId: string }>();
  const navigate = useNavigate();
  const { comparisons, analyses, deleteComparison } = useAppStore();

  const comparison = comparisons.find((c) => c.comparisonId === comparisonId);
  const matchingAnalysis = analyses.find((a) => a.comparisonId === comparisonId);

  const [activeDiffCommand, setActiveDiffCommand] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const diffList: DiffResult[] = comparison ? Object.values(comparison.commandDiffs || {}) : [];

  React.useEffect(() => {
    if (diffList.length > 0 && !activeDiffCommand) {
      setActiveDiffCommand(diffList[0].command);
    }
  }, [diffList, activeDiffCommand]);

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
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">{comparison.comparisonId}</h1>
            {matchingAnalysis && (
              <Badge severity={matchingAnalysis.overallRisk} size="sm">
                {matchingAnalysis.overallRisk} RISK
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 flex items-center gap-2">
            <HardDrives className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-200">{comparison.deviceName}</span>
            <span>•</span>
            <span className="font-mono">{new Date(comparison.createdAt).toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {matchingAnalysis && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Sparkle className="w-4 h-4 text-amber-400" weight="fill" />}
              onClick={() => navigate(`/analysis?tab=report&comparisonId=${comparison.comparisonId}`)}
            >
              AI Report
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
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

      {/* Diff Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Changed Commands</div>
          <div className="font-bold text-zinc-100 text-lg font-mono">
            {comparison.diffSummary.changedCommands} of {comparison.diffSummary.totalCommands}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Profiles compared</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Additions</div>
          <div className="font-bold text-[#c8ff00] text-lg font-mono">
            +{comparison.diffSummary.totalAdditions} lines
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Syntactic insertions</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Deletions</div>
          <div className="font-bold text-rose-400 text-lg font-mono">
            -{comparison.diffSummary.totalDeletions} lines
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Syntactic removals</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Baseline Comparison</div>
          <div className="text-xs font-mono space-y-0.5">
            <div className="truncate text-zinc-400">Pre: <span className="text-zinc-200 font-semibold">{comparison.preSnapshotId}</span></div>
            <div className="truncate text-zinc-400">Post: <span className="text-zinc-200 font-semibold">{comparison.postSnapshotId}</span></div>
          </div>
        </Card>
      </div>

      {/* In-Place Line-by-Line Diff Viewer */}
      <Card className="p-5 border-zinc-800 bg-zinc-900/60 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <GitDiff className="w-4 h-4 text-zinc-400" />
            <h3 className="font-bold text-sm text-zinc-200">CLI Syntax Diff Output</h3>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            {diffList.length} command diffs recorded
          </div>
        </div>

        {/* Command Selector Tabs */}
        {diffList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
            {diffList.map((d) => {
              const isSelected = (activeDiffCommand || diffList[0]?.command) === d.command;
              return (
                <button
                  key={d.command}
                  type="button"
                  onClick={() => setActiveDiffCommand(d.command)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{d.command}</span>
                  {d.hasDiff ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#c8ff00]/10 text-[#c8ff00] font-bold font-mono">
                      +{d.additions} -{d.deletions}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 font-mono">
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
          <div className="text-zinc-500 italic p-8 text-center text-xs">
            No command diff available.
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
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

          <Button
            type="button"
            variant="primary"
            size="sm"
            rightIcon={<ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />}
            onClick={() =>
              navigate(
                `/analysis?tab=compare&preSnapId=${comparison.preSnapshotId}&postSnapId=${comparison.postSnapshotId}`
              )
            }
          >
            Open in Compare
          </Button>
        </div>
      </Card>

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
