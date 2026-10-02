import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Device } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Checkbox } from '../components/common/Checkbox';
import {
  UsersThree,
  ArrowLeft,
  CaretRight,
  Plus,
  Trash,
  Play,
  MagnifyingGlass,
  CheckCircle,
  HardDrives,
  MinusCircle,
} from '@phosphor-icons/react';

export const DeviceGroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { devices, deviceGroups, updateDeviceGroup, deleteDeviceGroup } = useAppStore();

  const group = deviceGroups.find((g) => g.groupId === groupId);

  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Add Nodes Modal state
  const [isAddNodesModalOpen, setIsAddNodesModalOpen] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [selectedToAddDeviceIds, setSelectedToAddDeviceIds] = useState<string[]>([]);

  // Member devices
  const memberDevices = useMemo(() => {
    if (!group) return [];
    return devices.filter((d) => group.deviceIds.includes(d.deviceId));
  }, [group, devices]);

  // Filtered member devices inside group
  const filteredMemberDevices = useMemo(() => {
    const term = memberSearchTerm.toLowerCase().trim();
    if (!term) return memberDevices;
    return memberDevices.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.hostname.toLowerCase().includes(term) ||
        d.deviceType.toLowerCase().includes(term)
    );
  }, [memberDevices, memberSearchTerm]);

  // Devices available to add to group
  const availableDevices = useMemo(() => {
    if (!group) return [];
    return devices.filter((d) => !group.deviceIds.includes(d.deviceId));
  }, [group, devices]);

  // Filtered available devices for modal
  const filteredAvailableDevices = useMemo(() => {
    const term = addSearchTerm.toLowerCase().trim();
    if (!term) return availableDevices;
    return availableDevices.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.hostname.toLowerCase().includes(term) ||
        d.deviceType.toLowerCase().includes(term)
    );
  }, [availableDevices, addSearchTerm]);

  if (!group) {
    return (
      <div className="space-y-6 font-sans">
        <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <UsersThree className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">Device Group Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">The requested group cluster does not exist or was deleted.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/setup?tab=groups')}
            className="mt-4"
          >
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveGroupInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateDeviceGroup(group.groupId, {
      name: name.trim(),
      description: description.trim(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRemoveNode = (deviceId: string) => {
    const updatedIds = group.deviceIds.filter((id) => id !== deviceId);
    updateDeviceGroup(group.groupId, { deviceIds: updatedIds });
  };

  const handleOpenAddNodesModal = () => {
    setSelectedToAddDeviceIds([]);
    setAddSearchTerm('');
    setIsAddNodesModalOpen(true);
  };

  const handleConfirmAddNodes = () => {
    if (selectedToAddDeviceIds.length === 0) return;
    const mergedIds = Array.from(new Set([...group.deviceIds, ...selectedToAddDeviceIds]));
    updateDeviceGroup(group.groupId, { deviceIds: mergedIds });
    setIsAddNodesModalOpen(false);
  };

  const handleConfirmDelete = () => {
    deleteDeviceGroup(group.groupId);
    navigate('/setup?tab=groups');
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          to="/setup?tab=groups"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <UsersThree className="w-3.5 h-3.5" />
          <span>Device Groups</span>
        </Link>
        <CaretRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-100 font-bold">{group.name}</span>
      </div>

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{group.name}</h1>
          </div>
          <p className="text-xs text-zinc-400">
            {group.description || 'No description configured for this device group cluster.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Play className="w-4 h-4" weight="fill" />}
            onClick={() => navigate(`/collect?groupId=${group.groupId}`)}
          >
            Run collection
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            leftIcon={<Trash className="w-4 h-4" />}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete Group
          </Button>
        </div>
      </div>

      {/* Group Configuration Card */}
      <Card className="p-6 border-zinc-800 bg-zinc-900/60 shadow-xl space-y-4">
        <form onSubmit={handleSaveGroupInfo} className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <UsersThree className="w-4 h-4 text-[#c8ff00]" />
              <span>Group Profile Details</span>
            </h3>
            {isSaved && (
              <span className="text-xs text-[#c8ff00] font-semibold flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="w-4 h-4" weight="fill" />
                <span>Group updated</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="Operational purpose of this group..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="secondary" size="sm">
              Update Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Member Nodes Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2">
              <HardDrives className="w-4 h-4 text-zinc-400" weight="duotone" />
              <span>Member Nodes ({memberDevices.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Network infrastructure nodes participating in parallel snapshot dispatches for this group.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Filter group nodes..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAddNodesModal}
            >
              Add Nodes
            </Button>
          </div>
        </div>

        {/* Member Nodes Table */}
        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 text-zinc-400 font-semibold bg-zinc-950/40 text-xs">
                  <th className="px-5 py-3.5">Node Name</th>
                  <th className="px-5 py-3.5">Endpoint</th>
                  <th className="px-5 py-3.5">Driver</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Probed</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredMemberDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                      <HardDrives className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="font-semibold text-zinc-300 text-sm">No member nodes found</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {memberDevices.length === 0
                          ? 'Click "Add Nodes" to assign network devices to this group.'
                          : 'No nodes match your search query.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMemberDevices.map((dev) => (
                    <tr key={dev.deviceId} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-zinc-200">
                        <Link
                          to={`/setup/devices/${dev.deviceId}`}
                          className="hover:text-[#c8ff00] transition-colors"
                        >
                          {dev.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400">
                        {dev.hostname}:{dev.port}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" size="sm">
                          {dev.deviceType.replace('cisco_', '').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            dev.status === 'online'
                              ? 'success'
                              : dev.status === 'offline'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {dev.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">
                        {dev.lastTestedAt
                          ? new Date(dev.lastTestedAt).toLocaleTimeString()
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveNode(dev.deviceId)}
                          className="text-sm text-zinc-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
                          title="Remove from group"
                        >
                          <MinusCircle className="w-4 h-4 text-rose-400" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Nodes Modal */}
      {isAddNodesModalOpen && (
        <Modal
          isOpen={isAddNodesModalOpen}
          onClose={() => setIsAddNodesModalOpen(false)}
          title={`Assign Member Nodes to ${group.name}`}
          description="Select available network devices to assign to this maintenance group cluster."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={addSearchTerm}
                  onChange={(e) => setAddSearchTerm(e.target.value)}
                  placeholder="Search candidate nodes by name or IP..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedToAddDeviceIds.length === filteredAvailableDevices.length) {
                    setSelectedToAddDeviceIds([]);
                  } else {
                    setSelectedToAddDeviceIds(filteredAvailableDevices.map((d) => d.deviceId));
                  }
                }}
                className="text-xs text-[#c8ff00] font-semibold hover:underline cursor-pointer shrink-0"
              >
                {selectedToAddDeviceIds.length === filteredAvailableDevices.length
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            </div>

            <div className="border border-zinc-800 rounded-xl bg-zinc-950 max-h-60 overflow-y-auto divide-y divide-zinc-800/60">
              {filteredAvailableDevices.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 italic">
                  All available registered devices are already members of this group.
                </div>
              ) : (
                filteredAvailableDevices.map((dev) => {
                  const isChecked = selectedToAddDeviceIds.includes(dev.deviceId);
                  return (
                    <label
                      key={dev.deviceId}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/50 cursor-pointer text-sm transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => {
                            setSelectedToAddDeviceIds((prev) =>
                              prev.includes(dev.deviceId)
                                ? prev.filter((id) => id !== dev.deviceId)
                                : [...prev, dev.deviceId]
                            );
                          }}
                        />
                        <span className="font-bold text-zinc-200">{dev.name}</span>
                        <span className="text-zinc-400 font-mono text-xs">({dev.hostname})</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        {dev.deviceType.replace('cisco_', '').toUpperCase()}
                      </Badge>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className="text-xs text-zinc-400">
                {selectedToAddDeviceIds.length} device{selectedToAddDeviceIds.length === 1 ? '' : 's'} selected
              </span>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddNodesModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={selectedToAddDeviceIds.length === 0}
                  onClick={handleConfirmAddNodes}
                >
                  Add Selected Nodes
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Group Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${group.name}`}
          message={`Delete device group "${group.name}"? Member devices will not be removed from inventory, but this group clustering definition will be permanently deleted.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
