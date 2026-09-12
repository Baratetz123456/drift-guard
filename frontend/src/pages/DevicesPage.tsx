import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Device, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { CISCO_DEVICE_PLATFORMS } from '../utils/ciscoSyntaxValidator';
import { validateIpAddress, validateDeviceType, validateConnectionType } from '../utils/networkValidator';
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
  FileArrowUp,
  Warning,
  CheckCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';

interface ParsedBulkDevice {
  rawLineNumber: number;
  hostname: string;
  ipAddress: string;
  deviceType: string;
  normalizedDriver: DeviceType | null;
  driverLabel?: string;
  username: string;
  password: string;
  connectionType: string;
  normalizedConnType: 'ssh' | 'telnet' | null;
  resolvedPort: number;
  isIpValid: boolean;
  ipError?: string;
  ipVersion?: string;
  isDriverValid: boolean;
  driverError?: string;
  isConnValid: boolean;
  connError?: string;
  isValid: boolean;
  validationSummary: string;
}

const SAMPLE_CSV = `# hostname, ip address, device type, username, password, connection type
CORE-SW-01, 10.200.1.1, cisco_xe, admin, Cisco123!, ssh
BORDER-RTR-02, 10.200.1.254, cisco_xr, netops, TransitPass99, ssh
DIST-LEAF-03, 10.200.2.15, cisco_nxos, admin, LeafSecure42, ssh
LEGACY-SW-04, 192.168.100.1, cisco_ios, operator, TelnetLabPass, telnet
SEC-FW-05, 10.200.3.1, cisco_asa, secadmin, AsaShield88, ssh`;

export const DevicesPage: React.FC = () => {
  const { devices, addDevice, addDevices, updateDevice, deleteDevice, testDeviceConnection } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState<'single' | 'bulk'>('single');
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Bulk import state
  const [bulkText, setBulkText] = useState(SAMPLE_CSV);

  // Delete confirmation state
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  // Update confirmation state
  const [pendingUpdateData, setPendingUpdateData] = useState<{
    deviceId: string;
    name: string;
    updates: Partial<Device>;
  } | null>(null);

  // Single form state
  const [formData, setFormData] = useState<{
    name: string;
    hostname: string;
    port: number;
    deviceType: DeviceType;
    username: string;
    password: string;
    connectionType: 'ssh' | 'telnet';
  }>({
    name: '',
    hostname: '',
    port: 22,
    deviceType: 'cisco_xe',
    username: 'admin',
    password: '',
    connectionType: 'ssh',
  });
  const [showPassword, setShowPassword] = useState(false);

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

  const handleConnectionTypeChange = (type: 'ssh' | 'telnet') => {
    setFormData((prev) => ({
      ...prev,
      connectionType: type,
      port: type === 'ssh' ? 22 : 23,
    }));
  };

  // Parse bulk input matching exact headers: hostname, ip address, device type, username, password, connection type
  const parsedBulkDevices = useMemo<ParsedBulkDevice[]>(() => {
    const rawLines = bulkText.split('\n');

    const parsed: ParsedBulkDevice[] = [];

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const parts = trimmed.split(',').map((p) => p.trim());
      const hostname = parts[0] || '';
      const ipAddress = parts[1] || '';
      const deviceType = parts[2] || '';
      const username = parts[3] || '';
      const password = parts[4] || '';
      const rawConnectionType = parts[5] || '';

      // 1. Live IP Syntax Validator
      const ipValidation = validateIpAddress(ipAddress);

      // 2. Live Device Type Availability Validator
      const driverValidation = validateDeviceType(deviceType);

      // 3. Live Connection Type Validator (ssh vs telnet)
      const connValidation = validateConnectionType(rawConnectionType);

      // Determine overall validity
      let isValid = true;
      const errors: string[] = [];

      if (!hostname) {
        isValid = false;
        errors.push('Missing hostname');
      }

      if (!ipValidation.isValid) {
        isValid = false;
        errors.push(ipValidation.error || 'Invalid IP syntax');
      }

      if (!driverValidation.isValid) {
        isValid = false;
        errors.push(driverValidation.error || 'Unsupported device type');
      }

      if (!username) {
        isValid = false;
        errors.push('Missing username');
      }

      if (!password) {
        isValid = false;
        errors.push('Missing password');
      }

      if (!connValidation.isValid) {
        isValid = false;
        errors.push(connValidation.error || 'Invalid connection type');
      }

      parsed.push({
        rawLineNumber: idx + 1,
        hostname,
        ipAddress,
        deviceType,
        normalizedDriver: driverValidation.deviceType,
        driverLabel: driverValidation.label,
        username,
        password,
        connectionType: rawConnectionType,
        normalizedConnType: connValidation.connectionType,
        resolvedPort: connValidation.defaultPort,
        isIpValid: ipValidation.isValid,
        ipError: ipValidation.error,
        ipVersion: ipValidation.version,
        isDriverValid: driverValidation.isValid,
        driverError: driverValidation.error,
        isConnValid: connValidation.isValid,
        connError: connValidation.error,
        isValid,
        validationSummary: errors.length > 0 ? errors.join(' • ') : 'Verified',
      });
    });

    return parsed;
  }, [bulkText]);

  const validBulkCount = parsedBulkDevices.filter((d) => d.isValid).length;

  const handleTestConnection = async (deviceId: string) => {
    setTestingId(deviceId);
    try {
      await testDeviceConnection(deviceId);
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateSingleDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.hostname) return;

    addDevice({
      name: formData.name.trim(),
      hostname: formData.hostname.trim(),
      port: formData.port,
      deviceType: formData.deviceType,
      authType: 'password',
      username: formData.username.trim(),
      password: formData.password,
      connectionType: formData.connectionType,
      status: 'untested',
      tags: [],
    });

    setIsAddModalOpen(false);
    setFormData({
      name: '',
      hostname: '',
      port: 22,
      deviceType: 'cisco_xe',
      username: 'admin',
      password: '',
      connectionType: 'ssh',
    });
    setShowPassword(false);
  };

  const handleCreateBulkDevices = () => {
    const validItems = parsedBulkDevices.filter(
      (d) => d.isValid && d.normalizedDriver && d.normalizedConnType
    );
    if (validItems.length === 0) return;

    addDevices(
      validItems.map((d) => ({
        name: d.hostname,
        hostname: d.ipAddress,
        port: d.resolvedPort,
        deviceType: d.normalizedDriver as DeviceType,
        authType: 'password',
        username: d.username,
        password: d.password,
        connectionType: d.normalizedConnType as 'ssh' | 'telnet',
        status: 'untested',
        tags: [],
      }))
    );

    setIsAddModalOpen(false);
    setBulkText(SAMPLE_CSV);
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
                        <div className="flex items-center gap-1.5">
                          <span>{device.hostname}:{device.port}</span>
                          {device.connectionType && (
                            <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono font-semibold">
                              {device.connectionType}
                            </span>
                          )}
                        </div>
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

      {/* Register Device Modal with Single and Bulk Tabs */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Network Device"
        description="Configure single or multiple Cisco routers, switches, or firewalls for automated verification."
        maxWidth={registerMode === 'bulk' ? '4xl' : 'lg'}
      >
        <div className="space-y-4 font-sans">
          {/* Tabs Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setRegisterMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                registerMode === 'single'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Single Device
            </button>
            <button
              type="button"
              onClick={() => setRegisterMode('bulk')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                registerMode === 'bulk'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileArrowUp className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>
          </div>

          {registerMode === 'single' ? (
            <form onSubmit={handleCreateSingleDevice} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Password / Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter device password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-3.5 pr-9 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeSlash className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Connection Type
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) =>
                      handleConnectionTypeChange(e.target.value as 'ssh' | 'telnet')
                    }
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="ssh">SSH (Port 22 default)</option>
                    <option value="telnet">Telnet (Port 23 default)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Port (Derived / Custom)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) || 22 })}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
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
          ) : (
            <div className="space-y-4">
              {/* Exact Headers Instruction & Format Bar */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-300">
                    Required CSV Headers Format:
                  </div>
                  <div className="font-mono text-[11px] text-[#c8ff00] font-bold">
                    hostname, ip address, device type, username, password, connection type
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkText(SAMPLE_CSV)}
                  className="text-xs text-[#c8ff00] font-semibold hover:underline cursor-pointer"
                >
                  Insert template
                </button>
              </div>

              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="CORE-SW-01, 10.200.1.1, cisco_xe, admin, Cisco123!, ssh"
                className="w-full font-mono text-xs px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />

              {/* Live Preview Table Matching Exact Headers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">
                    Live Batch Preview ({validBulkCount} of {parsedBulkDevices.length} ready)
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Supported: cisco_xe, cisco_ios, cisco_nxos, cisco_xr, cisco_asa | ssh, telnet
                  </span>
                </div>

                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/95 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">Hostname</th>
                        <th className="px-3 py-2.5">IP Address</th>
                        <th className="px-3 py-2.5">Device Type</th>
                        <th className="px-3 py-2.5">Username</th>
                        <th className="px-3 py-2.5">Password</th>
                        <th className="px-3 py-2.5">Connection Type</th>
                        <th className="px-3 py-2.5 text-right">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {parsedBulkDevices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                            No devices parsed. Enter CSV lines above.
                          </td>
                        </tr>
                      ) : (
                        parsedBulkDevices.map((d, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                            {/* 1. Hostname */}
                            <td className="px-3 py-2 font-bold text-zinc-200">
                              {d.hostname || <span className="text-rose-400 italic">Empty</span>}
                            </td>

                            {/* 2. IP Address with Live IP Syntax Validator */}
                            <td className="px-3 py-2 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className={d.isIpValid ? 'text-zinc-200' : 'text-rose-400 font-bold'}>
                                  {d.ipAddress || '—'}
                                </span>
                                {d.isIpValid ? (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] font-mono border border-[#c8ff00]/20">
                                    {d.ipVersion}
                                  </span>
                                ) : (
                                  <span
                                    className="text-[9px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono border border-rose-500/30"
                                    title={d.ipError}
                                  >
                                    Malformed
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. Device Type with Live Availability Validator */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className={d.isDriverValid ? 'text-zinc-300 font-mono' : 'text-rose-400 font-mono'}>
                                  {d.deviceType || '—'}
                                </span>
                                {d.isDriverValid ? (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] font-sans border border-[#c8ff00]/20">
                                    Available
                                  </span>
                                ) : (
                                  <span
                                    className="text-[9px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 font-sans border border-rose-500/30"
                                    title={d.driverError}
                                  >
                                    Unavailable
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 4. Username */}
                            <td className="px-3 py-2 font-mono text-zinc-300">
                              {d.username || <span className="text-rose-400 italic">Missing</span>}
                            </td>

                            {/* 5. Password (shown in plain text as requested) */}
                            <td className="px-3 py-2 font-mono text-zinc-300">
                              {d.password || <span className="text-rose-400 italic">Missing</span>}
                            </td>

                            {/* 6. Connection Type with Live Protocol & Port Badge */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className={d.isConnValid ? 'text-zinc-300 font-mono text-[11px]' : 'text-rose-400 font-mono text-[11px]'}>
                                  {d.connectionType || '—'}
                                </span>
                                {d.isConnValid ? (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] font-mono border border-[#c8ff00]/20 font-bold">
                                    {d.normalizedConnType?.toUpperCase()} ({d.resolvedPort})
                                  </span>
                                ) : (
                                  <span
                                    className="text-[9px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 font-sans border border-rose-500/30"
                                    title={d.connError}
                                  >
                                    Invalid
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Row Validation Status */}
                            <td className="px-3 py-2 text-right">
                              {d.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#c8ff00] font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" weight="fill" />
                                  Ready
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold"
                                  title={d.validationSummary}
                                >
                                  <Warning className="w-3.5 h-3.5" weight="fill" />
                                  Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Ready to register {validBulkCount} devices into inventory
                </span>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={validBulkCount === 0}
                    onClick={handleCreateBulkDevices}
                  >
                    Register
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
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
                  <option value="password">Password (Encrypted)</option>
                  <option value="key">SSH Private Key</option>
                  <option value="secret_arn">Secret Vault Reference</option>
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
