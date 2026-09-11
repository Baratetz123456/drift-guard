import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Snapshot, Comparison } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LineByLineDiffViewer } from '../components/diff/LineByLineDiffViewer';
import {
  GitDiff,
  Sparkle,
  ArrowClockwise,
  Rows,
  Columns,
  Minus,
  Plus,
  SlidersHorizontal,
  CheckCircle,
} from '@phosphor-icons/react';

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPre = searchParams.get('preSnapId');
  const queryPost = searchParams.get('postSnapId');

  const { snapshots, comparisons, analyses, createComparison, runAIAnalysis, settings } = useAppStore();

  const [preSnapId, setPreSnapId] = useState(
    queryPre || snapshots.find((s: Snapshot) => s.snapshotType === 'pre_change')?.snapshotId || snapshots[0]?.snapshotId || ''
  );
  const [postSnapId, setPostSnapId] = useState(
    queryPost || snapshots.find((s: Snapshot) => s.snapshotType === 'post_change')?.snapshotId || snapshots[1]?.snapshotId || ''
  );

  const [currentComparisonId, setCurrentComparisonId] = useState(
    comparisons[0]?.comparisonId || ''
  );
  const [activeCommand, setActiveCommand] = useState<string>('show ip bgp summary');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [ignoreCounters, setIgnoreCounters] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const activeComparison = comparisons.find((c: Comparison) => c.comparisonId === currentComparisonId);
  const activeAnalysis = analyses.find((a: any) => a.comparisonId === currentComparisonId);

  const handleRunDiff = () => {
    if (!preSnapId || !postSnapId) return;
    try {
      const cmp = createComparison(preSnapId, postSnapId);
      setCurrentComparisonId(cmp.comparisonId);
      const firstChanged = Object.keys(cmp.commandDiffs).find(
        (cmd: string) => cmp.commandDiffs[cmd].hasDiff
      );
      if (firstChanged) setActiveCommand(firstChanged);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleTriggerAI = async () => {
    if (!activeComparison) return;
    setIsAnalyzing(true);
    try {
      await runAIAnalysis(activeComparison.comparisonId);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeDiff = activeComparison?.commandDiffs[activeCommand];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <GitDiff className="w-6 h-6 text-zinc-300" weight="duotone" />
            <span>Line-by-Line Visual Diff & Timeline Comparison</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Compare show command outputs before and after changes with line-by-line diff highlighting.
          </p>
        </div>

        {activeComparison && (
          <Button
            variant="primary"
            isLoading={isAnalyzing}
            leftIcon={<Sparkle className="w-4 h-4" weight="fill" />}
            onClick={handleTriggerAI}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        )}
      </div>

      {/* Flat Snapshot Control Strip (De-carded routine controls) */}
      <div className="border-y border-zinc-800 py-4 bg-zinc-900/20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Pre-Change Baseline Snapshot
            </label>
            <select
              value={preSnapId}
              onChange={(e) => setPreSnapId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
            >
              {snapshots.map((s: Snapshot) => (
                <option key={s.snapshotId} value={s.snapshotId}>
                  {s.deviceName} ({s.snapshotType}) — {new Date(s.timestamp).toLocaleTimeString()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00]" />
              Post-Change Verification Snapshot
            </label>
            <select
              value={postSnapId}
              onChange={(e) => setPostSnapId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
            >
              {snapshots.map((s: Snapshot) => (
                <option key={s.snapshotId} value={s.snapshotId}>
                  {s.deviceName} ({s.snapshotType}) — {new Date(s.timestamp).toLocaleTimeString()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<GitDiff className="w-3.5 h-3.5" />}
              className="w-full text-xs py-2"
              onClick={handleRunDiff}
            >
              Compare
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison Metrics & Line-by-Line Viewer */}
      {activeComparison ? (
        <div className="space-y-4">
          {/* Flat Diff Metrics & View Controls */}
          <div className="pb-3 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5 text-xs">
              <span className="font-semibold text-zinc-300">
                Target: <span className="text-white font-mono">{activeComparison.deviceName}</span>
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <GitDiff className="w-4 h-4 text-zinc-400" />
                {activeComparison.diffSummary.changedCommands} of{' '}
                {activeComparison.diffSummary.totalCommands} Commands Changed
              </span>
              <span className="flex items-center gap-1 text-[#c8ff00] font-mono font-bold">
                <Plus className="w-3.5 h-3.5" weight="bold" />
                {activeComparison.diffSummary.totalAdditions} additions
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-mono font-bold">
                <Minus className="w-3.5 h-3.5" weight="bold" />
                {activeComparison.diffSummary.totalDeletions} deletions
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreCounters}
                  onChange={(e) => setIgnoreCounters(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-700 text-white focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
                  Ignore dynamic counters
                </span>
              </label>

              {/* Split vs Unified Toggle */}
              <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-xs bg-zinc-950 p-0.5">
                <button
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side-by-Side</span>
                </button>
                <button
                  onClick={() => setViewMode('unified')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                    viewMode === 'unified'
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Rows className="w-3.5 h-3.5" />
                  <span>Unified Stream</span>
                </button>
              </div>
            </div>
          </div>

          {/* Command Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(activeComparison.commandDiffs).map((cmd: string) => {
              const diff = activeComparison.commandDiffs[cmd];
              const isSelected = activeCommand === cmd;
              return (
                <button
                  key={cmd}
                  onClick={() => setActiveCommand(cmd)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold border border-[#c8ff00] shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>{cmd}</span>
                  {diff.hasDiff ? (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold ${
                        isSelected
                          ? 'bg-zinc-950/20 text-zinc-950'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      +{diff.additions} -{diff.deletions}
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-sans ${
                        isSelected ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Identical
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Line-by-Line Diff Content Viewport */}
          {activeDiff && (
            <LineByLineDiffViewer
              diffResult={activeDiff}
              viewMode={viewMode}
              command={activeCommand}
            />
          )}

          {/* In-Place AI Summary Card */}
          {activeAnalysis && (
            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <Sparkle className="w-4 h-4 text-zinc-300" weight="fill" />
                    AI risk assessment (advisory)
                  </span>
                  <Badge severity={activeAnalysis.overallRisk} size="sm">
                    {activeAnalysis.overallRisk}
                  </Badge>
                  <span className="text-xs text-zinc-400 font-mono">
                    Score: {activeAnalysis.riskScore}/100
                  </span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeAnalysis.findings.length} findings
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {activeAnalysis.summary}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {activeAnalysis.executiveSummary}
                </p>
              </div>

              <div className="shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Sparkle className="w-3.5 h-3.5" weight="fill" />}
                  onClick={() => navigate('/analysis?tab=report')}
                >
                  Inspect
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center text-zinc-400">
          <GitDiff className="w-10 h-10 text-zinc-600 mx-auto mb-3" weight="duotone" />
          <h3 className="text-base font-semibold text-zinc-200">No comparison compiled</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Select pre-change and post-change snapshots above and click "Compare" to inspect configuration differences.
          </p>
        </Card>
      )}
    </div>
  );
};
