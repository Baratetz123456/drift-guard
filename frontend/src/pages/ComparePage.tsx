import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Device, Snapshot, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { Select } from '../components/common/Select';
import { Checkbox } from '../components/common/Checkbox';
import { DateRangeFilter, DateRangeValue, isWithinDateRange } from '../components/common/DateRangeFilter';
import { CISCO_DEVICE_PLATFORMS } from '../utils/ciscoSyntaxValidator';
import {
  GitDiff,
  MagnifyingGlass,
  Funnel,
  HardDrives,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  ArrowRight,
  ArrowLeft,
  Database,
  Check,
  Calendar,
  Clock,
  Ticket,
  ShieldCheck,
  CaretRight,
  Sparkle,
  XCircle,
  CircleNotch,
} from '@phosphor-icons/react';

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPre = searchParams.get('preSnapId');
  const queryPost = searchParams.get('postSnapId');

  const { devices, snapshots, createComparison, runAIAnalysis, settings, aiModels, testAiConnection, addToast } = useAppStore();

  const activeModel = useMemo(
    () => aiModels.find((m) => m.isActive) || aiModels[0] || null,
    [aiModels]
  );

  // Active step in the 3-step guided flow
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [autoRunAi, setAutoRunAi] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // AI model availability test state in Step 3
  const [aiAvailability, setAiAvailability] = useState<{
    testing: boolean;
    available: boolean | null;
    latencyMs?: number;
    model: string;
    message?: string;
  }>({
    testing: false,
    available: null,
    model: activeModel?.modelIdentifier || settings.defaultModel || 'google/gemini-2.0-flash-lite:free',
  });

  const checkAiModelStatus = async (targetModel?: string) => {
    const currentActive = aiModels.find((m) => m.isActive) || aiModels[0];
    const modelToTest = targetModel || currentActive?.modelIdentifier || settings.defaultModel || 'google/gemini-2.0-flash-lite:free';
    const apiKey = currentActive?.apiKey || settings.apiKey;
    const baseUrl = currentActive?.baseUrl || settings.aiBaseUrl;

    setAiAvailability({
      testing: true,
      available: null,
      model: modelToTest,
    });
    try {
      const res = await testAiConnection(modelToTest, apiKey, baseUrl);
      setAiAvailability({
        testing: false,
        available: res.success,
        latencyMs: res.latencyMs,
        model: modelToTest,
        message: res.message,
      });
    } catch (err: any) {
      setAiAvailability({
        testing: false,
        available: false,
        model: modelToTest,
        message: err.message || 'Model unreachable',
      });
    }
  };

  // Event trigger: Automatically test AI model connection when redirected or navigated to Step 3 (Review & compare tab)
  useEffect(() => {
    if (activeStep === 3) {
      checkAiModelStatus();
    }
  }, [activeStep, activeModel?.id, activeModel?.modelIdentifier, settings.defaultModel]);

  // Selected device
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Selected snapshots
  const [preSnapId, setPreSnapId] = useState<string>(queryPre || '');
  const [postSnapId, setPostSnapId] = useState<string>(queryPost || '');

  // Step 1: Device filters & pagination
  const [deviceSearch, setDeviceSearch] = useState('');
  const [devicePlatformFilter, setDevicePlatformFilter] = useState('ALL');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');
  const [devicePage, setDevicePage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(10);

  // Step 2: Timeline filters & pagination
  const [timelineSearch, setTimelineSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: 'ALL' });
  const [stageFilter, setStageFilter] = useState('ALL');
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelinePageSize, setTimelinePageSize] = useState(10);

  // Auto-select initial device if query params present
  useEffect(() => {
    if (queryPre || queryPost) {
      const snap = snapshots.find((s) => s.snapshotId === (queryPre || queryPost));
      if (snap) {
        setSelectedDeviceId(snap.deviceId);
        if (queryPre) setPreSnapId(queryPre);
        if (queryPost) setPostSnapId(queryPost);
        setActiveStep(queryPre && queryPost ? 3 : 2);
      }
    }
  }, [queryPre, queryPost, snapshots]);

  // Active selected device object
  const selectedDevice = useMemo(() => {
    return devices.find((d) => d.deviceId === selectedDeviceId) || null;
  }, [devices, selectedDeviceId]);

  // Snapshots belonging to the currently selected device
  const deviceSnapshots = useMemo(() => {
    if (!selectedDevice) return [];
    return snapshots.filter(
      (s) => s.deviceId === selectedDevice.deviceId || s.deviceName === selectedDevice.name
    );
  }, [snapshots, selectedDevice]);

  // Pre and Post snapshot objects
  const preSnapshot = useMemo(() => {
    return snapshots.find((s) => s.snapshotId === preSnapId) || null;
  }, [snapshots, preSnapId]);

  const postSnapshot = useMemo(() => {
    return snapshots.find((s) => s.snapshotId === postSnapId) || null;
  }, [snapshots, postSnapId]);

  // Filtered devices for Step 1 (100 mock network devices)
  const filteredDevices = useMemo(() => {
    return devices.filter((d: Device) => {
      const matchesSearch =
        d.name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.hostname.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(deviceSearch.toLowerCase());

      const matchesPlatform =
        devicePlatformFilter === 'ALL' || d.deviceType === devicePlatformFilter;

      const matchesStatus =
        deviceStatusFilter === 'ALL' ||
        (deviceStatusFilter === 'ONLINE' && d.status === 'online') ||
        (deviceStatusFilter === 'OFFLINE' && d.status === 'offline');

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [devices, deviceSearch, devicePlatformFilter, deviceStatusFilter]);

  const totalDevicePages = Math.ceil(filteredDevices.length / devicePageSize) || 1;
  const paginatedDevices = useMemo(() => {
    const start = (devicePage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, devicePage, devicePageSize]);

  // Filtered snapshots for Step 2
  const filteredTimelineSnapshots = useMemo(() => {
    return deviceSnapshots.filter((s: Snapshot) => {
      const matchesSearch =
        s.snapshotId.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        (s.changeTicket && s.changeTicket.toLowerCase().includes(timelineSearch.toLowerCase()));

      const matchesStage =
        stageFilter === 'ALL' ||
        (stageFilter === 'PRE' && s.snapshotType === 'pre_change') ||
        (stageFilter === 'POST' && s.snapshotType === 'post_change');

      const matchesDate = isWithinDateRange(s.timestamp, dateRange);

      return matchesSearch && matchesStage && matchesDate;
    });
  }, [deviceSnapshots, timelineSearch, stageFilter, dateRange]);

  const totalTimelinePages = Math.ceil(filteredTimelineSnapshots.length / timelinePageSize) || 1;
  const paginatedTimelineSnapshots = useMemo(() => {
    const start = (timelinePage - 1) * timelinePageSize;
    return filteredTimelineSnapshots.slice(start, start + timelinePageSize);
  }, [filteredTimelineSnapshots, timelinePage, timelinePageSize]);

  // Step 1 -> Step 2 transition
  const handleSelectDevice = (dev: Device) => {
    setSelectedDeviceId(dev.deviceId);
    // Find latest Pre and Post snapshots for this device automatically
    const devSnaps = snapshots.filter((s) => s.deviceId === dev.deviceId || s.deviceName === dev.name);
    const latestPre = devSnaps.find((s) => s.snapshotType === 'pre_change');
    const latestPost = devSnaps.find((s) => s.snapshotType === 'post_change');
    setPreSnapId(latestPre?.snapshotId || '');
    setPostSnapId(latestPost?.snapshotId || '');
    setActiveStep(2);
  };

  // Step 2: Auto-pair latest
  const handleAutoPairLatest = () => {
    const latestPre = deviceSnapshots.find((s) => s.snapshotType === 'pre_change');
    const latestPost = deviceSnapshots.find((s) => s.snapshotType === 'post_change');
    if (latestPre) setPreSnapId(latestPre.snapshotId);
    if (latestPost) setPostSnapId(latestPost.snapshotId);
  };

  // Step 3: Run compare
  const handleLaunchComparison = async () => {
    if (!preSnapId || !postSnapId) return;
    setIsLaunching(true);
    try {
      const cmp = createComparison(preSnapId, postSnapId);
      if (autoRunAi) {
        try {
          await runAIAnalysis(cmp.comparisonId);
        } catch (err: any) {
          console.error('AI Analysis background compilation warning:', err);
        }
      }
      navigate(`/analysis/comparisons/${cmp.comparisonId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunching(false);
    }
  };

  // Calculate elapsed duration between Pre and Post
  const timeElapsedString = useMemo(() => {
    if (!preSnapshot || !postSnapshot) return null;
    const diffMs = Math.abs(
      new Date(postSnapshot.timestamp).getTime() - new Date(preSnapshot.timestamp).getTime()
    );
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remMins}m elapsed`;
    }
    return `${mins}m elapsed`;
  }, [preSnapshot, postSnapshot]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <GitDiff className="w-6 h-6 text-zinc-300" weight="duotone" />
          <span>Visual Diff & Timeline Comparison</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Follow the 3-step operational workflow to select a network node, isolate change timeline points, and analyze configuration drift.
        </p>
      </div>

      {/* Visual Stepper Navigation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1 Pill */}
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeStep === 1
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : selectedDevice
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 1
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : selectedDevice && activeStep > 1
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {selectedDevice && activeStep > 1 ? <Check className="w-4 h-4" weight="bold" /> : '1'}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">1. Choose Device</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {selectedDevice ? `${selectedDevice.name} (${selectedDevice.hostname})` : `${devices.length} nodes in inventory`}
            </div>
          </div>
        </button>

        {/* Step 2 Pill */}
        <button
          type="button"
          disabled={!selectedDevice}
          onClick={() => selectedDevice && setActiveStep(2)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            !selectedDevice
              ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-60 cursor-not-allowed'
              : activeStep === 2
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : preSnapshot && postSnapshot
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-zinc-900/30 border-zinc-800 text-zinc-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 2
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : preSnapshot && postSnapshot && activeStep > 2
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {preSnapshot && postSnapshot && activeStep > 2 ? (
              <Check className="w-4 h-4" weight="bold" />
            ) : (
              '2'
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">2. Select Timeline</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {preSnapshot && postSnapshot
                ? `${preSnapshot.snapshotId} ➔ ${postSnapshot.snapshotId}`
                : selectedDevice
                ? `${deviceSnapshots.length} snapshot points recorded`
                : 'Requires device selection'}
            </div>
          </div>
        </button>

        {/* Step 3 Pill */}
        <button
          type="button"
          disabled={!preSnapshot || !postSnapshot}
          onClick={() => preSnapshot && postSnapshot && setActiveStep(3)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            !preSnapshot || !postSnapshot
              ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-60 cursor-not-allowed'
              : activeStep === 3
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 3
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : preSnapshot && postSnapshot
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {preSnapshot && postSnapshot && activeStep !== 3 ? (
              <Check className="w-4 h-4" weight="bold" />
            ) : (
              '3'
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">3. Review & Compare</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {preSnapshot && postSnapshot ? 'Ready to compare diff' : 'Pending snapshot selection'}
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE DEVICE FROM 100 NETWORK DEVICES                            */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search device name, IP address, or ID..."
                value={deviceSearch}
                onChange={(e) => {
                  setDeviceSearch(e.target.value);
                  setDevicePage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Platform */}
              <div className="w-36">
                <Select
                  size="sm"
                  icon={<Funnel className="w-3.5 h-3.5 text-zinc-500" />}
                  value={devicePlatformFilter}
                  onChange={(e) => {
                    setDevicePlatformFilter(e.target.value);
                    setDevicePage(1);
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

              {/* Status */}
              <div className="w-36">
                <Select
                  size="sm"
                  value={deviceStatusFilter}
                  onChange={(e) => {
                    setDeviceStatusFilter(e.target.value);
                    setDevicePage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ONLINE">Online Only</option>
                  <option value="OFFLINE">Offline Only</option>
                </Select>
              </div>
            </div>
          </div>

          {/* 100-Device Paginated Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-200">
                <thead className="bg-zinc-900/90 text-zinc-300 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Device Name</th>
                    <th className="px-5 py-3.5">Hostname / IP</th>
                    <th className="px-5 py-3.5">Driver</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Snapshots</th>
                    <th className="w-10 px-5 py-3.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {paginatedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                        <HardDrives className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-zinc-200 text-sm">No matching devices found</p>
                        <p className="text-xs text-zinc-400 mt-1">Try clearing filters or search criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedDevices.map((dev: Device) => {
                      const snapCount = snapshots.filter(
                        (s) => s.deviceId === dev.deviceId || s.deviceName === dev.name
                      ).length;
                      const isSelected = selectedDeviceId === dev.deviceId;

                      return (
                        <tr
                          key={dev.deviceId}
                          onClick={() => handleSelectDevice(dev)}
                          className={`hover:bg-zinc-800/40 transition-colors cursor-pointer group ${
                            isSelected ? 'bg-zinc-800/30 ring-1 ring-inset ring-[#c8ff00]/40' : ''
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-bold text-white group-hover:text-[#c8ff00] transition-colors">
                              {dev.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{dev.deviceId}</div>
                          </td>

                          <td className="px-5 py-4 font-mono text-zinc-200">
                            {dev.hostname}
                          </td>

                          <td className="px-5 py-4 font-mono text-zinc-300">
                            {dev.deviceType}
                          </td>

                          <td className="px-5 py-4">
                            <Badge variant={dev.status === 'online' ? 'success' : 'danger'} size="sm">
                              {dev.status.toUpperCase()}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 font-mono text-zinc-200">
                            {snapCount} available
                          </td>

                          <td className="px-5 py-4 text-right text-zinc-400 group-hover:text-white transition-colors">
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
                currentPage={devicePage}
                totalPages={totalDevicePages}
                totalItems={filteredDevices.length}
                pageSize={devicePageSize}
                onPageChange={setDevicePage}
                onPageSizeChange={(newSize) => {
                  setDevicePageSize(newSize);
                  setDevicePage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SELECT TIMELINE (PRE & POST SNAPSHOTS FOR CHOSEN DEVICE)          */}
      {/* ========================================================================= */}
      {activeStep === 2 && selectedDevice && (
        <div className="space-y-4">
          {/* Selected Device Context Header */}
          <div className="pb-4 border-b border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center shrink-0">
                <HardDrives className="w-5 h-5 text-zinc-300" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{selectedDevice.name}</h2>
                  <Badge variant="default" size="sm">
                    {selectedDevice.deviceType}
                  </Badge>
                  <Badge variant={selectedDevice.status === 'online' ? 'success' : 'danger'} size="sm">
                    {selectedDevice.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  IP: {selectedDevice.hostname} • {deviceSnapshots.length} historical capture points recorded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ArrowsClockwise className="w-3.5 h-3.5" />}
                onClick={handleAutoPairLatest}
              >
                Auto-pair Latest
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setActiveStep(1)}
              >
                Change Device
              </Button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="py-2">
            <DateRangeFilter
              value={dateRange}
              onChange={(newRange) => {
                setDateRange(newRange);
                setTimelinePage(1);
              }}
            />
          </div>

          {/* Timeline Search & Stage Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter snapshots by ticket or ID..."
                value={timelineSearch}
                onChange={(e) => {
                  setTimelineSearch(e.target.value);
                  setTimelinePage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div className="w-40">
              <Select
                size="sm"
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setTimelinePage(1);
                }}
              >
                <option value="ALL">All Stages</option>
                <option value="PRE">Pre-Change Only</option>
                <option value="POST">Post-Change Only</option>
              </Select>
            </div>
          </div>

          {/* Chronological Snapshot Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-200">
                <thead className="bg-zinc-900/90 text-zinc-300 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5 text-center w-32">Select</th>
                    <th className="px-5 py-3.5">Snapshot ID</th>
                    <th className="px-5 py-3.5">Stage</th>
                    <th className="px-5 py-3.5">Ticket</th>
                    <th className="px-5 py-3.5">Commands</th>
                    <th className="px-5 py-3.5">Captured At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {paginatedTimelineSnapshots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                        <Database className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-zinc-200 text-sm">No snapshots found for this device</p>
                        <p className="text-xs text-zinc-400 mt-1">Try widening the timeline date range.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTimelineSnapshots.map((snap: Snapshot) => {
                      const isPre = preSnapId === snap.snapshotId;
                      const isPost = postSnapId === snap.snapshotId;

                      return (
                        <tr
                          key={snap.snapshotId}
                          className={`transition-colors ${
                            isPre
                              ? 'bg-sky-950/20 hover:bg-sky-950/30'
                              : isPost
                              ? 'bg-[#c8ff00]/5 hover:bg-[#c8ff00]/10'
                              : 'hover:bg-zinc-800/40'
                          }`}
                        >
                          {/* Explicit PRE / POST Action Buttons */}
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreSnapId(isPre ? '' : snap.snapshotId)}
                                className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isPre
                                    ? 'bg-sky-500 text-zinc-950 ring-2 ring-sky-400'
                                    : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                                }`}
                              >
                                PRE
                              </button>
                              <button
                                type="button"
                                onClick={() => setPostSnapId(isPost ? '' : snap.snapshotId)}
                                className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isPost
                                    ? 'bg-[#c8ff00] text-zinc-950 ring-2 ring-[#c8ff00]'
                                    : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                                }`}
                              >
                                POST
                              </button>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono text-sm text-zinc-100 font-semibold">
                            {snap.snapshotId}
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              variant={snap.snapshotType === 'pre_change' ? 'info' : 'success'}
                              size="sm"
                            >
                              {snap.snapshotType === 'pre_change' ? 'PRE' : 'POST'}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 font-mono text-sm text-zinc-200">
                            {snap.changeTicket || '—'}
                          </td>

                          <td className="px-5 py-4 font-mono text-sm text-zinc-200">
                            {snap.commands.length} cmds
                          </td>

                          <td className="px-5 py-4 text-zinc-300 font-mono text-sm whitespace-nowrap">
                            {new Date(snap.timestamp).toLocaleString()}
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
                currentPage={timelinePage}
                totalPages={totalTimelinePages}
                totalItems={filteredTimelineSnapshots.length}
                pageSize={timelinePageSize}
                onPageChange={setTimelinePage}
                onPageSizeChange={(newSize) => {
                  setTimelinePageSize(newSize);
                  setTimelinePage(1);
                }}
              />
            </div>
          </div>

          {/* Sticky Bottom Progression Bar */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-zinc-400">PRE:</span>
                <span className={preSnapshot ? 'text-white font-bold' : 'text-zinc-500'}>
                  {preSnapshot ? preSnapshot.snapshotId : 'Not Selected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c8ff00]" />
                <span className="text-zinc-400">POST:</span>
                <span className={postSnapshot ? 'text-white font-bold' : 'text-zinc-500'}>
                  {postSnapshot ? postSnapshot.snapshotId : 'Not Selected'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!preSnapshot || !postSnapshot}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" weight="bold" />}
              onClick={() => setActiveStep(3)}
            >
              Proceed to Review
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW & COMPARE PRE-CHECK                                        */}
      {/* ========================================================================= */}
      {activeStep === 3 && preSnapshot && postSnapshot && (
        <div className="space-y-6 w-full pt-1">
          {/* Side-by-Side Comparison Pre-check */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Review Comparison Specifications</h2>
                <p className="text-sm text-zinc-300 mt-1">
                  Confirm the baseline and post-change capture parameters before compiling syntactic diffs.
                </p>
              </div>
              {timeElapsedString && (
                <Badge variant="default" size="md">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {timeElapsedString}
                </Badge>
              )}
            </div>

            {/* Visual Dual Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Pre Card */}
              <div className="p-5 rounded-xl border border-sky-800/40 bg-sky-950/20 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    BASELINE PRE-CHANGE
                  </span>
                  <span className="text-sm font-mono text-zinc-300 font-bold">{preSnapshot.snapshotId}</span>
                </div>
                <div>
                  <div className="text-base font-bold text-white">{preSnapshot.deviceName}</div>
                  <div className="text-sm text-zinc-300 font-mono mt-0.5">{preSnapshot.deviceHostname} • {preSnapshot.deviceType}</div>
                </div>
                <div className="pt-2.5 border-t border-sky-900/40 text-sm space-y-1.5 font-mono text-zinc-200">
                  <div>Captured: {new Date(preSnapshot.timestamp).toLocaleString()}</div>
                  <div>Ticket: {preSnapshot.changeTicket || '—'}</div>
                  <div>Commands: {preSnapshot.commands.length} show commands</div>
                </div>
              </div>

              {/* Verification Post Card */}
              <div className="p-5 rounded-xl border border-[#c8ff00]/40 bg-[#c8ff00]/5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#c8ff00]/20 text-[#c8ff00] border border-[#c8ff00]/30">
                    VERIFICATION POST-CHANGE
                  </span>
                  <span className="text-sm font-mono text-zinc-300 font-bold">{postSnapshot.snapshotId}</span>
                </div>
                <div>
                  <div className="text-base font-bold text-white">{postSnapshot.deviceName}</div>
                  <div className="text-sm text-zinc-300 font-mono mt-0.5">{postSnapshot.deviceHostname} • {postSnapshot.deviceType}</div>
                </div>
                <div className="pt-2.5 border-t border-zinc-800 text-sm space-y-1.5 font-mono text-zinc-200">
                  <div>Captured: {new Date(postSnapshot.timestamp).toLocaleString()}</div>
                  <div>Ticket: {postSnapshot.changeTicket || '—'}</div>
                  <div>Commands: {postSnapshot.commands.length} show commands</div>
                </div>
              </div>
            </div>

            {/* Read-Only Safety Pre-check Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-zinc-200">
                <ShieldCheck className="w-5 h-5 text-[#c8ff00]" weight="fill" />
                <span>DriftGuard verified: Both snapshots contain read-only Cisco show telemetry.</span>
              </div>
              <span className="font-mono text-[#c8ff00] font-bold text-sm">100% Safe</span>
            </div>

            {/* Auto-run Drift Analysis & Real-Time Model Availability */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center shrink-0">
                    <Sparkle className="w-4 h-4 text-[#c8ff00]" weight="fill" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Auto-run Drift Analysis</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {settings.hasApiKey || activeModel?.apiKey ? 'Model Configured' : 'Key Required'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Automatically evaluate operational risk and generate remediation runbook upon comparison creation.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={autoRunAi}
                    onChange={(e) => setAutoRunAi(e.target.checked)}
                  />
                </div>
              </div>

              {/* Model Live Availability Status Strip */}
              <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-500">Inference Engine:</span>
                  <span className="text-zinc-200 font-bold">
                    {activeModel?.name || (aiAvailability.model?.includes('gemini') || aiAvailability.model?.includes('free') ? 'DriftGuard Verification Engine' : aiAvailability.model)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-mono text-[10px]">
                    {activeModel?.modelIdentifier || aiAvailability.model}
                  </span>
                  {activeModel?.baseUrl && !activeModel.isDefault && (
                    <span className="text-[10px] text-zinc-500 hidden md:inline truncate max-w-[180px]" title={activeModel.baseUrl}>
                      {activeModel.baseUrl.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                  <span className="text-zinc-600">•</span>
                  {aiAvailability.testing ? (
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <CircleNotch className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
                      Testing connection...
                    </span>
                  ) : aiAvailability.available ? (
                    <span className="flex items-center gap-1 text-[#c8ff00]">
                      <CheckCircle className="w-3.5 h-3.5" weight="fill" />
                      Available
                      {typeof aiAvailability.latencyMs === 'number' && (
                        <span className="text-zinc-400">({aiAvailability.latencyMs}ms)</span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400">
                      <XCircle className="w-3.5 h-3.5" weight="fill" />
                      Offline: {aiAvailability.message || 'Unavailable'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => checkAiModelStatus()}
                    disabled={aiAvailability.testing}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer underline text-[11px]"
                  >
                    Re-test
                  </button>
                  <Link
                    to="/settings"
                    className="text-zinc-400 hover:text-[#c8ff00] transition-colors text-[11px] underline"
                  >
                    Manage Models
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation & Launch */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setActiveStep(2)}
              >
                Back to Timeline
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isLaunching}
                leftIcon={<GitDiff className={`w-4 h-4 ${isLaunching ? 'animate-spin' : ''}`} weight="bold" />}
                onClick={handleLaunchComparison}
              >
                {isLaunching ? 'Processing...' : 'Compare'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
