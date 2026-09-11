import React, { useState } from 'react';
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
} from '@phosphor-icons/react';

export const CollectPage: React.FC = () => {
  const navigate = useNavigate();
  const { devices, commandSets, addSnapshot } = useAppStore();

  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.deviceId || '');
  const [selectedSetId, setSelectedSetId] = useState(commandSets[0]?.setId || '');
  const [snapshotType, setSnapshotType] = useState<SnapshotType>('pre_change');
  const [ticketNumber, setTicketNumber] = useState('CHG-998214');
  const [notes, setNotes] = useState('Pre-change maintenance capture before router uplink migration');

  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [completedSnapshotId, setCompletedSnapshotId] = useState<string | null>(null);

  const selectedDevice = devices.find((d: Device) => d.deviceId === selectedDeviceId);
  const selectedSet = commandSets.find((s: CommandSet) => s.setId === selectedSetId);

  const handleStartCollection = async () => {
    if (!selectedDevice || !selectedSet) return;

    setIsExecuting(true);
    setCurrentStep(1);
    setTerminalLogs([
      `[INIT] Initiating Step Functions workflow execution for ${selectedDevice.name}...`,
      `[SSH] Establishing Paramiko/Netmiko secure transport to ${selectedDevice.hostname}:${selectedDevice.port}...`,
    ]);

    await new Promise((r) => setTimeout(r, 1200));
    setTerminalLogs((prev) => [
      ...prev,
      `[SSH] Authentication succeeded (driver: ${selectedDevice.deviceType}). Prompt recognized: "${selectedDevice.name}#"`,
      `[EXEC] Running ${selectedSet.commands.length} commands sequentially...`,
    ]);
    setCurrentStep(2);

    const outputs: Record<string, string> = {};

    for (let i = 0; i < selectedSet.commands.length; i++) {
      const cmd = selectedSet.commands[i];
      await new Promise((r) => setTimeout(r, 700));
      setTerminalLogs((prev) => [...prev, `[CLI] Executing: ${cmd} (took ${Math.floor(Math.random() * 80) + 40}ms)`]);

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
      `[S3] Writing raw snapshot payload to s3://driftguard-snapshots-bucket/...`,
      `[DYNAMO] Registering snapshot record in DriftGuard-Snapshots DynamoDB table...`,
    ]);

    await new Promise((r) => setTimeout(r, 1000));
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

    setCompletedSnapshotId(snap.snapshotId);
    setTerminalLogs((prev) => [
      ...prev,
      `[SUCCESS] Snapshot ${snap.snapshotId} generated and archived to S3. Ready for line-by-line diff.`,
    ]);
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Camera className="w-6 h-6 text-zinc-300" weight="duotone" />
          <span>Snapshot collector</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Trigger automated SSH collection to archive immutable pre- and post-change device states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-5">
          <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-900/60">
            <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <HardDrives className="w-4 h-4 text-zinc-400" weight="duotone" />
              <span>Target and command selection</span>
            </h3>

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
                leftIcon={<Play className="w-4 h-4" weight="bold" />}
                onClick={handleStartCollection}
                className="w-full py-3"
              >
                {isExecuting ? 'Collecting from 1 device…' : 'Run collection'}
              </Button>
            </div>
          </Card>
        </div>

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
                    Running Step {currentStep}/4
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { step: 1, label: 'SSH Connect' },
                  { step: 2, label: 'Run Commands' },
                  { step: 3, label: 'S3 Archive' },
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
                          : 'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {completedSnapshotId && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Snapshot captured</div>
                  <div className="text-[11px] text-zinc-400 font-mono">{completedSnapshotId}</div>
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
