import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Device, DeviceGroup, DeviceType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { Select } from '../components/common/Select';
import { Checkbox } from '../components/common/Checkbox';
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
  UsersThree,
  FolderPlus,
  Play,
  CaretRight,
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
  const {
    devices,
    deviceGroups,
    addDevice,
    addDevices,
    updateDevice,
    deleteDevice,
    testDeviceConnection,
    addDeviceGroup,
    updateDeviceGroup,
    deleteDeviceGroup,
  } = useAppStore();

  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'devices' | 'groups'>('devices');
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Group management state
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupDriverFilter, setGroupDriverFilter] = useState<string>('ALL');
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(10);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<DeviceGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    description: string;
    deviceIds: string[];
  }>({
    name: '',
    description: '',
    deviceIds: [],
  });

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

      // 1. Live IP Syntax Validator (Optional in bulk import; fallback to Device Name if omitted)
      const ipValidation = ipAddress ? validateIpAddress(ipAddress) : { isValid: true };

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

      if (ipAddress && !ipValidation.isValid) {
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
    if (!formData.name.trim() || !formData.hostname.trim()) return;

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
        hostname: d.ipAddress || d.hostname,
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
    if (!editingDevice || !editFormData.name.trim()) return;

    setPendingUpdateData({
      deviceId: editingDevice.deviceId,
      name: editFormData.name.trim(),
      updates: {
        name: editFormData.name.trim(),
        hostname: editFormData.hostname.trim() || editFormData.name.trim(),
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

  const deviceGroupMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    deviceGroups.forEach((g) => {
      g.deviceIds.forEach((devId) => {
        if (!map[devId]) map[devId] = [];
        map[devId].push(g.name);
      });
    });
    return map;
  }, [deviceGroups]);

  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({ name: '', description: '', deviceIds: [] });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: DeviceGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      deviceIds: [...group.deviceIds],
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;

    if (editingGroup) {
      updateDeviceGroup(editingGroup.groupId, {
        name: groupFormData.name.trim(),
        description: groupFormData.description.trim(),
        deviceIds: groupFormData.deviceIds,
      });
    } else {
      addDeviceGroup({
        name: groupFormData.name.trim(),
        description: groupFormData.description.trim(),
        deviceIds: groupFormData.deviceIds,
      });
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
    setGroupFormData({ name: '', description: '', deviceIds: [] });
  };

  const handleConfirmDeleteGroup = () => {
    if (!deletingGroup) return;
    deleteDeviceGroup(deletingGroup.groupId);
    setDeletingGroup(null);
  };

  const handleToggleDeviceInGroup = (deviceId: string) => {
    setGroupFormData((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter((id) => id !== deviceId)
        : [...prev.deviceIds, deviceId],
    }));
  };

  // Group filtering and pagination for 50-100 registrations
  const filteredGroups = useMemo(() => {
    return deviceGroups.filter((group) => {
      const memberDevices = devices.filter((d) => group.deviceIds.includes(d.deviceId));
      const term = groupSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        group.name.toLowerCase().includes(term) ||
        (group.description || '').toLowerCase().includes(term) ||
        memberDevices.some(
          (d) => d.name.toLowerCase().includes(term) || d.hostname.toLowerCase().includes(term)
        );

      let matchesDriver = true;
      if (groupDriverFilter !== 'ALL') {
        matchesDriver = memberDevices.some((d) => d.deviceType === groupDriverFilter);
      }

      return matchesSearch && matchesDriver;
    });
  }, [deviceGroups, devices, groupSearchTerm, groupDriverFilter]);

  const groupTotalPages = Math.ceil(filteredGroups.length / groupPageSize) || 1;
  const paginatedGroups = useMemo(() => {
    const start = (groupCurrentPage - 1) * groupPageSize;
    return filteredGroups.slice(start, start + groupPageSize);
  }, [filteredGroups, groupCurrentPage, groupPageSize]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrives className="w-6 h-6 text-zinc-400" weight="duotone" />
            <span>Target Inventory</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Managed Cisco network nodes and operational device groups configured for automated baseline snapshots and diff audits.
          </p>
        </div>

        {activeView === 'devices' ? (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" weight="bold" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Register
          </Button>
        ) : (
          <Button
            variant="primary"
            leftIcon={<FolderPlus className="w-4 h-4" weight="bold" />}
            onClick={handleOpenCreateGroup}
          >
            Create Group
          </Button>
        )}
      </div>

      {/* Sub-Tabs: All Devices vs Device Groups */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveView('devices')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'devices'
              ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <HardDrives className={`w-4 h-4 ${activeView === 'devices' ? 'text-[#c8ff00]' : 'text-zinc-400'}`} />
          <span>All Devices</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('groups')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'groups'
              ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <UsersThree className={`w-4 h-4 ${activeView === 'groups' ? 'text-[#c8ff00]' : 'text-zinc-400'}`} />
          <span>Device Groups</span>
        </button>
      </div>

      {activeView === 'devices' ? (
        <div className="space-y-4">
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
              <div className="w-36">
                <Select
                  size="sm"
                  icon={<Funnel className="w-3.5 h-3.5 text-zinc-500" />}
                  value={driverFilter}
                  onChange={(e) => {
                    setDriverFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Drivers</option>
                  {CISCO_DEVICE_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-32">
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="untested">Untested</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Flat Table Layout */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-xs font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3">Device Name</th>
                    <th className="px-5 py-3">Endpoint</th>
                    <th className="px-5 py-3">Driver</th>
                    <th className="px-5 py-3">Auth Mode</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last Probed</th>
                    <th className="px-5 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {paginatedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                        <HardDrives className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-zinc-300 text-sm">No matching devices</p>
                        <p className="text-xs text-zinc-500 mt-1">Try clearing search or filters</p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setDriverFilter('ALL');
                            setStatusFilter('ALL');
                            setCurrentPage(1);
                          }}
                          className="mt-3 text-sm text-[#c8ff00] font-bold hover:underline cursor-pointer"
                        >
                          Reset filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedDevices.map((device: Device) => {
                      return (
                        <tr
                          key={device.deviceId}
                          onClick={() => navigate(`/setup/devices/${device.deviceId}`)}
                          className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-zinc-100 flex items-center gap-2">
                              {device.name}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {deviceGroupMap[device.deviceId]?.map((grpName, gIdx) => (
                                <span
                                  key={`grp-${gIdx}`}
                                  className="px-2 py-0.5 rounded text-xs bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20 font-semibold"
                                >
                                  {grpName}
                                </span>
                              ))}
                              {device.tags &&
                                device.tags.map((tag: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-zinc-300">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {device.hostname}:{device.port}
                              </span>
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
                          <td className="px-5 py-3.5 text-right text-zinc-500 group-hover:text-zinc-200 transition-colors">
                            <CaretRight className="w-4 h-4 ml-auto" />
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
        </div>
      ) : (
        /* Device Groups Enterprise Data Table View */
        <div className="space-y-4">
          {/* Search and Driver Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={groupSearchTerm}
                onChange={(e) => {
                  setGroupSearchTerm(e.target.value);
                  setGroupCurrentPage(1);
                }}
                placeholder="Search groups by name, description, or node hostname..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-44">
                <Select
                  size="sm"
                  icon={<Funnel className="w-3.5 h-3.5 text-zinc-400" />}
                  value={groupDriverFilter}
                  onChange={(e) => {
                    setGroupDriverFilter(e.target.value);
                    setGroupCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Platforms</option>
                  <option value="cisco_xe">Cisco IOS-XE</option>
                  <option value="cisco_xr">Cisco IOS-XR</option>
                  <option value="cisco_nxos">Cisco NX-OS</option>
                  <option value="cisco_ios">Cisco IOS Classic</option>
                  <option value="cisco_asa">Cisco ASA</option>
                </Select>
              </div>

              <span className="text-xs text-zinc-500 font-mono hidden md:inline">
                {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
              </span>
            </div>
          </div>

          {/* Enterprise Table Container */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-xl space-y-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400 font-semibold bg-zinc-950/40">
                    <th className="px-5 py-3.5">Device Group</th>
                    <th className="px-5 py-3.5">Target Nodes</th>
                    <th className="px-5 py-3.5">Platform Composition</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-zinc-400">
                        <UsersThree className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-zinc-300 text-sm">No device groups match your filters</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Try adjusting your search criteria or register a new group.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedGroups.map((group) => {
                      const memberDevices = devices.filter((d) => group.deviceIds.includes(d.deviceId));

                      // Platform driver counts
                      const driverCounts: Record<string, number> = {};
                      memberDevices.forEach((d) => {
                        driverCounts[d.deviceType] = (driverCounts[d.deviceType] || 0) + 1;
                      });

                      return (
                        <tr
                          key={group.groupId}
                          onClick={() => navigate(`/setup/groups/${group.groupId}`)}
                          className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          {/* Group Name & Description */}
                          <td className="px-5 py-3.5 max-w-xs">
                            <div className="font-bold text-zinc-100 flex items-center gap-2">
                              <UsersThree className="w-4 h-4 text-[#c8ff00] shrink-0" />
                              <span className="truncate">{group.name}</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-1 line-clamp-1">
                              {group.description || 'No description provided.'}
                            </div>
                          </td>

                          {/* Target Nodes with member chips */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {group.deviceIds.length} {group.deviceIds.length === 1 ? 'node' : 'nodes'}
                              </span>
                              {memberDevices.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-sm">
                                  {memberDevices.slice(0, 3).map((dev) => (
                                    <span
                                      key={dev.deviceId}
                                      className="px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 font-mono"
                                    >
                                      {dev.name}
                                    </span>
                                  ))}
                                  {memberDevices.length > 3 && (
                                    <span className="px-2 py-0.5 rounded bg-zinc-800/60 text-xs text-zinc-400 font-mono">
                                      +{memberDevices.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Platform Composition */}
                          <td className="px-5 py-3.5">
                            {Object.keys(driverCounts).length === 0 ? (
                              <span className="text-xs text-zinc-500 italic">No nodes</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(driverCounts).map(([driver, count]) => (
                                  <Badge key={driver} variant="outline" size="sm">
                                    {driver.replace('cisco_', '').toUpperCase()} ({count})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">
                            {group.createdAt
                              ? new Date(group.createdAt).toLocaleDateString()
                              : 'System'}
                          </td>

                          {/* Chevron */}
                          <td className="px-5 py-3.5 text-right text-zinc-500 group-hover:text-zinc-200 transition-colors">
                            <CaretRight className="w-4 h-4 ml-auto" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PaginationToolbar */}
            <div className="px-4">
              <PaginationToolbar
                currentPage={groupCurrentPage}
                totalPages={groupTotalPages}
                totalItems={filteredGroups.length}
                pageSize={groupPageSize}
                onPageChange={setGroupCurrentPage}
                onPageSizeChange={setGroupPageSize}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Group Modal */}
      {isGroupModalOpen && (
        <Modal
          isOpen={isGroupModalOpen}
          onClose={() => {
            setIsGroupModalOpen(false);
            setEditingGroup(null);
          }}
          title={editingGroup ? `Edit Group: ${editingGroup.name}` : 'Create Device Group'}
          description="Group infrastructure targets together to execute coordinated parallel baseline captures."
        >
          <form onSubmit={handleSaveGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Group Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Core Backbone, DC Leaf Switches"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
              <input
                type="text"
                placeholder="Optional purpose, topology tier, or maintenance scope"
                value={groupFormData.description}
                onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Select Member Devices ({groupFormData.deviceIds.length} of {devices.length} selected)
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupFormData({ ...groupFormData, deviceIds: devices.map((d) => d.deviceId) })
                    }
                    className="text-[#c8ff00] hover:underline cursor-pointer font-semibold"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => setGroupFormData({ ...groupFormData, deviceIds: [] })}
                    className="text-zinc-400 hover:text-zinc-200 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 divide-y divide-zinc-850">
                {devices.map((device) => {
                  const isChecked = groupFormData.deviceIds.includes(device.deviceId);
                  return (
                    <label
                      key={device.deviceId}
                      className="flex items-center justify-between p-2 hover:bg-zinc-900/60 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleDeviceInGroup(device.deviceId)}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-200 truncate">{device.name}</div>
                        </div>
                      </div>
                      <Badge variant="default" size="sm">
                        {device.deviceType}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setEditingGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Group Confirmation Dialog */}
      {deletingGroup && (
        <ConfirmDialog
          isOpen={Boolean(deletingGroup)}
          onClose={() => setDeletingGroup(null)}
          onConfirm={handleConfirmDeleteGroup}
          title={`Delete Group: ${deletingGroup.name}`}
          message={`Delete device group "${deletingGroup.name}"? Member devices will remain in the inventory.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

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
                  Device Name
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
                    placeholder="e.g. 192.168.1.1 or router.corp.internal"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <Select
                    label="Device Driver"
                    size="sm"
                    value={formData.deviceType}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceType: e.target.value as DeviceType })
                    }
                  >
                    {CISCO_DEVICE_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
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
                  <Select
                    label="Connection Type"
                    size="sm"
                    value={formData.connectionType}
                    onChange={(e) =>
                      handleConnectionTypeChange(e.target.value as 'ssh' | 'telnet')
                    }
                  >
                    <option value="ssh">SSH (Port 22 default)</option>
                    <option value="telnet">Telnet (Port 23 default)</option>
                  </Select>
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
                  <div className="font-mono text-xs text-[#c8ff00] font-bold">
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
                  <span className="text-xs text-zinc-400 font-mono">
                    Supported: cisco_xe, cisco_ios, cisco_nxos, cisco_xr, cisco_asa | ssh, telnet
                  </span>
                </div>

                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/95 text-zinc-400 uppercase font-mono text-xs font-semibold border-b border-zinc-800 sticky top-0">
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
                                <span className={d.isConnValid ? 'text-zinc-300 font-mono text-xs' : 'text-rose-400 font-mono text-xs'}>
                                  {d.connectionType || '—'}
                                </span>
                                {d.isConnValid ? (
                                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-[#c8ff00]/10 text-[#c8ff00] font-mono border border-[#c8ff00]/20 font-bold">
                                    {d.normalizedConnType?.toUpperCase()} ({d.resolvedPort})
                                  </span>
                                ) : (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-sans border border-rose-500/30"
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
                                <span className="inline-flex items-center gap-1 text-xs text-[#c8ff00] font-semibold">
                                  <CheckCircle className="w-4 h-4" weight="fill" />
                                  Ready
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-xs text-rose-400 font-semibold"
                                  title={d.validationSummary}
                                >
                                  <Warning className="w-4 h-4" weight="fill" />
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
                Device Name
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
                  placeholder="e.g. 192.168.1.1 or router.corp.internal"
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
                <Select
                  label="Device Driver"
                  size="sm"
                  value={editFormData.deviceType}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, deviceType: e.target.value as DeviceType })
                  }
                >
                  {CISCO_DEVICE_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Select
                  label="Auth Type"
                  size="sm"
                  value={editFormData.authType}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      authType: e.target.value as 'password' | 'key' | 'secret_arn',
                    })
                  }
                >
                  <option value="password">Password (Encrypted)</option>
                  <option value="key">SSH Private Key</option>
                  <option value="secret_arn">Secret Vault Reference</option>
                </Select>
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

      {/* Delete Group Confirmation Dialog */}
      {deletingGroup && (
        <ConfirmDialog
          isOpen={Boolean(deletingGroup)}
          onClose={() => setDeletingGroup(null)}
          onConfirm={handleConfirmDeleteGroup}
          title={`Delete ${deletingGroup.name}`}
          message={`Delete device group "${deletingGroup.name}"? Target member devices will remain in the inventory, but this grouping definition will be permanently removed.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
