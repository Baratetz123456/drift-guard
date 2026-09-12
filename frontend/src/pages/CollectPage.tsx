import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SnapshotType, Device, CommandSet } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Camera,
  HardDrives,
  TerminalWindow,
  Play,
  ArrowRight,
  Spinner,
  CheckCircle,
  Lightning,
  Funnel,
  Tag,
  Clock,
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
  const { devices, commandSets, addSnapshot } = useAppStore();

  // Mode: Single Target vs Batch Maintenance
  const [collectMode, setCollectMode] = useState<'single' | 'batch'>('single');

  // Single target state
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.deviceId || '');

  // Batch target state
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [selectedBatchDeviceIds, setSelectedBatchDeviceIds] = useState<string[]>(
    devices.slice(0, 3).map((d) => d.deviceId)
  );

  // Common collection parameters
  const [selectedSetId, setSelectedSetId] = useState(commandSets[0]?.setId || '');
  const [snapshotType, setSnapshotType] = useState<SnapshotType>('pre_change');
  const [ticketNumber, setTicketNumber] = useState('CHG-998214');
  const [notes, setNotes] = useState('Pre-change maintenance capture before router uplink migration');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [completedSnapshotIds, setCompletedSnapshotIds] = useState<string[]>([]);

  // Parallel progress tracking
  const [parallelProgress, setParallelProgress] = useState<Record<string, ParallelDeviceProgress>>({});

  const selectedDevice = devices.find((d: Device) => d.deviceId === selectedDeviceId);
  const selectedSet = commandSets.find((s: CommandSet) => s.setId === selectedSetId);

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

  // Run single collection
  const handleStartSingleCollection = async () => {
    if (!selectedDevice || !selectedSet) return;

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

    const outputs: Record<string, string> = {};

    for (let i = 0; i < selectedSet.commands.length; i++) {
      const cmd = selectedSet.commands[i];
      await new Promise((r) => setTimeout(r, 600));
      setTerminalLogs((prev) => [
        ...prev,
        `[CLI] Executing: ${cmd} (took ${Math.floor(Math.random() * 60) + 30}ms)`,
      ]);

      if (cmd.includes('interface')) {
        outputs[cmd] = `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   10.200.1.1      YES NVRAM  up                    up      
GigabitEthernet0/0/1   10.200.1.5      YES NVRAM  up                    up      
GigabitEthernet0/0/2   10.200.1.9      YES NVRAM  up                    up      
Loopback0              10.255.255.1    YES NVRAM  up                    up`;
      } else if (cmd.includes('bgp')) {
        outputs[cmd] = `BGP router identifier 10.255.255.1, local AS number 65001
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.200.1.2      4        65001   14320   14318      490    0    0 04:18:20        18
172.16.50.2     4        64512   59350   59348      490    0    0 3d18h          154`;
      } else {
        outputs[cmd] = `Command output for "${cmd}" successfully captured.\nSystem status normal. CPU load 3%, Memory free 78%.`;
      }
    }

    setCurrentStep(3);
    setTerminalLogs((prev) => [
      ...prev,
      `[PARSE] Output extraction validated. Sanitizing output lines...`,
      `[VAULT] Writing raw snapshot payload to immutable archive vault...`,
      `[STORE] Registering snapshot record in persistent state datastore...`,
    ]);

    await new Promise((r) => setTimeout(r, 800));
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
      `[SUCCESS] Snapshot ${snap.snapshotId} generated and archived to vault. Ready for line-by-line diff.`,
    ]);
    setIsExecuting(false);
  };

  // Run parallel batch collection
  const handleStartBatchCollection = async () => {
    const targetDevices = devices.filter((d) => selectedBatchDeviceIds.includes(d.deviceId));
    if (targetDevices.length === 0 || !selectedSet) return;

    setIsExecuting(true);
    setCurrentStep(1);
    setCompletedSnapshotIds([]);

    // Initialize parallel tracking state
    const initialTracking: Record<string, ParallelDeviceProgress> = {};
    targetDevices.forEach((d) => {
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
      `[PARALLEL] Dispatched concurrent collection across ${targetDevices.length} network targets...`,
      `[ORCHESTRATION] Allocating dedicated SSH workers per target...`,
    ]);

    const createdSnapshots: string[] = [];

    // Run parallel workers with Promise.all
    await Promise.all(
      targetDevices.map(async (dev) => {
        try {
          // Step 1: Connect
          const connectDelay = Math.floor(Math.random() * 600) + 400;
          await new Promise((r) => setTimeout(r, connectDelay));
          const latency = Math.floor(Math.random() * 25) + 12;

          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'executing',
              latencyMs: latency,
            },
          }));

          setTerminalLogs((prev) => [
            ...prev,
            `[SSH] Handshake established with ${dev.name} (${dev.hostname}) — ${latency}ms latency`,
          ]);

          // Step 2: Execute commands
          const outputs: Record<string, string> = {};
          for (let i = 0; i < selectedSet.commands.length; i++) {
            const cmd = selectedSet.commands[i];
            const execDelay = Math.floor(Math.random() * 400) + 300;
            await new Promise((r) => setTimeout(r, execDelay));

            outputs[cmd] = `Show command output for "${cmd}" on ${dev.name}.\nCaptured successfully. System status nominal.`;

            setParallelProgress((prev) => ({
              ...prev,
              [dev.deviceId]: {
                ...prev[dev.deviceId],
                currentCmdIndex: i + 1,
              },
            }));
          }

          // Step 3: Archive
          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'archiving',
            },
          }));

          await new Promise((r) => setTimeout(r, 400));

          // Step 4: Persist snapshot
          const snap = addSnapshot({
            deviceId: dev.deviceId,
            deviceName: dev.name,
            deviceHostname: dev.hostname,
            deviceType: dev.deviceType,
            snapshotType,
            commands: selectedSet.commands,
            outputs,
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
            },
          }));

          setTerminalLogs((prev) => [
            ...prev,
            `[SUCCESS] Snapshot ${snap.snapshotId} generated for ${dev.name} and committed to vault`,
          ]);
        } catch (err: any) {
          setParallelProgress((prev) => ({
            ...prev,
            [dev.deviceId]: {
              ...prev[dev.deviceId],
              status: 'failed',
              error: 'SSH timeout on port 22',
            },
          }));
          setTerminalLogs((prev) => [
            ...prev,
            `[ERROR] Failed collection for ${dev.name}: Connection timeout`,
          ]);
        }
      })
    );

    setCurrentStep(4);
    setCompletedSnapshotIds(createdSnapshots);
    setTerminalLogs((prev) => [
      ...prev,
      `[BATCH COMPLETE] Parallel maintenance window collection finished. ${createdSnapshots.length} of ${targetDevices.length} snapshots stored.`,
    ]);
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-zinc-300" weight="duotone" />
            <span>Snapshot collector</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Trigger automated SSH collection to archive immutable pre- and post-change device states.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit self-start sm:self-auto">
          <button
            type="button"
            disabled={isExecuting}
            onClick={() => setCollectMode('single')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              collectMode === 'single'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Single Target
          </button>
          <button
            type="button"
            disabled={isExecuting}
            onClick={() => setCollectMode('batch')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              collectMode === 'batch'
                ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Lightning className="w-3.5 h-3.5" weight="bold" />
            <span>Batch Maintenance</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-6 space-y-5">
          <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-900/60">
            <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <HardDrives className="w-4 h-4 text-zinc-400" weight="duotone" />
              <span>{collectMode === 'single' ? 'Target and command selection' : 'Batch parallel maintenance group'}</span>
            </h3>

            {collectMode === 'single' ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Device
                </label>
                <select
                  disabled={isExecuting}
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                >
                  {devices.map((d: Device) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.name} ({d.hostname}) — {d.deviceType}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Filter by Tag / Segment
                  </label>
                  <button
                    type="button"
                    disabled={isExecuting}
                    onClick={handleSelectAllFiltered}
                    className="text-xs text-[#c8ff00] font-semibold hover:underline cursor-pointer"
                  >
                    Select / Deselect all
                  </button>
                </div>

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
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 max-h-48 overflow-y-auto">
                  <div className="divide-y divide-zinc-800/60">
                    {tagFilteredDevices.map((dev) => {
                      const isChecked = selectedBatchDeviceIds.includes(dev.deviceId);
                      return (
                        <label
                          key={dev.deviceId}
                          className="flex items-center justify-between px-3 py-2 hover:bg-zinc-900/50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              disabled={isExecuting}
                              checked={isChecked}
                              onChange={() => handleToggleDevice(dev.deviceId)}
                              className="rounded bg-zinc-900 border-zinc-700 text-[#c8ff00] focus:ring-0 cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="font-bold text-zinc-200">{dev.name}</span>
                              <span className="text-zinc-500 font-mono ml-2">({dev.hostname})</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {dev.deviceType}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Selected: {selectedBatchDeviceIds.length} target devices</span>
                  <span className="text-[#c8ff00] font-mono">Parallel dispatch ready</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Command Set Suite
              </label>
              <select
                disabled={isExecuting}
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {commandSets.map((s: CommandSet) => (
                  <option key={s.setId} value={s.setId}>
                    {s.name} ({s.commands.length} commands)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Snapshot Type / Change Stage
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['pre_change', 'post_change', 'ad_hoc'] as SnapshotType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isExecuting}
                    onClick={() => setSnapshotType(type)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                      snapshotType === type
                        ? 'bg-[#c8ff00] text-zinc-950 border-[#c8ff00] font-bold shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {type === 'pre_change'
                      ? 'Pre-Change'
                      : type === 'post_change'
                      ? 'Post-Change'
                      : 'Ad-Hoc'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Change Ticket #
                </label>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="CHG-XXXX"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Change Window Notes
                </label>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional brief..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                isLoading={isExecuting}
                leftIcon={collectMode === 'batch' ? <Lightning className="w-4 h-4" weight="bold" /> : <Play className="w-4 h-4" weight="bold" />}
                onClick={collectMode === 'single' ? handleStartSingleCollection : handleStartBatchCollection}
                disabled={collectMode === 'batch' && selectedBatchDeviceIds.length === 0}
                className="w-full py-3"
              >
                {isExecuting
                  ? collectMode === 'single'
                    ? 'Collecting from 1 device…'
                    : `Collecting from ${selectedBatchDeviceIds.length} devices in parallel…`
                  : collectMode === 'single'
                  ? 'Run collection'
                  : `Run parallel collection (${selectedBatchDeviceIds.length} targets)`}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Execution Telemetry & Parallel Progress */}
        <div className="lg:col-span-6 space-y-5">
          <Card className="p-6 flex flex-col h-full justify-between border-zinc-800 bg-zinc-900/60">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <TerminalWindow className="w-4 h-4 text-zinc-300" weight="duotone" />
                  <h3 className="font-bold text-sm text-zinc-200">Execution Telemetry</h3>
                </div>
                {isExecuting && (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
                    <Spinner className="w-4 h-4 animate-spin" />
                    {collectMode === 'single' ? `Step ${currentStep}/4` : 'Parallel Execution Active'}
                  </span>
                )}
              </div>

              {/* Progress Tracker (Single Mode) */}
              {collectMode === 'single' ? (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { step: 1, label: 'SSH Connect' },
                    { step: 2, label: 'Run Commands' },
                    { step: 3, label: 'Archive Vault' },
                    { step: 4, label: 'Complete' },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={`p-2 rounded-lg text-center text-xs font-medium border transition-colors ${
                        currentStep > s.step
                          ? 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/30 font-semibold'
                          : currentStep === s.step
                          ? 'bg-[#c8ff00]/25 text-[#c8ff00] border-[#c8ff00]/50 font-bold animate-pulse'
                          : 'bg-zinc-950/60 text-zinc-500 border-zinc-800/60'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold">STEP {s.step}</div>
                      <div className="truncate text-[11px]">{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Parallel Worker Matrix (Batch Mode) */
                <div className="space-y-2 mb-4">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                    <span>Parallel Workers Status</span>
                    <span>{Object.values(parallelProgress).filter((p) => p.status === 'completed').length} of {selectedBatchDeviceIds.length} done</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {Object.values(parallelProgress).map((worker) => (
                      <div
                        key={worker.deviceId}
                        className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 mr-2">
                          <div className="font-bold text-zinc-200 truncate">{worker.deviceName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {worker.status === 'executing'
                              ? `Cmd ${worker.currentCmdIndex}/${worker.totalCmds}`
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

              {/* Streaming Terminal Log */}
              <div className="bg-zinc-950 rounded-xl p-3.5 border border-zinc-800 font-mono text-xs text-zinc-300 min-h-[220px] max-h-[260px] overflow-y-auto space-y-1.5">
                {terminalLogs.length === 0 ? (
                  <div className="text-zinc-600 italic">
                    Ready to initiate collection. Click "Run collection" to stream Netmiko SSH events.
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
            </div>

            {completedSnapshotIds.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">
                    {completedSnapshotIds.length === 1
                      ? 'Snapshot captured'
                      : `${completedSnapshotIds.length} snapshots captured`}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {completedSnapshotIds.length === 1
                      ? completedSnapshotIds[0]
                      : `Batch committed to vault`}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-4 h-4" weight="bold" />}
                  onClick={() => navigate('/analysis?tab=compare')}
                >
                  Compare
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
