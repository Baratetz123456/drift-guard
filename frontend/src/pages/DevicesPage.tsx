import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Device, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { CISCO_DEVICE_PLATFORMS } from '../utils/ciscoSyntaxValidator';
import {
  HardDrives,
  Plus,
  MagnifyingGlass,
  WifiHigh,
  WifiSlash,
  Trash,
  PencilSimple,
  Tag,
  Key,
  Funnel,
} from '@phosphor-icons/react';

export const DevicesPage: React.FC = () => {
  const { devices, addDevice, updateDevice, deleteDevice, testDeviceConnection } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  // Update confirmation state
  const [pendingUpdateData, setPendingUpdateData] = useState<{
    deviceId: string;
    name: string;
    updates: Partial<Device>;
  } | null>(null);

  // Create form state
  const [formData, setFormData] = useState<{
    name: string;
    hostname: string;
    port: number;
    deviceType: DeviceType;
    authType: 'password' | 'key' | 'secret_arn';
    username: string;
    tags: string;
  }>({
    name: '',
    hostname: '',
    port: 22,
    deviceType: 'cisco_xe',
    authType: 'password',
    username: 'admin',
    tags: 'Core, Datacenter',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    name: string;
    hostname: string;
    port: number;
    deviceType: DeviceType;
    authType: 'password' | 'key' | 'secret_arn';
    username: string;
    tags: string;
  }>({
    name: '',
    hostname: '',
    port: 22,
    deviceType: 'cisco_xe',
    authType: 'password',
    username: 'admin',
    tags: '',
  });

  const handleTestConnection = async (deviceId: string) => {
    setTestingId(deviceId);
    try {
      await testDeviceConnection(deviceId);
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.hostname) return;

    addDevice({
      name: formData.name.trim(),
      hostname: formData.hostname.trim(),
      port: formData.port,
      deviceType: formData.deviceType,
      authType: formData.authType,
      username: formData.username.trim(),
      status: 'untested',
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    });

    setIsAddModalOpen(false);
    setFormData({
      name: '',
      hostname: '',
      port: 22,
      deviceType: 'cisco_xe',
      authType: 'password',
      username: 'admin',
      tags: 'Core, Datacenter',
    });
  };

  const handleStartEdit = (device: Device) => {
    setEditingDevice(device);
    setEditFormData({
      name: device.name,
      hostname: device.hostname,
      port: device.port,
      deviceType: device.deviceType,
      authType: device.authType,
      username: device.username,
      tags: (device.tags || []).join(', '),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice || !editFormData.name || !editFormData.hostname) return;

    setPendingUpdateData({
      deviceId: editingDevice.deviceId,
      name: editFormData.name.trim(),
      updates: {
        name: editFormData.name.trim(),
        hostname: editFormData.hostname.trim(),
        port: editFormData.port,
        deviceType: editFormData.deviceType,
        authType: editFormData.authType,
        username: editFormData.username.trim(),
        tags: editFormData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      },
    });
  };

  const handleConfirmUpdate = () => {
    if (!pendingUpdateData) return;
    updateDevice(pendingUpdateData.deviceId, pendingUpdateData.updates);
    setPendingUpdateData(null);
    setEditingDevice(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingDevice) return;
    deleteDevice(deletingDevice.deviceId);
    setDeletingDevice(null);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((d: Device) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.tags && d.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesDriver = driverFilter === 'ALL' || d.deviceType === driverFilter;
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

      return matchesSearch && matchesDriver && matchesStatus;
    });
  }, [devices, searchTerm, driverFilter, statusFilter]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize) || 1;
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, currentPage, pageSize]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrives className="w-6 h-6 text-zinc-400" weight="duotone" />
            <span>Target Inventory</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Managed Cisco network nodes configured for automated baseline snapshots and diff audits.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" weight="bold" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Register
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search devices by hostname, IP, or tag..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Driver Filter */}
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

          {/* Status Filter */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="untested">Untested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flat Table Layout */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Device Name</th>
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3">Driver</th>
                <th className="px-5 py-3">Auth Mode</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Probed</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                    <HardDrives className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-300 text-xs">No matching devices</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Try clearing search or filters</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setDriverFilter('ALL');
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-xs text-[#c8ff00] font-bold hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((device: Device) => {
                  const isTesting = testingId === device.deviceId;
                  return (
                    <tr key={device.deviceId} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-zinc-100 flex items-center gap-2">
                          {device.name}
                        </div>
                        {device.tags && device.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {device.tags.map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-300">
                        {device.hostname}:{device.port}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-300">
                        {device.deviceType}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        <span className="capitalize">{device.authType}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            device.status === 'online'
                              ? 'success'
                              : device.status === 'offline'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {device.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {device.lastTestedAt
                          ? new Date(device.lastTestedAt).toLocaleTimeString()
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={isTesting}
                            onClick={() => handleTestConnection(device.deviceId)}
                          >
                            {isTesting ? 'Probing' : 'Test'}
                          </Button>
                          <button
                            onClick={() => handleStartEdit(device)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <PencilSimple className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDevice(device)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
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
            totalItems={filteredDevices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Register Device Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Network Device"
        description="Configure target Cisco router, switch, or firewall for automated verification."
      >
        <form onSubmit={handleCreateDevice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Device Name / Host Label
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CORE-SW-01"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                IP Address or FQDN
              </label>
              <input
                type="text"
                required
                placeholder="10.200.1.1"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">SSH Port</label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Auth Type</label>
              <select
                value={formData.authType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    authType: e.target.value as 'password' | 'key' | 'secret_arn',
                  })
                }
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                <option value="password">Password (KMS Encrypted)</option>
                <option value="key">SSH Private Key</option>
                <option value="secret_arn">Secrets Manager ARN</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Password / Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="Edge, BGP-WAN, DC-East"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Device Modal */}
      {editingDevice && (
        <Modal
          isOpen={Boolean(editingDevice)}
          onClose={() => setEditingDevice(null)}
          title={`Edit Device: ${editingDevice.name}`}
          description="Update endpoint connection parameters and driver configuration."
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Device Name / Host Label
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  IP Address or FQDN
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.hostname}
                  onChange={(e) => setEditFormData({ ...editFormData, hostname: e.target.value })}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">SSH Port</label>
                <input
                  type="number"
                  required
                  value={editFormData.port}
                  onChange={(e) => setEditFormData({ ...editFormData, port: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Auth Type</label>
                <select
                  value={editFormData.authType}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      authType: e.target.value as 'password' | 'key' | 'secret_arn',
                    })
                  }
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value="password">Password (KMS Encrypted)</option>
                  <option value="key">SSH Private Key</option>
                  <option value="secret_arn">Secrets Manager ARN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Password / Secret
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing"
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={editFormData.tags}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingDevice(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDevice && (
        <ConfirmDialog
          isOpen={Boolean(deletingDevice)}
          onClose={() => setDeletingDevice(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${deletingDevice.name}`}
          message={`Delete device "${deletingDevice.name}" (${deletingDevice.hostname})? This action removes all associated SSH credentials and historical records from inventory. This action cannot be undone.`}
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
          message={`Save updates to device "${pendingUpdateData.name}"? Historical snapshot associations will be retained.`}
          confirmText="Update"
          cancelText="Cancel"
          variant="warning"
        />
      )}
    </div>
  );
};
