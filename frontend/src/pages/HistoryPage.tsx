import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { Comparison, AIAnalysis } from '../types';
import {
  ClockCounterClockwise,
  GitDiff,
  Sparkle,
  HardDrives,
  MagnifyingGlass,
  Funnel,
} from '@phosphor-icons/react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { comparisons, analyses } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const uniqueDevices = Array.from(new Set(comparisons.map((c) => c.deviceName)));

  const filteredComparisons = comparisons.filter((cmp: Comparison) => {
    const matchingAnalysis = analyses.find((a: AIAnalysis) => a.comparisonId === cmp.comparisonId);

    const matchesSearch =
      cmp.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmp.comparisonId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmp.preSnapshotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmp.postSnapshotId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDevice = deviceFilter === 'ALL' || cmp.deviceName === deviceFilter;
    const matchesRisk =
      riskFilter === 'ALL' || (matchingAnalysis && matchingAnalysis.overallRisk === riskFilter);

    return matchesSearch && matchesDevice && matchesRisk;
  });

  const totalPages = Math.ceil(filteredComparisons.length / pageSize) || 1;
  const paginatedComparisons = filteredComparisons.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <ClockCounterClockwise className="w-6 h-6 text-zinc-300" weight="duotone" />
          <span>Timeline & Change History</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Historical record of network maintenance windows, line-by-line comparisons, and associated AI audits.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search device, snapshot ID, or diff ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Funnel className="w-3.5 h-3.5 text-zinc-500" />
            <span>Device:</span>
          </div>
          <select
            value={deviceFilter}
            onChange={(e) => {
              setDeviceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="ALL">All Devices</option>
            {uniqueDevices.map((dev) => (
              <option key={dev} value={dev}>
                {dev}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="ALL">All Risks</option>
            <option value="SAFE">SAFE</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/70 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Compiled</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Baseline / Post</th>
                <th className="px-5 py-3">Diff Delta</th>
                <th className="px-5 py-3">Risk Assessment</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedComparisons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    No matching timeline comparisons found.
                  </td>
                </tr>
              ) : (
                paginatedComparisons.map((cmp: Comparison) => {
                  const matchingAnalysis = analyses.find(
                    (a: AIAnalysis) => a.comparisonId === cmp.comparisonId
                  );

                  return (
                    <tr key={cmp.comparisonId} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(cmp.createdAt).toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <HardDrives className="w-4 h-4 text-zinc-400 shrink-0" weight="duotone" />
                          <div>
                            <span className="font-semibold text-zinc-100">{cmp.deviceName}</span>
                            <div className="font-mono text-[10px] text-zinc-500">{cmp.comparisonId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-400">
                        <div>Pre: <span className="text-zinc-200">{cmp.preSnapshotId}</span></div>
                        <div>Post: <span className="text-zinc-200">{cmp.postSnapshotId}</span></div>
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300">{cmp.diffSummary.changedCommands} cmds</span>
                          <span className="text-[#c8ff00] font-bold">+{cmp.diffSummary.totalAdditions}</span>
                          <span className="text-red-400 font-bold">-{cmp.diffSummary.totalDeletions}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {matchingAnalysis ? (
                          <Badge severity={matchingAnalysis.overallRisk} size="sm">
                            {matchingAnalysis.overallRisk}
                          </Badge>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">Pending</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<GitDiff className="w-3.5 h-3.5" weight="bold" />}
                            onClick={() =>
                              navigate(
                                `/analysis?tab=compare&preSnapId=${cmp.preSnapshotId}&postSnapId=${cmp.postSnapshotId}`
                              )
                            }
                          >
                            Compare
                          </Button>
                          {matchingAnalysis && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Sparkle className="w-3.5 h-3.5" weight="fill" />}
                              onClick={() =>
                                navigate(`/analysis?tab=report&analysisId=${matchingAnalysis.analysisId}`)
                              }
                            >
                              Inspect
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredComparisons.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};
