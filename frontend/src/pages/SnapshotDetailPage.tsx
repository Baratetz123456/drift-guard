import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Database,
  ArrowLeft,
  CaretRight,
  Trash,
  GitDiff,
  TerminalWindow,
  Copy,
  Check,
  HardDrives,
  Ticket,
} from '@phosphor-icons/react';

export const SnapshotDetailPage: React.FC = () => {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const navigate = useNavigate();
  const { snapshots, deleteSnapshot } = useAppStore();

  const snapshot = snapshots.find((s) => s.snapshotId === snapshotId);

  const [activeCommand, setActiveCommand] = useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (snapshot && snapshot.commands && snapshot.commands.length > 0) {
      setActiveCommand(snapshot.commands[0]);
    }
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className="space-y-6 font-sans max-w-4xl mx-auto">
        <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Database className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">Snapshot Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">The requested snapshot archive does not exist or was purged.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/operations?tab=snapshots')}
            className="mt-4"
          >
            Back to Snapshots
          </Button>
        </div>
      </div>
    );
  }

  const handleCopyOutput = () => {
    const output = snapshot.outputs[activeCommand] || '';
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDelete = () => {
    deleteSnapshot(snapshot.snapshotId);
    navigate('/operations?tab=snapshots');
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          to="/operations?tab=snapshots"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Snapshots</span>
        </Link>
        <CaretRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-100 font-mono font-bold">{snapshot.snapshotId}</span>
      </div>

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">{snapshot.snapshotId}</h1>
            <Badge
              variant={
                snapshot.snapshotType === 'pre_change'
                  ? 'info'
                  : snapshot.snapshotType === 'post_change'
                  ? 'success'
                  : 'default'
              }
              size="sm"
            >
              {snapshot.snapshotType === 'pre_change'
                ? 'PRE-CHANGE'
                : snapshot.snapshotType === 'post_change'
                ? 'POST-CHANGE'
                : 'AD-HOC'}
            </Badge>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {snapshot.deviceType}
            </span>
          </div>
          <p className="text-xs text-zinc-400 flex items-center gap-2">
            <HardDrives className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-200">{snapshot.deviceName}</span>
            <span>•</span>
            <span className="font-mono">{new Date(snapshot.timestamp).toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<GitDiff className="w-4 h-4" weight="bold" />}
            onClick={() => navigate(`/analysis?tab=compare&preSnapId=${snapshot.snapshotId}`)}
          >
            Compare Diff
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

      {/* Snapshot Metadata Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Target Network Device</div>
          <div className="font-bold text-zinc-100 text-sm flex items-center gap-2">
            <HardDrives className="w-4 h-4 text-[#c8ff00]" />
            <span>{snapshot.deviceName}</span>
          </div>
          <div className="text-xs text-zinc-400 font-mono mt-0.5">{snapshot.deviceHostname}</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Change Governance</div>
          <div className="font-bold text-zinc-100 text-sm flex items-center gap-2">
            <Ticket className="w-4 h-4 text-sky-400" />
            <span className="font-mono">{snapshot.changeTicket || 'N/A'}</span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
            {snapshot.notes || 'No change window notes provided.'}
          </div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Show Command Suite</div>
          <div className="font-bold text-zinc-100 text-sm flex items-center gap-2">
            <TerminalWindow className="w-4 h-4 text-amber-400" />
            <span>{snapshot.commands.length} Commands</span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Immutable payload committed</div>
        </Card>
      </div>

      {/* Terminal Command Output Viewer */}
      <Card className="p-5 border-zinc-800 bg-zinc-900/60 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TerminalWindow className="w-4 h-4 text-zinc-400" />
            <h3 className="font-bold text-sm text-zinc-200">CLI Show Output Vault</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOutput}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#c8ff00]" />
                  <span className="text-[#c8ff00] font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy output</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Command Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
          {snapshot.commands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => setActiveCommand(cmd)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeCommand === cmd
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Terminal Screen */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-200 overflow-x-auto min-h-[300px] leading-relaxed whitespace-pre selection:bg-[#c8ff00] selection:text-zinc-950">
          {snapshot.outputs[activeCommand] || (
            <span className="text-zinc-600 italic">No output captured for this command.</span>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/operations?tab=snapshots')}
          >
            Back to Snapshots
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            rightIcon={<GitDiff className="w-3.5 h-3.5" weight="bold" />}
            onClick={() => navigate(`/analysis?tab=compare&preSnapId=${snapshot.snapshotId}`)}
          >
            Compare in Workbench
          </Button>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete Snapshot ${snapshot.snapshotId}`}
          message={`Delete snapshot record "${snapshot.snapshotId}" for device ${snapshot.deviceName}? All captured show command outputs will be permanently purged from the archive.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
