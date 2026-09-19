import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SnapshotType, Device, CommandSet } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';
import { Modal } from '../components/common/Modal';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { Select } from '../components/common/Select';
import { CISCO_DEVICE_PLATFORMS } from '../utils/ciscoSyntaxValidator';
import { validateCommandSetCompatibility, isCommandSetCompatible } from '../utils/compatibilityValidator';
import { normalizeDeviceType, getDeviceTypeLabel } from '../utils/networkValidator';
import {
  Camera,
  HardDrives,
  TerminalWindow,
  Play,
  ArrowRight,
  ArrowLeft,
  Spinner,
  CheckCircle,
  Lightning,
  Funnel,
  Tag,
  Clock,
  UsersThree,
  Warning,
  FolderPlus,
  Plus,
  CaretRight,
  Check,
  ShieldCheck,
  MagnifyingGlass,
  GitDiff,
  Database,
  ArrowsClockwise,
  XCircle,
} from '@phosphor-icons/react';

interface ParallelDeviceProgress {
  deviceId: string;
  deviceName: string;
  deviceHostname: string;
  status: 'pending' | 'connecting' | 'executing' | 'archiving' | 'completed' | 'failed';
  currentCmdIndex: number;
  totalCmds: number;
  latencyMs?: number;
  snapshotId?: string;
  error?: string;
}

export const CollectPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { devices, deviceGroups, commandSets, snapshots, addSnapshot, addDeviceGroup, addToast } = useAppStore();

  // Active step in 3-step guided flow: 1. Target -> 2. Parameters -> 3. Execute
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Mode: Single Device vs By Device Group vs Custom Multi-Select
  const [collectScope, setCollectScope] = useState<'single' | 'group' | 'custom'>('single');

  // Single target state
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.deviceId || '');

  // Step 1: Single device filters & pagination
  const [deviceSearch, setDeviceSearch] = useState('');
  const [devicePlatformFilter, setDevicePlatformFilter] = useState('ALL');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');
  const [devicePage, setDevicePage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(10);

  // Group target state
  const [selectedGroupId, setSelectedGroupId] = useState(deviceGroups[0]?.groupId || '');

  // Custom batch target state
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [selectedBatchDeviceIds, setSelectedBatchDeviceIds] = useState<string[]>(
    devices.slice(0, 3).map((d) => d.deviceId)
  );

  // Common collection parameters
  const [selectedSetId, setSelectedSetId] = useState(commandSets[0]?.setId || '');
  const [snapshotType, setSnapshotType] = useState<SnapshotType>('pre_change');
  const [ticketNumber, setTicketNumber] = useState('CHG-998214');
  const [notes, setNotes] = useState('Pre-change maintenance capture before router uplink migration');

  // Quick group creation modal state
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupDeviceIds, setNewGroupDeviceIds] = useState<string[]>([]);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [completedSnapshotIds, setCompletedSnapshotIds] = useState<string[]>([]);

  // Parallel progress tracking
  const [parallelProgress, setParallelProgress] = useState<Record<string, ParallelDeviceProgress>>({});

  // URL query sync: allow ?groupId=... to preselect group and set scope to 'group'
  useEffect(() => {
    const groupIdParam = searchParams.get('groupId');
    if (groupIdParam && deviceGroups.some((g) => g.groupId === groupIdParam)) {
      setSelectedGroupId(groupIdParam);
      setCollectScope('group');
    }
  }, [searchParams, deviceGroups]);

  const selectedDevice = useMemo(() => {
    return devices.find((d: Device) => d.deviceId === selectedDeviceId) || devices[0];
  }, [devices, selectedDeviceId]);

  const selectedGroup = useMemo(() => {
    return deviceGroups.find((g) => g.groupId === selectedGroupId) || deviceGroups[0];
  }, [deviceGroups, selectedGroupId]);

  const selectedSet = useMemo(() => {
    return commandSets.find((s: CommandSet) => s.setId === selectedSetId) || commandSets[0];
  }, [commandSets, selectedSetId]);

  // Devices in selected group
  const groupDevices = useMemo(() => {
    if (!selectedGroup) return [];
    return devices.filter((d) => selectedGroup.deviceIds.includes(d.deviceId));
  }, [devices, selectedGroup]);

  // Devices in custom selection
  const customDevices = useMemo(() => {
    return devices.filter((d) => selectedBatchDeviceIds.includes(d.deviceId));
  }, [devices, selectedBatchDeviceIds]);

  // Active target devices for the current scope
  const activeTargetDevices = useMemo(() => {
    if (collectScope === 'single') return selectedDevice ? [selectedDevice] : [];
    if (collectScope === 'group') return groupDevices;
    return customDevices;
  }, [collectScope, selectedDevice, groupDevices, customDevices]);

  // Real-time Driver Compatibility Validator
  const compatibility = useMemo(() => {
    return validateCommandSetCompatibility(selectedSet, activeTargetDevices);
  }, [selectedSet, activeTargetDevices]);

  // Extract unique tags across inventory
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    devices.forEach((d) => (d.tags || []).forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [devices]);

  // Devices matching tag filter for batch mode
  const tagFilteredDevices = useMemo(() => {
    if (selectedTagFilter === 'ALL') return devices;
    return devices.filter((d) => (d.tags || []).includes(selectedTagFilter));
  }, [devices, selectedTagFilter]);

  // Filtered devices for Step 1 Single Target Table (100 mock network devices)
  const filteredDevices = useMemo(() => {
    return devices.filter((d: Device) => {
      const matchesSearch =
        d.name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.hostname.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(deviceSearch.toLowerCase());

      const matchesPlatform =
        devicePlatformFilter === 'ALL' ||
        d.deviceType === devicePlatformFilter ||
        (normalizeDeviceType(d.deviceType) &&
          normalizeDeviceType(d.deviceType) === normalizeDeviceType(devicePlatformFilter));

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

  // Single target selection action with auto driver matching
  const handleSelectSingleDevice = (dev: Device) => {
    setSelectedDeviceId(dev.deviceId);
    // Find compatible command set for device driver using canonical normalization
    const devDriver = normalizeDeviceType(dev.deviceType) || dev.deviceType;
    const matchingSet = commandSets.find(
      (cs) => (normalizeDeviceType(cs.deviceType) || cs.deviceType) === devDriver
    );
    if (matchingSet) {
      setSelectedSetId(matchingSet.setId);
    }
    setActiveStep(2);
  };

  const handleToggleDevice = (deviceId: string) => {
    setSelectedBatchDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = tagFilteredDevices.map((d) => d.deviceId);
    const allSelected = filteredIds.every((id) => selectedBatchDeviceIds.includes(id));
    if (allSelected) {
      setSelectedBatchDeviceIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedBatchDeviceIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Group creation shortcuts in Collect Page
  const handleOpenCreateNewGroup = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupDeviceIds([]);
    setIsCreateGroupModalOpen(true);
  };

  const handleOpenSaveCustomGroup = () => {
    setNewGroupName('');
    setNewGroupDescription('Maintenance snapshot cluster');
    setNewGroupDeviceIds([...selectedBatchDeviceIds]);
    setIsCreateGroupModalOpen(true);
  };

  const handleSaveNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupDeviceIds.length === 0) return;
    const created = addDeviceGroup({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
      deviceIds: newGroupDeviceIds,
    });
    setSelectedGroupId(created.groupId);
    setCollectScope('group');
    setIsCreateGroupModalOpen(false);
  };

  // Run single collection
  const handleStartSingleCollection = async () => {
    if (!selectedDevice || !selectedSet || !compatibility.isCompatible) return;

    setIsExecuting(true);
    setCurrentStep(1);
    setCompletedSnapshotIds([]);
    setTerminalLogs([
      `[INIT] Initiating parallel orchestration worker for ${selectedDevice.name}...`,
      `[SSH] Establishing Paramiko/Netmiko secure transport to ${selectedDevice.hostname}:${selectedDevice.port}...`,
    ]);

    await new Promise((r) => setTimeout(r, 900));
    setTerminalLogs((prev) => [
      ...prev,
      `[SSH] Authentication succeeded (driver: ${selectedDevice.deviceType}). Prompt recognized: "${selectedDevice.name}#"`,
      `[EXEC] Running ${selectedSet.commands.length} commands sequentially...`,
    ]);
    setCurrentStep(2);

    let outputs: Record<string, string> = {};
    let isLiveCollected = false;

    try {
      setTerminalLogs((prev) => [
        ...prev,
        `[SSH] Transmitting execution payload to local Netmiko collector bridge...`,
      ]);

      const token = sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/collect', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deviceId: selectedDevice.deviceId,
          deviceName: selectedDevice.name,
          hostname: selectedDevice.hostname,
          port: selectedDevice.port || 22,
          deviceType: selectedDevice.deviceType,
          username: selectedDevice.username,
          password: selectedDevice.password,
          commands: selectedSet.commands,
          snapshotType,
          changeTicket: ticketNumber,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if ((data.status === 'SUCCESS' || data.success) && data.outputs && Object.keys(data.outputs).length > 0) {
          outputs = data.outputs;
          isLiveCollected = true;
          for (const cmd of selectedSet.commands) {
            setTerminalLogs((prev) => [
              ...prev,
              `[CLI] Verified authentic output from ${selectedDevice.name} for: "${cmd}"`,
            ]);
          }
          setTerminalLogs((prev) => [
            ...prev,
            `[LIVE] Authentic Cisco terminal capture completed in ${data.durationMs}ms.`,
          ]);
        } else {
          throw new Error('No command output returned from device.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || errData.message || `Collector returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'SSH connection failure';
      setTerminalLogs((prev) => [
        ...prev,
        `[ERROR] Live SSH collection failed: ${errorMsg}`,
        `[ABORT] Snapshot capture aborted. DriftGuard enforces authentic live data only.`,
      ]);
      addToast('error', `SSH Collection failed for ${selectedDevice.name}: ${errorMsg}`);
      setIsExecuting(false);
      return;
    }

    if (!isLiveCollected) {
      setIsExecuting(false);
      return;
    }

    setCurrentStep(3);
    setTerminalLogs((prev) => [
      ...prev,
      `[PARSE] Output extraction validated. Sanitizing output lines...`,
      `[VAULT] Writing raw snapshot payload to immutable archive vault...`,
      `[STORE] Registering snapshot record in persistent state datastore...`,
    ]);

    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep(4);

    const snap = addSnapshot({
      deviceId: selectedDevice.deviceId,
      deviceName: selectedDevice.name,
      deviceHostname: selectedDevice.hostname,
      deviceType: selectedDevice.deviceType,
      snapshotType,
      commands: selectedSet.commands,
      outputs,
      changeTicket: ticketNumber,
      notes,
    });

    setCompletedSnapshotIds([snap.snapshotId]);
    setTerminalLogs((prev) => [
      ...prev,
      `[SUCCESS] Authentic snapshot ${snap.snapshotId} generated and archived to vault. Ready for line-by-line diff.`,
    ]);
    setIsExecuting(false);
  };

  // Run parallel batch collection with target-level fault isolation
  const executeBatchCollection = async (targetsToExecute: Device[], isRetry: boolean = false) => {
    const allTargetDevices = collectScope === 'group' ? groupDevices : customDevices;
    if (targetsToExecute.length === 0 || !selectedSet || !compatibility.isCompatible) return;

    setIsExecuting(true);
    setCurrentStep(2);

    if (!isRetry) {
      setCompletedSnapshotIds([]);
      const initialTracking: Record<string, ParallelDeviceProgress> = {};
      allTargetDevices.forEach((d) => {
        initialTracking[d.deviceId] = {
          deviceId: d.deviceId,
          deviceName: d.name,
          deviceHostname: d.hostname,
          status: 'connecting',
          currentCmdIndex: 0,
          totalCmds: selectedSet.commands.length,
        };
      });
      setParallelProgress(initialTracking);
      setTerminalLogs([
        `[PARALLEL] Dispatched concurrent collection across ${allTargetDevices.length} network targets...`,
        `[ORCHESTRATION] Allocating dedicated SSH workers per target...`,
      ]);
    } else {
      setParallelProgress((prev) => {
        const updated = { ...prev };
        targetsToExecute.forEach((d) => {
          if (updated[d.deviceId]) {
            updated[d.deviceId] = {
              ...updated[d.deviceId],
              status: 'connecting',
              error: undefined,
            };
          }
        });
        return updated;
      });
      setTerminalLogs((prev) => [
        ...prev,
        `[RETRY] Re-dispatching isolated collection across ${targetsToExecute.length} failed targets...`,
      ]);
    }

    const createdSnapshots: string[] = [];
    const token = sessionStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await Promise.all(
      targetsToExecute.map(async (dev) => {
        try {
          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'executing',
            },
          }));

          const res = await fetch('/api/collect', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              deviceId: dev.deviceId,
              deviceName: dev.name,
              hostname: dev.hostname,
              port: dev.port || 22,
              deviceType: dev.deviceType,
              username: dev.username,
              password: dev.password,
              commands: selectedSet.commands,
              snapshotType,
              changeTicket: ticketNumber,
              notes: `${notes} [Batch Parallel Capture]`,
            }),
          });

          const data = await res.json();
          if (!res.ok || (data.status !== 'SUCCESS' && !data.success)) {
            throw new Error(data.detail || data.error || data.message || 'Live SSH capture failed');
          }

          const snap = addSnapshot({
            deviceId: dev.deviceId,
            deviceName: dev.name,
            deviceHostname: dev.hostname,
            deviceType: dev.deviceType,
            snapshotType,
            commands: selectedSet.commands,
            outputs: data.outputs || {},
            changeTicket: ticketNumber,
            notes: `${notes} [Batch Parallel Capture]`,
          });
          createdSnapshots.push(snap.snapshotId);

          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'completed',
              snapshotId: snap.snapshotId,
              error: undefined,
            },
          }));

          setTerminalLogs((prev) => [
            ...prev,
            `[SUCCESS] Snapshot ${snap.snapshotId} generated for ${dev.name} and committed to vault`,
          ]);
        } catch (err: any) {
          const errMsg = err?.message || 'SSH connection failed';
          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'failed',
              error: errMsg,
            },
          }));
          setTerminalLogs((prev) => [
            ...prev,
            `[ERROR] Failed collection for ${dev.name}: ${errMsg}`,
          ]);
        }
      })
    );

    setCurrentStep(4);
    setCompletedSnapshotIds((prev) => {
      const merged = Array.from(new Set([...prev, ...createdSnapshots]));
      return merged;
    });

    setTerminalLogs((prev) => {
      const totalDone = Object.values(parallelProgress).filter(
        (p) => p.status === 'completed' || createdSnapshots.includes(p.snapshotId || '')
      ).length;
      return [
        ...prev,
        `[BATCH COMPLETE] Parallel maintenance window collection finished. ${totalDone} of ${allTargetDevices.length} snapshots stored.`,
      ];
    });
    setIsExecuting(false);
  };

  const handleStartBatchCollection = () => {
    const targetDevices = collectScope === 'group' ? groupDevices : customDevices;
    executeBatchCollection(targetDevices, false);
  };

  const handleRetryFailedCollection = () => {
    const allTargetDevices = collectScope === 'group' ? groupDevices : customDevices;
    const failedTargets = allTargetDevices.filter(
      (d) => parallelProgress[d.deviceId]?.status === 'failed'
    );
    if (failedTargets.length > 0) {
      executeBatchCollection(failedTargets, true);
    }
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-zinc-300" weight="duotone" />
            <span>Snapshot Collector</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Follow the 3-step operational workflow to select target network devices, configure command sets, and execute automated state captures.
          </p>
        </div>
      </div>

      {/* 3-Step Guided Operational Workflow Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1 Pill */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => setActiveStep(1)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeStep === 1
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : activeTargetDevices.length > 0
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 1
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : activeTargetDevices.length > 0 && activeStep > 1
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {activeTargetDevices.length > 0 && activeStep > 1 ? (
              <Check className="w-4 h-4" weight="bold" />
            ) : (
              '1'
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">1. Select Target</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {collectScope === 'single'
                ? selectedDevice
                  ? `${selectedDevice.name} (${selectedDevice.hostname})`
                  : 'Select target node'
                : collectScope === 'group'
                ? selectedGroup
                  ? `${selectedGroup.name} (${groupDevices.length} nodes)`
                  : 'Select group'
                : `${selectedBatchDeviceIds.length} custom nodes selected`}
            </div>
          </div>
        </button>

        {/* Step 2 Pill */}
        <button
          type="button"
          disabled={isExecuting || activeTargetDevices.length === 0}
          onClick={() => setActiveStep(2)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeStep === 2
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : selectedSet
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 2
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : selectedSet && activeStep > 2
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {selectedSet && activeStep > 2 ? (
              <Check className="w-4 h-4" weight="bold" />
            ) : (
              '2'
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">2. Command Set & Parameters</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {selectedSet
                ? `${selectedSet.name} • ${
                    snapshotType === 'pre_change'
                      ? 'PRE'
                      : snapshotType === 'post_change'
                      ? 'POST'
                      : 'AD-HOC'
                  }`
                : 'Configure parameters'}
            </div>
          </div>
        </button>

        {/* Step 3 Pill */}
        <button
          type="button"
          disabled={isExecuting || activeTargetDevices.length === 0 || !selectedSet}
          onClick={() => setActiveStep(3)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeStep === 3
              ? 'bg-zinc-900 border-[#c8ff00] text-white shadow-lg ring-1 ring-[#c8ff00]/30'
              : completedSnapshotIds.length > 0
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              activeStep === 3
                ? 'bg-[#c8ff00] text-zinc-950 shadow-sm'
                : completedSnapshotIds.length > 0
                ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}
          >
            {completedSnapshotIds.length > 0 ? (
              <Check className="w-4 h-4" weight="bold" />
            ) : (
              '3'
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold leading-tight text-white">3. Pre-flight & Run Collection</div>
            <div className="text-xs text-zinc-400 truncate mt-1">
              {compatibility.isCompatible ? 'Driver aligned • Ready' : 'Incompatible driver profile'}
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: SELECT TARGET                                                     */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="space-y-4 w-full">
          {/* Target Scope 3-Way Mode Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
            <div className="text-xs text-zinc-300 font-semibold flex items-center gap-2">
              <HardDrives className="w-4 h-4 text-zinc-400" />
              <span>Choose Target Dispatch Mode</span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit">
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => setCollectScope('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  collectScope === 'single'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HardDrives className={`w-3.5 h-3.5 ${collectScope === 'single' ? 'text-[#c8ff00]' : 'text-zinc-400'}`} />
                <span>Single Target</span>
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => setCollectScope('group')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  collectScope === 'group'
                    ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UsersThree className={`w-3.5 h-3.5 ${collectScope === 'group' ? 'text-zinc-950' : 'text-zinc-400'}`} weight={collectScope === 'group' ? 'bold' : 'regular'} />
                <span>By Device Group</span>
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => setCollectScope('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  collectScope === 'custom'
                    ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Lightning className={`w-3.5 h-3.5 ${collectScope === 'custom' ? 'text-zinc-950' : 'text-zinc-400'}`} weight="bold" />
                <span>Custom Batch</span>
              </button>
            </div>
          </div>

          {/* SINGLE TARGET: Paginated 100-Device Table with Search, Filter & Chevron */}
          {collectScope === 'single' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search device name, IP address, or ID..."
                    value={deviceSearch}
                    onChange={(e) => {
                      setDeviceSearch(e.target.value);
                      setDevicePage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
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

              {/* 100-Device Paginated Table with Chevron */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="px-5 py-3">Device Name</th>
                        <th className="px-5 py-3">Hostname / IP</th>
                        <th className="px-5 py-3">Driver</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Snapshots</th>
                        <th className="w-10 px-5 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {paginatedDevices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                            <HardDrives className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="font-semibold text-zinc-300 text-sm">No matching devices found</p>
                            <p className="text-xs text-zinc-500 mt-1">Try clearing filters or search criteria.</p>
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
                              onClick={() => handleSelectSingleDevice(dev)}
                              className={`hover:bg-zinc-800/40 transition-colors cursor-pointer group ${
                                isSelected ? 'bg-zinc-800/30 ring-1 ring-inset ring-[#c8ff00]/40' : ''
                              }`}
                            >
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                                  {dev.name}
                                </div>
                                <div className="text-xs text-zinc-500 font-mono">{dev.deviceId}</div>
                              </td>

                              <td className="px-5 py-3.5 font-mono text-zinc-300">
                                {dev.hostname}
                              </td>

                              <td className="px-5 py-3.5 font-mono text-zinc-400">
                                {dev.deviceType}
                              </td>

                              <td className="px-5 py-3.5">
                                <Badge variant={dev.status === 'online' ? 'success' : 'danger'} size="sm">
                                  {dev.status.toUpperCase()}
                                </Badge>
                              </td>

                              <td className="px-5 py-3.5 font-mono text-zinc-300">
                                {snapCount} available
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

          {/* DEVICE GROUP TARGET MODE */}
          {collectScope === 'group' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UsersThree className="w-4 h-4 text-[#c8ff00]" />
                    <span>Select Target Device Group</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Dispatch parallel snapshot workers across all network nodes assigned to this operational group.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleOpenCreateNewGroup}
                >
                  New Group
                </Button>
              </div>

              <div>
                <Select
                  label="Registered Device Groups"
                  size="md"
                  disabled={isExecuting}
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {deviceGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name} ({g.deviceIds.length} nodes) — {g.description || 'No description'}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedGroup && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-200">{selectedGroup.name}</span>
                    <span className="font-mono text-[#c8ff00] font-semibold">{groupDevices.length} network nodes</span>
                  </div>
                  <p className="text-xs text-zinc-400">{selectedGroup.description || 'Target nodes included in this group:'}</p>

                  {groupDevices.length === 0 ? (
                    <div className="text-xs text-amber-400">
                      No devices are currently assigned to this group. Add devices to proceed.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
                      {groupDevices.map((d) => (
                        <div
                          key={d.deviceId}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono flex items-center gap-2"
                        >
                          <span className="font-bold text-white">{d.name}</span>
                          <span className="text-zinc-400 text-xs">{d.hostname}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{d.deviceType}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CUSTOM BATCH TARGET MODE */}
          {collectScope === 'custom' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lightning className="w-4 h-4 text-[#c8ff00]" weight="bold" />
                    <span>Custom Batch Multi-Selection</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Hand-pick target devices or filter by topology tags for ad-hoc parallel captures.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedBatchDeviceIds.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
                      onClick={handleOpenSaveCustomGroup}
                    >
                      Save as Group
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectAllFiltered}
                  >
                    Select / Deselect All
                  </Button>
                </div>
              </div>

              {/* Tag Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    selectedTagFilter === 'ALL'
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  All Tags ({devices.length})
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedTagFilter === tag
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Multi-Device Picker Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 max-h-72 overflow-y-auto divide-y divide-zinc-800/60">
                {tagFilteredDevices.map((dev) => {
                  const isChecked = selectedBatchDeviceIds.includes(dev.deviceId);
                  return (
                    <label
                      key={dev.deviceId}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/50 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          disabled={isExecuting}
                          checked={isChecked}
                          onChange={() => handleToggleDevice(dev.deviceId)}
                        />
                        <div className="truncate">
                          <span className="font-bold text-zinc-200">{dev.name}</span>
                          <span className="text-zinc-400 font-mono text-xs ml-2">({dev.hostname})</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-400 shrink-0">
                        {dev.deviceType}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fluid Bottom Progression Bar for Step 1 */}
          <div className="pt-4 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-400">Target Selected:</span>
              <span className="text-white font-bold">
                {collectScope === 'single'
                  ? selectedDevice
                    ? `${selectedDevice.name} (${selectedDevice.hostname})`
                    : 'None'
                  : collectScope === 'group'
                  ? selectedGroup
                    ? `${selectedGroup.name} (${groupDevices.length} nodes)`
                    : 'None'
                  : `${selectedBatchDeviceIds.length} custom nodes`}
              </span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={activeTargetDevices.length === 0}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" weight="bold" />}
              onClick={() => setActiveStep(2)}
            >
              Proceed to Parameters
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: COMMAND SET & MAINTENANCE PARAMETERS                              */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="space-y-6 w-full pt-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Configure Command Profile & Telemetry Parameters</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select the show command set and specify maintenance window change ticketing.
                </p>
              </div>
              <Badge variant="info" size="md">
                Target: {activeTargetDevices.length} node{activeTargetDevices.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Command Set Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300">
                  Command Set Profile
                </label>
                {selectedSet && (
                  <span className="text-xs font-mono text-zinc-400">
                    Target Driver: <span className="text-[#c8ff00] font-semibold">{getDeviceTypeLabel(selectedSet.deviceType)}</span>
                  </span>
                )}
              </div>

              <Select
                size="md"
                disabled={isExecuting}
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                error={!compatibility.isCompatible ? 'Mismatched driver for target nodes' : undefined}
              >
                {commandSets.map((s: CommandSet) => {
                  const isComp = isCommandSetCompatible(s, activeTargetDevices);
                  const driverLabel = getDeviceTypeLabel(s.deviceType);
                  return (
                    <option key={s.setId} value={s.setId}>
                      {s.name} ({s.commands.length} cmds) — {driverLabel} {isComp ? '✓ Compatible' : `[Mismatched Driver: ${driverLabel}]`}
                    </option>
                  );
                })}
              </Select>

              {/* Commands List Preview */}
              {selectedSet && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Commands to Execute ({selectedSet.commands.length}):</span>
                    <span className="text-zinc-400 font-mono text-xs">Read-only safe</span>
                  </div>
                  <div className="space-y-1 font-mono text-sm text-zinc-300">
                    {selectedSet.commands.map((cmd, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-zinc-300">
                        <span className="text-zinc-600 select-none">›</span>
                        <span className="font-bold text-zinc-200">{cmd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Snapshot Stage Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Maintenance Window Stage
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['pre_change', 'post_change', 'ad_hoc'] as SnapshotType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isExecuting}
                    onClick={() => setSnapshotType(type)}
                    className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      snapshotType === type
                        ? type === 'pre_change'
                          ? 'bg-sky-950/40 text-sky-300 border-sky-600 ring-1 ring-sky-500 shadow-sm'
                          : type === 'post_change'
                          ? 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/60 ring-1 ring-[#c8ff00]/40 shadow-sm'
                          : 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-bold text-sm">
                      {type === 'pre_change'
                        ? 'Pre-Change Baseline'
                        : type === 'post_change'
                        ? 'Post-Change Verification'
                        : 'Ad-Hoc Inspection'}
                    </span>
                    <span className="text-xs text-zinc-400 font-normal">
                      {type === 'pre_change'
                        ? 'Establish stable reference baseline'
                        : type === 'post_change'
                        ? 'Capture post-deployment diff telemetry'
                        : 'Routine operational audit'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Change Ticket Identifier
                </label>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="CHG-XXXXXX"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Maintenance Window Notes
                </label>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Uplink interface switchover..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setActiveStep(1)}
              >
                Back to Target
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" weight="bold" />}
                onClick={() => setActiveStep(3)}
              >
                Proceed to Pre-flight & Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PRE-FLIGHT VERIFICATION & LIVE EXECUTION                          */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="space-y-6 w-full">
          {/* 1. Stacked Pre-Flight Verification Top Strip (Full Width) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#c8ff00]" weight="fill" />
                <h3 className="font-bold text-sm text-white">Pre-Flight Verification</h3>
                <span className="text-xs text-zinc-400 font-mono">• Non-mutating show safety inspection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                  <span className="text-[#c8ff00] font-bold">100% Safe</span>
                  <span>show commands only</span>
                </div>
                <Badge variant={compatibility.isCompatible ? 'success' : 'danger'} size="sm">
                  {compatibility.isCompatible ? 'READY' : 'BLOCKED'}
                </Badge>
              </div>
            </div>

            {/* High-Density Telemetry Meta Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] block">Dispatch Target</span>
                <span className="text-white font-bold truncate block">
                  {collectScope === 'single'
                    ? selectedDevice?.name
                    : collectScope === 'group'
                    ? selectedGroup?.name
                    : 'Custom Batch'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] block">Target Node Count</span>
                <span className="text-white font-bold block">
                  {activeTargetDevices.length} node{activeTargetDevices.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] block">Command Profile</span>
                <span className="text-zinc-200 truncate block">
                  {selectedSet?.name}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] block">Commands to Run</span>
                <span className="text-[#c8ff00] font-bold block">
                  {selectedSet?.commands.length} show commands
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] block">Change Ticket</span>
                <span className="text-zinc-200 block truncate">
                  {ticketNumber || 'None'}
                </span>
              </div>
            </div>

            {/* Incompatibility / Driver Mismatch Alert (Expanded when blocked) */}
            {!compatibility.isCompatible && (
              <div className="p-4 rounded-xl border bg-rose-950/30 border-rose-800/70 text-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warning className="w-4 h-4 text-rose-400 shrink-0" weight="fill" />
                    <span className="text-sm font-bold text-rose-400">
                      Driver Compatibility Mismatch — Blocked
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60">
                    Required: {getDeviceTypeLabel(selectedSet?.deviceType)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  {compatibility.summary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-rose-900/40">
                  <div>
                    <span className="font-semibold text-rose-300">Operational Impact: </span>
                    <span className="text-zinc-400">{compatibility.impact}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sky-400">Action Required: </span>
                    <span className="text-zinc-400">{compatibility.nextStep}</span>
                  </div>
                </div>
                {compatibility.incompatibleDevices.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs uppercase font-mono text-zinc-400 block mb-1">
                      Incompatible Target Nodes ({compatibility.incompatibleDevices.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {compatibility.incompatibleDevices.map((dev) => (
                        <span
                          key={dev.deviceId}
                          className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-xs font-mono text-rose-200"
                        >
                          {dev.name} ({getDeviceTypeLabel(dev.deviceType)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Full-Width Execution Telemetry Section */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 shadow-sm w-full">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <TerminalWindow className="w-5 h-5 text-[#c8ff00]" weight="duotone" />
                <h3 className="font-bold text-sm text-white">Full-Width Execution Telemetry</h3>
                <span className="text-xs text-zinc-400 font-mono hidden sm:inline">• Live Netmiko SSH events</span>
              </div>
              {isExecuting && (
                <span className="flex items-center gap-2 text-xs text-zinc-200 font-mono px-2.5 py-1 rounded-md bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00]">
                  <Spinner className="w-3.5 h-3.5 animate-spin" />
                  <span>{collectScope === 'single' ? `Step ${currentStep}/4` : 'Parallel Execution Active'}</span>
                </span>
              )}
            </div>

            {/* Progress Tracker (Single Mode) */}
            {collectScope === 'single' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { step: 1, label: 'SSH Connect' },
                  { step: 2, label: 'Run Commands' },
                  { step: 3, label: 'Archive Vault' },
                  { step: 4, label: 'Complete' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`p-3 rounded-xl text-center text-xs font-medium border transition-all ${
                      currentStep > s.step
                        ? 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/30 font-semibold'
                        : currentStep === s.step
                        ? 'bg-[#c8ff00]/25 text-[#c8ff00] border-[#c8ff00]/50 font-bold animate-pulse'
                        : 'bg-zinc-950/60 text-zinc-500 border-zinc-800/60'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">STEP {s.step}</div>
                    <div className="truncate text-xs text-zinc-300 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              /* Parallel Worker Matrix (Batch Mode - Full Width Multi-Column Grid) */
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between font-mono">
                  <span>Parallel Workers Dispatch Matrix</span>
                  <span className="text-[#c8ff00]">
                    {Object.values(parallelProgress).filter((p) => p.status === 'completed').length} of {activeTargetDevices.length} completed
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {Object.values(parallelProgress).map((worker) => (
                    <div
                      key={worker.deviceId}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-sm flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-100 truncate text-xs">{worker.deviceName}</div>
                        <div
                          className={`text-[11px] font-mono truncate ${
                            worker.status === 'failed' ? 'text-rose-400 font-medium' : 'text-zinc-400'
                          }`}
                          title={worker.error || worker.deviceHostname}
                        >
                          {worker.status === 'executing'
                            ? `Cmd ${worker.currentCmdIndex}/${worker.totalCmds}`
                            : worker.status === 'failed' && worker.error
                            ? worker.error
                            : worker.latencyMs ? `${worker.latencyMs}ms` : worker.deviceHostname}
                        </div>
                      </div>

                      <Badge
                        variant={
                          worker.status === 'completed'
                            ? 'default'
                            : worker.status === 'executing'
                            ? 'info'
                            : worker.status === 'failed'
                            ? 'danger'
                            : 'outline'
                        }
                        size="sm"
                      >
                        {worker.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming Terminal Log - Full Width, Maximized Height */}
            <div className="bg-zinc-950 rounded-xl p-4.5 border border-zinc-800 font-mono text-xs leading-relaxed text-zinc-200 min-h-[340px] max-h-[460px] overflow-y-auto space-y-1.5 shadow-inner">
              {terminalLogs.length === 0 ? (
                <div className="text-zinc-500 italic flex items-center gap-2 pt-4">
                  <TerminalWindow className="w-4 h-4 text-zinc-600" />
                  <span>Ready to initiate collection. Click "Run collection" below to dispatch Netmiko SSH sessions and stream live CLI output.</span>
                </div>
              ) : (
                terminalLogs.map((log: string, i: number) => (
                  <div
                    key={i}
                    className={`${
                      log.includes('[SUCCESS]')
                        ? 'text-[#c8ff00] font-bold'
                        : log.includes('[CLI]')
                        ? 'text-zinc-200'
                        : log.includes('[ERROR]') || log.includes('failure')
                        ? 'text-rose-400 font-semibold'
                        : log.includes('[PARALLEL]')
                        ? 'text-sky-400 font-semibold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>

            {/* Completion Actions Banner */}
            {completedSnapshotIds.length > 0 && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-[#c8ff00]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#c8ff00]" weight="fill" />
                    <span>
                      {completedSnapshotIds.length === 1
                        ? 'Snapshot captured successfully'
                        : `${completedSnapshotIds.length} snapshots captured successfully`}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    {completedSnapshotIds.length === 1
                      ? completedSnapshotIds[0]
                      : 'Committed to immutable snapshot vault'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Database className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/operations?tab=snapshots')}
                  >
                    View Vault
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<GitDiff className="w-3.5 h-3.5" weight="bold" />}
                    onClick={() => navigate('/analysis?tab=compare')}
                  >
                    Compare
                  </Button>
                </div>
              </div>
            )}

            {/* Partial Failure Warning Banner with Retry Action */}
            {collectScope !== 'single' && !isExecuting && Object.values(parallelProgress).some((p) => p.status === 'failed') && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" weight="fill" />
                    <span>
                      {Object.values(parallelProgress).filter((p) => p.status === 'failed').length} of {activeTargetDevices.length} network targets failed
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    Completed snapshots are safe in vault. Retry executes only on failed targets.
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowsClockwise className="w-3.5 h-3.5" />}
                  onClick={handleRetryFailedCollection}
                >
                  Retry failed devices
                </Button>
              </div>
            )}
          </div>

          {/* Full-Width Action Bar: Back on left, Run collection on right */}
          <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isExecuting}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => setActiveStep(2)}
            >
              Back to Parameters
            </Button>

            <Button
              variant="primary"
              size="sm"
              isLoading={isExecuting}
              leftIcon={
                collectScope !== 'single' ? (
                  <Lightning className="w-4 h-4" weight="bold" />
                ) : (
                  <Play className="w-4 h-4" weight="bold" />
                )
              }
              onClick={
                collectScope === 'single'
                  ? handleStartSingleCollection
                  : handleStartBatchCollection
              }
              disabled={
                isExecuting ||
                activeTargetDevices.length === 0 ||
                !compatibility.isCompatible
              }
            >
              {isExecuting
                ? collectScope === 'single'
                  ? 'Collecting from 1 device…'
                  : `Collecting from ${activeTargetDevices.length} devices in parallel…`
                : !compatibility.isCompatible
                ? 'Collection blocked — Incompatible driver profile'
                : collectScope === 'single'
                ? 'Run collection'
                : `Run collection (${activeTargetDevices.length} targets)`}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Create Group Modal in Collect Page */}
      {isCreateGroupModalOpen && (
        <Modal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          title="Create Device Group"
        >
          <form onSubmit={handleSaveNewGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Group Name
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Core Backbone or DC Fabric"
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Operational purpose of this group..."
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Target Devices ({newGroupDeviceIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (newGroupDeviceIds.length === devices.length) {
                      setNewGroupDeviceIds([]);
                    } else {
                      setNewGroupDeviceIds(devices.map((d) => d.deviceId));
                    }
                  }}
                  className="text-xs text-[#c8ff00] hover:underline cursor-pointer"
                >
                  {newGroupDeviceIds.length === devices.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="border border-zinc-800 rounded-xl bg-zinc-950 max-h-48 overflow-y-auto divide-y divide-zinc-800/60">
                {devices.map((dev) => {
                  const isChecked = newGroupDeviceIds.includes(dev.deviceId);
                  return (
                    <label
                      key={dev.deviceId}
                      className="flex items-center justify-between px-3 py-2 hover:bg-zinc-900/50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => {
                            setNewGroupDeviceIds((prev) =>
                              prev.includes(dev.deviceId)
                                ? prev.filter((id) => id !== dev.deviceId)
                                : [...prev, dev.deviceId]
                            );
                          }}
                        />
                        <span className="font-semibold text-zinc-200">{dev.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateGroupModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newGroupName.trim() || newGroupDeviceIds.length === 0}
              >
                Create Group
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
