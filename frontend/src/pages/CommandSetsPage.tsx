import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { CommandSet, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import {
  validateCiscoCommandSuite,
  CISCO_DEVICE_PLATFORMS,
} from '../utils/ciscoSyntaxValidator';
import {
  TerminalWindow,
  Plus,
  Trash,
  PencilSimple,
  CheckCircle,
  Warning,
  ShieldCheck,
  MagnifyingGlass,
  Funnel,
  Sparkle,
  CaretRight,
} from '@phosphor-icons/react';

export const CommandSetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { commandSets, addCommandSet, updateCommandSet, deleteCommandSet } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<CommandSet | null>(null);
  const [inspectingSet, setInspectingSet] = useState<CommandSet | null>(null);

  // Delete confirmation state
  const [deletingSet, setDeletingSet] = useState<CommandSet | null>(null);

  // Update confirmation state
  const [pendingUpdateData, setPendingUpdateData] = useState<{
    setId: string;
    updates: Partial<CommandSet>;
    name: string;
  } | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deviceType: 'cisco_xe' as DeviceType,
    commandsText: 'show version\nshow ip interface brief\nshow ip route summary',
    isDefault: false,
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    deviceType: 'cisco_xe' as DeviceType,
    commandsText: '',
    isDefault: false,
  });

  // Real-time syntax verification for create form
  const createSyntaxAnalysis = useMemo(() => {
    return validateCiscoCommandSuite(formData.commandsText, formData.deviceType);
  }, [formData.commandsText, formData.deviceType]);

  // Real-time syntax verification for edit form
  const editSyntaxAnalysis = useMemo(() => {
    return validateCiscoCommandSuite(editFormData.commandsText, editFormData.deviceType);
  }, [editFormData.commandsText, editFormData.deviceType]);

  const handleStartEdit = (set: CommandSet) => {
    setEditingSet(set);
    setEditFormData({
      name: set.name,
      description: set.description || '',
      deviceType: set.deviceType,
      commandsText: set.commands.join('\n'),
      isDefault: set.isDefault,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createSyntaxAnalysis.hasErrors) return;

    addCommandSet({
      name: formData.name.trim(),
      description: formData.description.trim(),
      deviceType: formData.deviceType,
      commands: createSyntaxAnalysis.validCommands,
      isDefault: formData.isDefault,
    });

    setIsCreateModalOpen(false);
    setFormData({
      name: '',
      description: '',
      deviceType: 'cisco_xe',
      commandsText: 'show version\nshow ip interface brief\nshow ip route summary',
      isDefault: false,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet || editSyntaxAnalysis.hasErrors) return;

    // Trigger update confirmation dialog
    setPendingUpdateData({
      setId: editingSet.setId,
      name: editFormData.name.trim(),
      updates: {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        deviceType: editFormData.deviceType,
        commands: editSyntaxAnalysis.validCommands,
        isDefault: editFormData.isDefault,
      },
    });
  };

  const handleConfirmUpdate = () => {
    if (!pendingUpdateData) return;
    updateCommandSet(pendingUpdateData.setId, pendingUpdateData.updates);
    setPendingUpdateData(null);
    setEditingSet(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingSet) return;
    deleteCommandSet(deletingSet.setId);
    setDeletingSet(null);
  };

  const filteredSets = useMemo(() => {
    return commandSets.filter((s: CommandSet) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.commands.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDriver = driverFilter === 'ALL' || s.deviceType === driverFilter;
      return matchesSearch && matchesDriver;
    });
  }, [commandSets, searchTerm, driverFilter]);

  const totalPages = Math.ceil(filteredSets.length / pageSize) || 1;
  const paginatedSets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSets.slice(start, start + pageSize);
  }, [filteredSets, currentPage, pageSize]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <TerminalWindow className="w-6 h-6 text-zinc-400" weight="duotone" />
            <span>Command Sets</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Standard show command profiles for automated baseline snapshots and regression diffing.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" weight="bold" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search command sets or CLI commands..."
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
              value={driverFilter}
              onChange={(e) => {
                setDriverFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Drivers</option>
              {CISCO_DEVICE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Flat Table Layout for Command Sets */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Set Name</th>
                <th className="px-5 py-3">Target Driver</th>
                <th className="px-5 py-3">Commands</th>
                <th className="px-5 py-3">Safety Status</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedSets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-400">
                    <TerminalWindow className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-300 text-sm">No matching command sets</p>
                    <p className="text-xs text-zinc-500 mt-1">Try clearing search or driver filters</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setDriverFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-sm text-[#c8ff00] font-bold hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedSets.map((set: CommandSet) => (
                  <tr
                    key={set.setId}
                    onClick={() => navigate(`/setup/commands/${set.setId}`)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 group-hover:text-white transition-colors">{set.name}</span>
                        {set.isDefault && (
                          <Badge variant="default" size="sm">
                            DEFAULT
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{set.description}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      {set.deviceType}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {set.commands.slice(0, 3).map((cmd: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                          >
                            {cmd}
                          </span>
                        ))}
                        {set.commands.length > 3 && (
                          <span className="text-xs font-mono text-[#c8ff00] font-semibold self-center">
                            +{set.commands.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-[#c8ff00] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
                        Read-Only Verified
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500 group-hover:text-zinc-200 transition-colors">
                      <CaretRight className="w-4 h-4 ml-auto" />
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
            totalItems={filteredSets.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Create Command Set Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Command Set"
        description="Specify read-only show commands to execute during collection."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Set Name</label>
            <input
              type="text"
              required
              placeholder="e.g. OSPF Adjacency & Routing Health"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Scope and purpose of this command suite..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Device Driver</label>
            <select
              value={formData.deviceType}
              onChange={(e) =>
                setFormData({ ...formData, deviceType: e.target.value as DeviceType })
              }
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              {CISCO_DEVICE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">
                Commands (One command per line)
              </label>
              <span className="text-xs text-[#c8ff00] font-mono">Real-time syntax verified</span>
            </div>
            <textarea
              rows={5}
              required
              value={formData.commandsText}
              onChange={(e) => setFormData({ ...formData, commandsText: e.target.value })}
              className={`w-full font-mono text-sm px-3.5 py-2 bg-zinc-900 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none ${
                createSyntaxAnalysis.hasErrors
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-zinc-800 focus:border-zinc-500'
              }`}
            />

            {/* Inline Syntax Verification Preview */}
            <div className="mt-2.5 space-y-1 max-h-36 overflow-y-auto pr-1">
              {createSyntaxAnalysis.results.map((res, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs px-2.5 py-1 rounded border ${
                    res.status === 'error'
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      : res.status === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                        : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <span className="font-mono truncate mr-2">{res.command}</span>
                  <span
                    className={`font-semibold shrink-0 ${
                      res.status === 'error'
                        ? 'text-rose-400'
                        : res.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-[#c8ff00]'
                    }`}
                  >
                    {res.status === 'error' ? 'Blocked' : res.status === 'warning' ? 'Custom Show' : 'Verified'}
                  </span>
                </div>
              ))}
            </div>

            {createSyntaxAnalysis.errorMessage && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <Warning className="w-4 h-4 shrink-0 text-rose-400" weight="fill" />
                <span>{createSyntaxAnalysis.errorMessage}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createSyntaxAnalysis.hasErrors}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Command Set Modal */}
      {editingSet && (
        <Modal
          isOpen={Boolean(editingSet)}
          onClose={() => setEditingSet(null)}
          title={`Edit Command Set: ${editingSet.name}`}
          description="Update show command profile parameters and verify syntax."
          maxWidth="2xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Set Name</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Device Driver</label>
              <select
                value={editFormData.deviceType}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, deviceType: e.target.value as DeviceType })
                }
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {CISCO_DEVICE_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Commands (One command per line)
                </label>
                <span className="text-xs text-[#c8ff00] font-mono">Real-time syntax verified</span>
              </div>
              <textarea
                rows={5}
                required
                value={editFormData.commandsText}
                onChange={(e) => setEditFormData({ ...editFormData, commandsText: e.target.value })}
                className={`w-full font-mono text-sm px-3.5 py-2 bg-zinc-900 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none ${
                  editSyntaxAnalysis.hasErrors
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-zinc-800 focus:border-zinc-500'
                }`}
              />

              {/* Inline Syntax Verification Preview */}
              <div className="mt-2.5 space-y-1 max-h-36 overflow-y-auto pr-1">
                {editSyntaxAnalysis.results.map((res, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-xs px-2.5 py-1 rounded border ${
                      res.status === 'error'
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                        : res.status === 'warning'
                          ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                          : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <span className="font-mono truncate mr-2">{res.command}</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        res.status === 'error'
                          ? 'text-rose-400'
                          : res.status === 'warning'
                            ? 'text-amber-400'
                            : 'text-[#c8ff00]'
                      }`}
                    >
                      {res.status === 'error' ? 'Blocked' : res.status === 'warning' ? 'Custom Show' : 'Verified'}
                    </span>
                  </div>
                ))}
              </div>

              {editSyntaxAnalysis.errorMessage && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <Warning className="w-4 h-4 shrink-0 text-rose-400" weight="fill" />
                  <span>{editSyntaxAnalysis.errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="secondary" onClick={() => setEditingSet(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={editSyntaxAnalysis.hasErrors}>
                Update
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Inspect Command Set Profile Modal */}
      {inspectingSet && (
        <Modal
          isOpen={Boolean(inspectingSet)}
          onClose={() => setInspectingSet(null)}
          title={`Profile: ${inspectingSet.name}`}
          description={`${inspectingSet.deviceType} • ${inspectingSet.commands.length} show commands configured`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-1">Description</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {inspectingSet.description || 'Standard show command profile for device verification.'}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
                <span>Show Command Sequence ({inspectingSet.commands.length})</span>
                <span className="text-xs text-[#c8ff00] font-mono font-normal">Cisco Read-Only Safe</span>
              </div>
              <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 font-mono text-sm text-zinc-200 divide-y divide-zinc-800/60 max-h-[300px] overflow-y-auto">
                {inspectingSet.commands.map((cmd: string, i: number) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-zinc-200"># {cmd}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20 font-sans font-semibold">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInspectingSet(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingSet && (
        <ConfirmDialog
          isOpen={Boolean(deletingSet)}
          onClose={() => setDeletingSet(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${deletingSet.name}`}
          message={`Delete command set "${deletingSet.name}"? Devices referencing this set will require an alternate suite for collections. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {/* Update Confirmation Dialog */}
      {pendingUpdateData && (
        <ConfirmDialog
          isOpen={Boolean(pendingUpdateData)}
          onClose={() => setPendingUpdateData(null)}
          onConfirm={handleConfirmUpdate}
          title={`Update ${pendingUpdateData.name}`}
          message={`Save updates to command set "${pendingUpdateData.name}"? Active device collection jobs referencing this set will execute the revised command sequence.`}
          confirmText="Update"
          cancelText="Cancel"
          variant="warning"
        />
      )}
    </div>
  );
};
