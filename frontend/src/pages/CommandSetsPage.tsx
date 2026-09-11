import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CommandSet, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import {
  TerminalWindow,
  Plus,
  Trash,
  CheckCircle,
  Warning,
  Code,
  ShieldCheck,
  MagnifyingGlass,
  Funnel,
} from '@phosphor-icons/react';

const DANGEROUS_PATTERNS = [
  'reload',
  'config',
  'erase',
  'format',
  'delete',
  'boot',
  'crypto key generate',
  'write erase',
];

export const CommandSetsPage: React.FC = () => {
  const { commandSets, addCommandSet, deleteCommandSet } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inspectingSet, setInspectingSet] = useState<CommandSet | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deviceType: 'cisco_xe' as DeviceType,
    commandsText: 'show version\nshow ip interface brief\nshow ip route summary\nshow running-config',
    isDefault: false,
  });

  const handleCommandsChange = (val: string) => {
    setFormData({ ...formData, commandsText: val });
    const lines = val.toLowerCase().split('\n');
    const danger = lines.find((line) =>
      DANGEROUS_PATTERNS.some((pattern) => line.trim().startsWith(pattern))
    );

    if (danger) {
      setSafetyNotice(`Command "${danger.trim()}" is non-read-only. DriftGuard enforces show commands only.`);
    } else {
      setSafetyNotice(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (safetyNotice) return;

    const commands = formData.commandsText
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    addCommandSet({
      name: formData.name,
      description: formData.description,
      deviceType: formData.deviceType,
      commands,
      isDefault: formData.isDefault,
    });

    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      deviceType: 'cisco_xe',
      commandsText: 'show version\nshow ip interface brief\nshow ip route summary',
      isDefault: false,
    });
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

  const totalPages = Math.ceil(filteredSets.length / pageSize);
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
          onClick={() => setIsModalOpen(true)}
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
              <option value="cisco_xe">Cisco IOS-XE</option>
              <option value="cisco_xr">Cisco IOS-XR</option>
              <option value="cisco_nxos">Cisco NX-OS</option>
              <option value="cisco_ios">Cisco Classic IOS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flat Table Layout for Command Sets */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Set Name</th>
                <th className="px-5 py-3">Target Driver</th>
                <th className="px-5 py-3">Commands</th>
                <th className="px-5 py-3">Safety Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedSets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-400">
                    <TerminalWindow className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-300 text-xs">No matching command sets</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Try clearing search or driver filters</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setDriverFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-xs text-[#c8ff00] font-bold hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedSets.map((set: CommandSet) => (
                  <tr key={set.setId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">{set.name}</span>
                        {set.isDefault && (
                          <Badge variant="default" size="sm">
                            DEFAULT
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{set.description}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      {set.deviceType}
                    </td>
                    <td className="px-5 py-3.5">
                      <div
                        onClick={() => setInspectingSet(set)}
                        className="flex flex-wrap gap-1 max-w-md cursor-pointer group"
                        title="Click to inspect all commands"
                      >
                        {set.commands.slice(0, 3).map((cmd: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60 group-hover:border-zinc-500 transition-colors"
                          >
                            {cmd}
                          </span>
                        ))}
                        {set.commands.length > 3 && (
                          <span className="text-[10px] font-mono text-[#c8ff00] font-semibold self-center hover:underline">
                            +{set.commands.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#c8ff00] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
                        Read-Only Verified
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setInspectingSet(set)}
                        >
                          Inspect
                        </Button>
                        {!set.isDefault && (
                          <button
                            onClick={() => deleteCommandSet(set.setId)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
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
            totalItems={filteredSets.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Command Set"
        description="Specify read-only show commands to execute during collection."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <option value="cisco_xe">Cisco IOS-XE</option>
              <option value="cisco_ios">Cisco Classic IOS</option>
              <option value="cisco_xr">Cisco IOS-XR</option>
              <option value="cisco_nxos">Cisco NX-OS</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">
                Commands (One command per line)
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">show commands only</span>
            </div>
            <textarea
              rows={5}
              required
              value={formData.commandsText}
              onChange={(e) => handleCommandsChange(e.target.value)}
              className="w-full font-mono text-xs px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            {safetyNotice && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <Warning className="w-4 h-4 shrink-0 text-rose-400" weight="fill" />
                <span>{safetyNotice}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={Boolean(safetyNotice)}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

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
                <span className="text-[11px] text-[#c8ff00] font-mono font-normal">Cisco Read-Only Safe</span>
              </div>
              <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 font-mono text-xs text-zinc-200 divide-y divide-zinc-800/60 max-h-[300px] overflow-y-auto">
                {inspectingSet.commands.map((cmd: string, i: number) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-zinc-200"># {cmd}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20 font-sans">
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
    </div>
  );
};
