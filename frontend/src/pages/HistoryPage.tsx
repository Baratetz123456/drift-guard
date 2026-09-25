import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { Select } from '../components/common/Select';
import { DateRangeFilter, DateRangeValue, isWithinDateRange } from '../components/common/DateRangeFilter';
import { CISCO_DEVICE_PLATFORMS } from '../utils/ciscoSyntaxValidator';
import { Comparison, AIAnalysis } from '../types';
import {
  ClockCounterClockwise,
  GitDiff,
  Sparkle,
  HardDrives,
  MagnifyingGlass,
  Funnel,
  CaretRight,
} from '@phosphor-icons/react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { comparisons, analyses, devices, snapshots } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: 'ALL' });

  // Pagination state (supporting 10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // All unique device names across inventory and comparisons
  const allDeviceNames = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => set.add(d.name));
    comparisons.forEach((c) => set.add(c.deviceName));
    return Array.from(set).sort();
  }, [devices, comparisons]);

  const filteredComparisons = useMemo(() => {
    return comparisons.filter((cmp: Comparison) => {
      const matchingAnalysis = analyses.find((a: AIAnalysis) => a.comparisonId === cmp.comparisonId);

      // Search matching
      const matchesSearch =
        cmp.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmp.comparisonId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmp.preSnapshotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmp.postSnapshotId.toLowerCase().includes(searchTerm.toLowerCase());

      // Device filter
      const matchesDevice = deviceFilter === 'ALL' || cmp.deviceName === deviceFilter;

      // Platform filter
      const dev = devices.find((d) => d.deviceId === cmp.deviceId || d.name === cmp.deviceName);
      const devPlatform =
        dev?.deviceType ||
        snapshots.find((s) => s.snapshotId === cmp.preSnapshotId)?.deviceType ||
        'cisco_xe';
      const matchesPlatform = platformFilter === 'ALL' || devPlatform === platformFilter;

      // Risk filter
      const matchesRisk =
        riskFilter === 'ALL' || (matchingAnalysis && matchingAnalysis.overallRisk === riskFilter);

      // Date range filter
      const matchesDate = isWithinDateRange(cmp.createdAt, dateRange);

      return matchesSearch && matchesDevice && matchesPlatform && matchesRisk && matchesDate;
    });
  }, [comparisons, analyses, devices, snapshots, searchTerm, deviceFilter, platformFilter, riskFilter, dateRange]);

  const totalPages = Math.ceil(filteredComparisons.length / pageSize) || 1;
  const paginatedComparisons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComparisons.slice(start, start + pageSize);
  }, [filteredComparisons, currentPage, pageSize]);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <ClockCounterClockwise className="w-6 h-6 text-zinc-300" weight="duotone" />
          <span>Timeline & Change History</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Historical record of network maintenance windows, line-by-line comparisons, and associated AI audits across 50–100 devices.
        </p>
      </div>

      {/* Date Range Preset Selector */}
      <div>
        <DateRangeFilter
          value={dateRange}
          onChange={(newRange) => {
            setDateRange(newRange);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search device, comparison ID, snapshot ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Device Dropdown */}
          <div className="w-40">
            <Select
              size="sm"
              icon={<HardDrives className="w-3.5 h-3.5 text-zinc-500" />}
              value={deviceFilter}
              onChange={(e) => {
                setDeviceFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Devices</option>
              {allDeviceNames.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </Select>
          </div>

          {/* Platform / Driver Dropdown */}
          <div className="w-36">
            <Select
              size="sm"
              icon={<Funnel className="w-3.5 h-3.5 text-zinc-500" />}
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Drivers</option>
              {CISCO_DEVICE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Risk Severity Dropdown */}
          <div className="w-32">
            <Select
              size="sm"
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Risks</option>
              <option value="SAFE">SAFE</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/70 text-zinc-400 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Compiled</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Baseline / Post</th>
                <th className="px-5 py-3">Diff Delta</th>
                <th className="px-5 py-3">Risk Assessment</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedComparisons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    <ClockCounterClockwise className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-300 text-sm">No matching timeline comparisons found</p>
                    <p className="text-xs text-zinc-500 mt-1">Try adjusting date range or filters</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setDeviceFilter('ALL');
                        setPlatformFilter('ALL');
                        setRiskFilter('ALL');
                        setDateRange({ preset: 'ALL' });
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-sm text-[#c8ff00] font-bold hover:underline cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedComparisons.map((cmp: Comparison) => {
                  const matchingAnalysis = analyses.find(
                    (a: AIAnalysis) => a.comparisonId === cmp.comparisonId
                  );

                  return (
                    <tr
                      key={cmp.comparisonId}
                      onClick={() => navigate(`/analysis/comparisons/${cmp.comparisonId}`)}
                      className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(cmp.createdAt).toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <HardDrives className="w-4 h-4 text-zinc-400 shrink-0" weight="duotone" />
                          <div>
                            <span className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                              {cmp.deviceName}
                            </span>
                            <div className="font-mono text-xs text-zinc-500">{cmp.comparisonId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-400">
                        <div>
                          Pre: <span className="text-zinc-200 font-semibold">{cmp.preSnapshotId}</span>
                        </div>
                        <div>
                          Post: <span className="text-zinc-200 font-semibold">{cmp.postSnapshotId}</span>
                        </div>
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
                          <span className="text-zinc-400 font-mono text-xs">Pending</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right text-zinc-500 group-hover:text-zinc-200 transition-colors">
                        <CaretRight className="w-4 h-4 ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4">
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
    </div>
  );
};
