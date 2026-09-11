import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Device, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import {
  HardDrives,
  Plus,
  MagnifyingGlass,
  WifiHigh,
  WifiSlash,
  Trash,
  Tag,
  Key,
  Funnel,
} from '@phosphor-icons/react';

export const DevicesPage: React.FC = () => {
  const { devices, addDevice, deleteDevice, testDeviceConnection } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

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
      name: formData.name,
      hostname: formData.hostname,
      port: Number(formData.port),
      deviceType: formData.deviceType,
      authType: formData.authType,
      username: formData.username,
      status: 'untested',
      tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    });

    setIsAddModalOpen(false);
    setFormData({
      name: '',
      hostname: '',
      port: 22,
      deviceType: 'cisco_xe',
      authType: 'password',
      username: 'admin',
      tags: '',
    });
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((d: Device) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.hostname.includes(searchTerm) ||
        d.tags?.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDriver = driverFilter === 'ALL' || d.deviceType === driverFilter;
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

      return matchesSearch && matchesDriver && matchesStatus;
    });
  }, [devices, searchTerm, driverFilter, statusFilter]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize);
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, currentPage, pageSize]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrives className="w-6 h-6 text-zinc-400" weight="duotone" />
            <span>Devices</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cisco switch and router inventory, SSH parameters, and real-time connectivity status.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search hostname, IP address, or tags..."
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

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400">
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

      {/* Flat Data Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Device Name</th>
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3">Driver</th>
                <th className="px-5 py-3">Auth</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Probed</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 italic">
                    No devices match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((device: Device) => {
                  const isTesting = testingId === device.deviceId;
                  return (
                    <tr key={device.deviceId} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-zinc-100">{device.name}</div>
                        {device.tags && device.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {device.tags.map((t: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-300">
                        {device.hostname}:{device.port}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400">
                        {device.deviceType}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {device.authType} ({device.username})
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
                            onClick={() => deleteDevice(device.deviceId)}
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

        {/* Pagination Toolbar */}
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

      {/* Add Device Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Device"
        description="Configure target credentials for automated Netmiko SSH collection."
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
                <option value="cisco_xe">Cisco IOS-XE</option>
                <option value="cisco_ios">Cisco Classic IOS</option>
                <option value="cisco_xr">Cisco IOS-XR</option>
                <option value="cisco_nxos">Cisco NX-OS</option>
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
    </div>
  );
};
