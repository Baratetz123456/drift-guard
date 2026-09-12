import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Snapshot, SnapshotType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import {
  Database,
  MagnifyingGlass,
  Eye,
  GitDiff,
  Trash,
  Funnel,
} from '@phosphor-icons/react';

export const SnapshotsPage: React.FC = () => {
  const navigate = useNavigate();
  const { snapshots, deleteSnapshot } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<Snapshot | null>(null);
  const [activeCommandTab, setActiveCommandTab] = useState<string>('');

  const uniqueDevices = useMemo(() => {
    return Array.from(new Set(snapshots.map((s) => s.deviceName)));
  }, [snapshots]);

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s: Snapshot) => {
      const matchesSearch =
        s.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.snapshotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.changeTicket?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'ALL' || s.snapshotType === typeFilter;
      const matchesDevice = deviceFilter === 'ALL' || s.deviceName === deviceFilter;

      return matchesSearch && matchesType && matchesDevice;
    });
  }, [snapshots, searchTerm, typeFilter, deviceFilter]);

  const totalPages = Math.ceil(filteredSnapshots.length / pageSize);
  const paginatedSnapshots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSnapshots.slice(start, start + pageSize);
  }, [filteredSnapshots, currentPage, pageSize]);

  const handleOpenInspect = (snap: Snapshot) => {
    setSelectedSnapshot(snap);
    setActiveCommandTab(snap.commands[0] || '');
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-zinc-400" weight="duotone" />
            <span>Snapshots</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browse and inspect immutable Cisco show command outputs stored in snapshot archive vault.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<GitDiff className="w-4 h-4" weight="bold" />}
          onClick={() => navigate('/compare')}
        >
          Compare
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search device, snapshot ID, or ticket..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
            <Funnel className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="pre_change">Pre-Change</option>
              <option value="post_change">Post-Change</option>
              <option value="ad_hoc">Ad-Hoc</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
            <select
              value={deviceFilter}
              onChange={(e) => {
                setDeviceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Devices</option>
              {uniqueDevices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Snapshot ID</th>
                <th className="px-5 py-3">Target Device</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Commands</th>
                <th className="px-5 py-3">Captured At</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 italic">
                    No snapshots match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedSnapshots.map((snap: Snapshot) => (
                  <tr key={snap.snapshotId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-zinc-200">
                      {snap.snapshotId}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-zinc-100">{snap.deviceName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{snap.deviceHostname}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={snap.snapshotType === 'pre_change' ? 'info' : 'success'}
                        size="sm"
                      >
                        {snap.snapshotType === 'pre_change' ? 'PRE' : 'POST'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-400">
                      {snap.changeTicket || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      {snap.commands.length} cmds
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono">
                      {new Date(snap.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenInspect(snap)}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<GitDiff className="w-3.5 h-3.5" weight="bold" />}
                          onClick={() => navigate(`/analysis?tab=compare&preSnapId=${snap.snapshotId}`)}
                        >
                          Compare
                        </Button>
                        <button
                          onClick={() => setDeletingSnapshot(snap)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4">
          <PaginationToolbar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSnapshots.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingSnapshot && (
        <ConfirmDialog
          isOpen={Boolean(deletingSnapshot)}
          onClose={() => setDeletingSnapshot(null)}
          onConfirm={() => {
            deleteSnapshot(deletingSnapshot.snapshotId);
            setDeletingSnapshot(null);
          }}
          title={`Delete Snapshot ${deletingSnapshot.snapshotId}`}
          message={`Delete snapshot "${deletingSnapshot.snapshotId}" from ${deletingSnapshot.deviceName}? The associated S3 archive record will be permanently unlinked. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {selectedSnapshot && (
        <Modal
          isOpen={Boolean(selectedSnapshot)}
          onClose={() => setSelectedSnapshot(null)}
          title={`Snapshot ${selectedSnapshot.snapshotId}`}
          description={`${selectedSnapshot.deviceName} (${selectedSnapshot.deviceHostname}) — ${new Date(
            selectedSnapshot.timestamp
          ).toLocaleString()}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-2">
              {selectedSnapshot.commands.map((cmd: string) => (
                <button
                  key={cmd}
                  onClick={() => setActiveCommandTab(cmd)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    activeCommandTab === cmd
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold border border-[#c8ff00] shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {cmd}
                </button>
              ))}
            </div>

            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 font-mono text-xs text-zinc-200 overflow-x-auto max-h-[450px]">
              <div className="text-zinc-500 mb-2 select-none border-b border-zinc-800/80 pb-1">
                # {activeCommandTab}
              </div>
              <pre className="leading-relaxed whitespace-pre font-mono text-zinc-300">
                {selectedSnapshot.outputs[activeCommandTab] || 'No output recorded.'}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
              <span className="font-mono text-[11px]">Archive URI: {selectedSnapshot.s3Key}</span>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<GitDiff className="w-3.5 h-3.5" weight="bold" />}
                onClick={() => {
                  const snapId = selectedSnapshot.snapshotId;
                  setSelectedSnapshot(null);
                  navigate(`/analysis?tab=compare&preSnapId=${snapId}`);
                }}
              >
                Compare
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
