import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ComparePage } from './ComparePage';
import { HistoryPage } from './HistoryPage';
import { AIAnalysisPage } from './AIAnalysisPage';
import { GitDiff, ClockCounterClockwise, ArrowLeft } from '@phosphor-icons/react';
import { usePageMetadata } from '../hooks/usePageMetadata';

type AnalysisTab = 'compare' | 'history' | 'report';

export const AnalysisPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { comparisons } = useAppStore();

  const activeTab = (searchParams.get('tab') as AnalysisTab) || 'compare';

  usePageMetadata({
    title:
      activeTab === 'report'
        ? 'DriftGuard Analysis Report — DriftGuard'
        : activeTab === 'history'
          ? 'Comparison History — DriftGuard'
          : 'Diff Comparison — DriftGuard',
    canonicalPath: '/analysis',
    robots: 'noindex, nofollow',
  });

  const handleTabChange = (tab: AnalysisTab) => {
    setSearchParams({ tab });
  };

  const tabs = [
    {
      id: 'compare' as AnalysisTab,
      label: 'Compare',
      icon: GitDiff,
    },
    {
      id: 'history' as AnalysisTab,
      label: 'History',
      icon: ClockCounterClockwise,
      badge: comparisons.length,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Navigation Header: Dedicated Drill-Down Back Bar for Report or Phase Tabs for Compare/History */}
      {activeTab === 'report' ? (
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            onClick={() => handleTabChange('compare')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" weight="bold" />
            <span>Back to Comparison</span>
          </button>
          <span className="text-xs text-zinc-500 font-mono">Dedicated Risk Report</span>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content Viewport */}
      <div>
        {activeTab === 'compare' && <ComparePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'report' && <AIAnalysisPage />}
      </div>
    </div>
  );
};
