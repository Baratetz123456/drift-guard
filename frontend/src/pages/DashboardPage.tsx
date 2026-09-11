import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Device, Snapshot, AuditLogEntry, AnalysisFinding } from '../types';
import {
  HardDrives,
  Camera,
  GitDiff,
  Sparkle,
  Warning,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldWarning,
  ShieldCheck,
  Pulse,
  Lightning,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../hooks/usePageMetadata';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Overview — DriftGuard',
    canonicalPath: '/',
    robots: 'noindex, nofollow',
  });

  const { devices, snapshots, comparisons, analyses, auditLogs } = useAppStore();

  const onlineDevices = devices.filter((d: Device) => d.status === 'online').length;
  const connectivityPct = Math.round((onlineDevices / (devices.length || 1)) * 100);

  const devicesWithBaseline = devices.filter((d: Device) =>
    snapshots.some((s: Snapshot) => s.deviceId === d.deviceId && s.snapshotType === 'pre_change')
  ).length;
  const baselineCoveragePct = Math.round((devicesWithBaseline / (devices.length || 1)) * 100);

  const totalAdditions = comparisons.reduce((acc, c) => acc + c.diffSummary.totalAdditions, 0);
  const totalDeletions = comparisons.reduce((acc, c) => acc + c.diffSummary.totalDeletions, 0);
  const totalDiffCommands = comparisons.reduce((acc, c) => acc + c.diffSummary.changedCommands, 0);

  const recentSnapshots = snapshots.slice(0, 4);
  const latestAnalysis = analyses[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Welcome & Operational Header */}
      <div className="border-b border-zinc-800/80 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <span>Network operations overview</span>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30">
            Live serverless
          </span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Live snapshot collection, line-by-line diffing, and automated risk analysis across your Cisco fleet.
        </p>
      </div>

      {/* Enhanced Telemetry KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Connectivity */}
        <Card className="p-5 relative overflow-hidden border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fleet Connectivity</span>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                <HardDrives className="w-4 h-4" weight="duotone" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{connectivityPct}%</span>
              <span className="text-xs text-[#c8ff00] font-semibold font-mono">
                {onlineDevices}/{devices.length} Online
              </span>
            </div>
            {/* Health bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#c8ff00] rounded-full transition-all duration-500"
                style={{ width: `${connectivityPct}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
              SSH Read-Only Active
            </span>
            <button
              onClick={() => navigate('/setup?tab=devices')}
              className="text-zinc-300 hover:text-white font-semibold cursor-pointer"
            >
              Manage &rarr;
            </button>
          </div>
        </Card>

        {/* KPI 2: Baseline Snapshot Coverage */}
        <Card className="p-5 relative overflow-hidden border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Baseline Coverage</span>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                <Camera className="w-4 h-4" weight="duotone" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{baselineCoveragePct}%</span>
              <span className="text-xs text-zinc-400 font-mono">
                {snapshots.length} in S3
              </span>
            </div>
            {/* Coverage bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#c8ff00] rounded-full transition-all duration-500"
                style={{ width: `${baselineCoveragePct}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              Latest: {new Date(snapshots[0]?.timestamp || Date.now()).toLocaleTimeString()}
            </span>
            <button
              onClick={() => navigate('/operations?tab=snapshots')}
              className="text-zinc-300 hover:text-white font-semibold cursor-pointer"
            >
              View &rarr;
            </button>
          </div>
        </Card>

        {/* KPI 3: Configuration & Routing Drift */}
        <Card className="p-5 relative overflow-hidden border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Detected Drift</span>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                <GitDiff className="w-4 h-4" weight="duotone" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalDiffCommands}</span>
              <span className="text-xs text-amber-400 font-semibold font-mono">
                Changed Commands
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs font-mono">
              <span className="text-[#c8ff00] font-semibold">+{totalAdditions} lines</span>
              <span className="text-rose-400 font-semibold">-{totalDeletions} lines</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
            <span className="flex items-center gap-1.5">
              <Pulse className="w-3 h-3 text-zinc-400" />
              {comparisons.length} active diff sets
            </span>
            <button
              onClick={() => navigate('/analysis?tab=compare')}
              className="text-zinc-300 hover:text-white font-semibold cursor-pointer"
            >
              Compare &rarr;
            </button>
          </div>
        </Card>

        {/* KPI 4: AI Risk Posture */}
        <Card className="p-5 relative overflow-hidden border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI risk posture</span>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                <Sparkle className="w-4 h-4" weight="fill" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <Badge severity={latestAnalysis?.overallRisk || 'Informational'} size="md">
                {latestAnalysis?.overallRisk || 'Informational'}
              </Badge>
              <span className="text-xs text-zinc-400 font-mono">
                Score {latestAnalysis?.riskScore || 0}/100
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (latestAnalysis?.riskScore || 0) > 70
                    ? 'bg-rose-500'
                    : (latestAnalysis?.riskScore || 0) > 40
                    ? 'bg-amber-500'
                    : 'bg-sky-400'
                }`}
                style={{ width: `${Math.max(latestAnalysis?.riskScore || 5, 8)}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
            <span className="text-zinc-400 truncate max-w-[140px]">
              {latestAnalysis?.findings.length || 0} findings detected
            </span>
            <button
              onClick={() => navigate('/analysis?tab=report')}
              className="text-zinc-300 hover:text-white font-semibold cursor-pointer"
            >
              Inspect &rarr;
            </button>
          </div>
        </Card>
      </div>

      {/* Quick-Actions Workflow Bar */}
      <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lightning className="w-4 h-4 text-[#c8ff00]" weight="fill" />
          Quick Actions:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/operations?tab=capture')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture</span>
          </button>
          <button
            onClick={() => navigate('/analysis?tab=compare')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <GitDiff className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
          <button
            onClick={() => navigate('/analysis?tab=report')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </button>
          <button
            onClick={() => navigate('/setup?tab=devices')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <HardDrives className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>
        </div>
      </div>

      {/* Featured Banner: Latest AI Analysis Spotlight */}
      {latestAnalysis && (
        <Card className="p-6 border-zinc-800 bg-zinc-900/60 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  <Sparkle className="w-3.5 h-3.5 text-zinc-300" weight="fill" />
                  Latest AI advisory synthesis: CORE-SW-01
                </span>
                <Badge severity={latestAnalysis.overallRisk} size="sm">
                  {latestAnalysis.overallRisk}
                </Badge>
                <span className="text-xs text-zinc-400 font-mono">
                  Ticket CHG-998214
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {latestAnalysis.summary}
              </h3>

              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                {latestAnalysis.executiveSummary}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {latestAnalysis.findings.slice(0, 3).map((f: AnalysisFinding, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                  >
                    <ShieldWarning
                      className={`w-3.5 h-3.5 ${
                        f.severity === 'Critical' || f.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : f.severity === 'High' || f.severity === 'HIGH'
                          ? 'text-orange-400'
                          : 'text-sky-400'
                      }`}
                      weight="duotone"
                    />
                    {f.title}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" weight="bold" />}
                onClick={() => navigate('/analysis?tab=report')}
              >
                Inspect
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/analysis?tab=compare')}
              >
                Compare
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Two Column Layout: Recent Snapshots & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Snapshots Card */}
        <Card className="p-6 border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-zinc-400" weight="duotone" />
              <h3 className="font-bold text-sm text-zinc-100">Recent Snapshots</h3>
            </div>
            <button
              onClick={() => navigate('/operations?tab=snapshots')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" weight="bold" />
            </button>
          </div>

          <div className="space-y-3">
            {recentSnapshots.map((snap: Snapshot) => (
              <div
                key={snap.snapshotId}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                    <HardDrives className="w-4 h-4" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-200">{snap.deviceName}</span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          snap.snapshotType === 'pre_change'
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-[#c8ff00]/15 text-[#c8ff00] border-[#c8ff00]/30'
                        }`}
                      >
                        {snap.snapshotType === 'pre_change' ? 'BASELINE' : 'VERIFIED'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-3 font-mono">
                      <span>{snap.deviceHostname}</span>
                      <span>•</span>
                      <span>{snap.commands.length} cmds</span>
                      <span>•</span>
                      <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/analysis?tab=compare')}
                >
                  Compare
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit Trail Activity Card */}
        <Card className="p-6 border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-zinc-400" weight="duotone" />
              <h3 className="font-bold text-sm text-zinc-100">Audit Trail Activity</h3>
            </div>
            <button
              onClick={() => navigate('/operations?tab=audit')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer transition-colors"
            >
              <span>Audit Log</span>
              <ArrowRight className="w-3.5 h-3.5" weight="bold" />
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 4).map((log: AuditLogEntry) => (
              <div
                key={log.auditId}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-[#c8ff00]">
                    <CheckCircle className="w-4 h-4" weight="fill" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200">
                      {log.action.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-zinc-300">{log.resourceId}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <Badge variant="outline" size="sm">
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
