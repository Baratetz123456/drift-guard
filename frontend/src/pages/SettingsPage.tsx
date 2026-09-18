import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { detectUserTimezoneAndRegion } from '../utils/geoDetection';
import { ConfiguredAIModel } from '../types';
import {
  Gear,
  Key,
  ShieldCheck,
  Sliders,
  Cpu,
  FloppyDisk,
  Eye,
  EyeSlash,
  User,
  CheckCircle,
  XCircle,
  CircleNotch,
  Sparkle,
  Plus,
  Trash,
  X,
  PencilSimple,
} from '@phosphor-icons/react';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    user,
    aiModels,
    addAIModel,
    updateAIModel,
    deleteAIModel,
    setActiveAIModel,
    testAIModel,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'ssh' | 'diff' | 'account'>('ai');
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const geoInfo = useMemo(() => detectUserTimezoneAndRegion(), []);

  // Model Testing State
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs?: number; message?: string }>
  >({});

  // Add Model Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [newApiKey, setNewApiKey] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [isTestingNew, setIsTestingNew] = useState(false);
  const [newTestResult, setNewTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  // Edit Model Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ConfiguredAIModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editModelId, setEditModelId] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [showEditKey, setShowEditKey] = useState(false);
  const [isTestingEdit, setIsTestingEdit] = useState(false);
  const [editTestResult, setEditTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  // Confirmation Dialog States
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<ConfiguredAIModel | null>(null);
  const [isConfirmingUpdate, setIsConfirmingUpdate] = useState(false);
  const [pendingModelUpdate, setPendingModelUpdate] = useState<{
    id: string;
    name: string;
    modelIdentifier: string;
    baseUrl: string;
    apiKey?: string;
  } | null>(null);

  // SSH Tab state
  const [timeout, setTimeoutVal] = useState(settings.defaultTimeoutSeconds || 30);

  // Diff & Safety Tab state
  const [maskSecrets, setMaskSecrets] = useState(settings.maskSecretsInDiffs);
  const [normalizeCounters, setNormalizeCounters] = useState(settings.normalizeDynamicCounters);

  const activeModel = aiModels.find((m) => m.isActive) || aiModels[0];

  const handleTestModel = async (id: string) => {
    setTestingModelId(id);
    try {
      const res = await testAIModel(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: res.success, latencyMs: res.latencyMs, message: res.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, latencyMs: 0, message: err.message || 'Connection test failed' },
      }));
    } finally {
      setTestingModelId(null);
    }
  };

  const handleTestNewModel = async () => {
    if (!newModelId.trim() || !newApiKey.trim()) return;
    setIsTestingNew(true);
    setNewTestResult(null);
    try {
      const { testAiConnection } = useAppStore.getState();
      const res = await testAiConnection(newModelId.trim(), newApiKey.trim(), newBaseUrl.trim() || undefined);
      setNewTestResult(res);
    } catch (err: any) {
      setNewTestResult({
        success: false,
        latencyMs: 0,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTestingNew(false);
    }
  };

  const handleSaveNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newModelId.trim() || !newApiKey.trim()) return;

    addAIModel({
      name: newName.trim(),
      modelIdentifier: newModelId.trim(),
      baseUrl: newBaseUrl.trim() || 'https://openrouter.ai/api/v1',
      apiKey: newApiKey.trim(),
      isActive: aiModels.length === 0,
      status: newTestResult?.success ? 'online' : 'untested',
      latencyMs: newTestResult?.latencyMs,
    });

    // Reset form
    setNewName('');
    setNewModelId('');
    setNewBaseUrl('https://openrouter.ai/api/v1');
    setNewApiKey('');
    setNewTestResult(null);
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (m: ConfiguredAIModel) => {
    if (m.isDefault) return;
    setEditingModel(m);
    setEditName(m.name);
    setEditModelId(m.modelIdentifier);
    setEditBaseUrl(m.baseUrl || 'https://openrouter.ai/api/v1');
    setEditApiKey('');
    setEditTestResult(null);
    setIsEditModalOpen(true);
  };

  const handleTestEditModel = async () => {
    if (!editModelId.trim()) return;
    setIsTestingEdit(true);
    setEditTestResult(null);
    try {
      const { testAiConnection } = useAppStore.getState();
      const apiKeyToTest = editApiKey.trim() || editingModel?.apiKey || '';
      const res = await testAiConnection(editModelId.trim(), apiKeyToTest, editBaseUrl.trim() || undefined);
      setEditTestResult(res);
    } catch (err: any) {
      setEditTestResult({
        success: false,
        latencyMs: 0,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTestingEdit(false);
    }
  };

  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !editName.trim() || !editModelId.trim()) return;

    setPendingModelUpdate({
      id: editingModel.id,
      name: editName.trim(),
      modelIdentifier: editModelId.trim(),
      baseUrl: editBaseUrl.trim() || 'https://openrouter.ai/api/v1',
      ...(editApiKey.trim() ? { apiKey: editApiKey.trim() } : {}),
    });
    setIsConfirmingUpdate(true);
  };

  const handleConfirmModelUpdate = () => {
    if (pendingModelUpdate) {
      updateAIModel(pendingModelUpdate.id, pendingModelUpdate);
      setIsConfirmingUpdate(false);
      setIsEditModalOpen(false);
      setPendingModelUpdate(null);
      setEditingModel(null);
    }
  };

  const handleDeleteClick = (m: ConfiguredAIModel) => {
    if (m.isDefault) return;
    setModelToDelete(m);
    setIsConfirmingDelete(true);
  };

  const handleConfirmModelDelete = () => {
    if (modelToDelete) {
      deleteAIModel(modelToDelete.id);
      setIsConfirmingDelete(false);
      setModelToDelete(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmingSave(true);
  };

  const handleConfirmSave = () => {
    updateSettings({
      defaultTimeoutSeconds: Number(timeout),
      maskSecretsInDiffs: maskSecrets,
      normalizeDynamicCounters: normalizeCounters,
    });
    setIsConfirmingSave(false);
  };

  const tabs = [
    { id: 'ai', label: 'AI Model', icon: Cpu },
    { id: 'ssh', label: 'SSH & Transport', icon: Sliders },
    { id: 'diff', label: 'Diff & Safety', icon: ShieldCheck },
    { id: 'account', label: 'Account', icon: User },
  ] as const;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Gear className="w-6 h-6 text-zinc-400" weight="duotone" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage AI inference providers, multi-model routing, network transport timeouts, and sanitization policies.
        </p>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#c8ff00]' : 'text-zinc-400'}`} weight={isActive ? 'bold' : 'regular'} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* TAB 1: AI Model Registry */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Active Model Showcase Banner */}
            {activeModel && (
              <div className="p-4 rounded-xl border border-[#c8ff00]/40 bg-zinc-900/90 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center shrink-0">
                    <Sparkle className="w-5 h-5 text-[#c8ff00]" weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#c8ff00] text-zinc-950">
                        Active model
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        {activeModel.isDefault ? 'DriftGuard AI Model' : activeModel.name}
                      </h3>
                      {activeModel.isDefault && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#c8ff00]">
                          Built-in engine
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono mt-1 flex items-center gap-2">
                      {activeModel.isDefault ? (
                        <span>Embedded drift detection engine</span>
                      ) : (
                        <>
                          <span>{activeModel.modelIdentifier}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs">{activeModel.baseUrl || 'https://openrouter.ai/api/v1'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={testingModelId === activeModel.id}
                    leftIcon={
                      testingModelId === activeModel.id ? (
                        <CircleNotch className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
                      ) : (
                        <Sparkle className="w-3.5 h-3.5 text-[#c8ff00]" weight="fill" />
                      )
                    }
                    onClick={() => handleTestModel(activeModel.id)}
                  >
                    {testingModelId === activeModel.id ? 'Testing...' : 'Test connection'}
                  </Button>

                  {/* Status Indicator */}
                  {testResults[activeModel.id] ? (
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                        testResults[activeModel.id].success
                          ? 'border-[#c8ff00]/40 bg-[#c8ff00]/10 text-[#c8ff00]'
                          : 'border-rose-900/60 bg-rose-950/40 text-rose-300'
                      }`}
                    >
                      {testResults[activeModel.id].success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="fill" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" weight="fill" />
                      )}
                      <span>
                        {testResults[activeModel.id].success
                          ? `${testResults[activeModel.id].latencyMs}ms`
                          : 'Failed'}
                      </span>
                    </div>
                  ) : activeModel.status === 'online' ? (
                    <div className="px-2.5 py-1 rounded-lg border border-[#c8ff00]/30 bg-[#c8ff00]/10 text-[#c8ff00] text-xs font-mono flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="fill" />
                      <span>{activeModel.latencyMs ? `${activeModel.latencyMs}ms` : 'Ready'}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Model Registry List & Management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Configured AI Models</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Manage available inference models and select which model executes comparison diff analysis.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" weight="bold" />}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add model
                </Button>
              </div>

              {/* Models Table / List */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden divide-y divide-zinc-800/80">
                {aiModels.map((m) => {
                  const isCurrentActive = m.isActive;
                  const isTestingThis = testingModelId === m.id;
                  const testRes = testResults[m.id];
                  const status = testRes
                    ? testRes.success
                      ? 'online'
                      : 'offline'
                    : m.status || 'untested';
                  const latency = testRes?.latencyMs ?? m.latencyMs;

                  return (
                    <div
                      key={m.id}
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isCurrentActive ? 'bg-zinc-900/60' : 'hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          title={isCurrentActive ? 'Active model' : 'Set as active model'}
                          onClick={() => setActiveAIModel(m.id)}
                          className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                            isCurrentActive
                              ? 'border-[#c8ff00] bg-[#c8ff00] shadow-[0_0_8px_rgba(200,255,0,0.4)]'
                              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                          }`}
                        >
                          {isCurrentActive && <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-zinc-100">
                              {m.isDefault ? 'DriftGuard AI Model' : m.name}
                            </span>
                            {isCurrentActive && (
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30 font-bold">
                                ACTIVE
                              </span>
                            )}
                            {m.isDefault && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-[#c8ff00] border border-zinc-700">
                                Built-in engine
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                            {m.isDefault ? (
                              <span className="text-zinc-400">Embedded drift detection engine</span>
                            ) : (
                              <>
                                <span className="text-sky-400">{m.modelIdentifier}</span>
                                <span>•</span>
                                <span className="truncate max-w-xs">{m.baseUrl || 'https://openrouter.ai/api/v1'}</span>
                                {m.apiKeyPreview && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-500">Key: {m.apiKeyPreview}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {/* Status Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                            status === 'online'
                              ? 'border-[#c8ff00]/40 bg-[#c8ff00]/10 text-[#c8ff00]'
                              : status === 'offline'
                              ? 'border-rose-900/60 bg-rose-950/40 text-rose-300'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          {status === 'online' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="fill" />
                          ) : status === 'offline' ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" weight="fill" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                          )}
                          <span>
                            {status === 'online'
                              ? latency
                                ? `${latency}ms`
                                : 'Online'
                              : status === 'offline'
                              ? 'Offline'
                              : 'Untested'}
                          </span>
                        </div>

                        {/* Test Button */}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isTestingThis}
                          leftIcon={
                            isTestingThis ? (
                              <CircleNotch className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
                            ) : (
                              <Sparkle className="w-3.5 h-3.5 text-zinc-400" />
                            )
                          }
                          onClick={() => handleTestModel(m.id)}
                        >
                          {isTestingThis ? 'Testing...' : 'Test'}
                        </Button>

                        {/* Set Active Button */}
                        {!isCurrentActive && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveAIModel(m.id)}
                          >
                            Set active
                          </Button>
                        )}

                        {/* Edit Button (Non-default models only) */}
                        {!m.isDefault && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftIcon={<PencilSimple className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit AI model configuration"
                          >
                            Edit
                          </Button>
                        )}

                        {/* Delete Button (Protected for built-in default) */}
                        {!m.isDefault ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash className="w-3.5 h-3.5" />}
                            onClick={() => handleDeleteClick(m)}
                            title="Remove model from registry"
                          >
                            Delete
                          </Button>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                            Protected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SSH & Transport */}
        {activeTab === 'ssh' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <h3 className="text-sm font-bold text-zinc-200">Netmiko SSH Transport Settings</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Configure timing constraints for SSH handshakes and long CLI commands on enterprise Cisco gear.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-zinc-300">Command Execution Timeout</span>
                  <span className="font-mono text-[#c8ff00] font-bold">{timeout}s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  className="w-full accent-[#c8ff00] bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-400 font-mono mt-1">
                  <span>10s (Fast health check)</span>
                  <span>30s (Default)</span>
                  <span>120s (Large Running-Configs)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Diff & Safety */}
        {activeTab === 'diff' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <h3 className="text-sm font-bold text-zinc-200">Diff Engine & Sanitization Policies</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Prevent false-positive diff highlights and keep sensitive network credentials masked.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={maskSecrets}
                  onChange={(e) => setMaskSecrets(e.target.checked)}
                  className="mt-0.5 rounded bg-zinc-950 border-zinc-700 text-white focus:ring-0"
                />
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Mask Secrets & Password Hashes in Diffs
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Replaces Cisco type 7/5/8 password hashes, BGP MD5 secrets, and SNMP community strings with `[REDACTED_SECRET]` before sending to the AI model.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalizeCounters}
                  onChange={(e) => setNormalizeCounters(e.target.checked)}
                  className="mt-0.5 rounded bg-zinc-950 border-zinc-700 text-white focus:ring-0"
                />
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Normalize Dynamic Timers & Packet Counters
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Filters out benign timestamp shifts, BGP uptime tickers, and interface packet counters to prevent unnecessary diff noise.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: Account */}
        {activeTab === 'account' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <h3 className="text-sm font-bold text-zinc-200">Operator Profile</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Authenticated session details and access permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Name</span>
                <span className="text-zinc-200 font-semibold">{user?.name || 'Lead Architect'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Email</span>
                <span className="text-zinc-200 font-mono">{user?.email || 'operator@driftguard.local'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Role</span>
                <span className="text-zinc-200">{user?.role || 'Administrator'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Session</span>
                <span className="text-[#c8ff00] font-mono font-semibold">Cognito JWT active</span>
              </div>
            </div>

            {/* Regional Localization & Telemetry */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Regional Localization & Telemetry</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Automatically detected from browser client environment.
                  </p>
                </div>
                <Badge variant="default" size="sm">
                  Auto-detected
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/20 space-y-2.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Operational Region</span>
                  <span className="text-zinc-200 font-semibold">{geoInfo.region} ({geoInfo.regionCode})</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Local Timezone</span>
                  <span className="text-zinc-200 font-mono">{geoInfo.formattedTimezone}</span>
                </div>
              </div>
            </div>

            {/* Legal & Compliance Reference */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
              <h3 className="text-sm font-bold text-zinc-200">Legal & compliance</h3>
              <p className="text-xs text-zinc-400">
                Review data collection standards, KMS envelope encryption architecture, and advisory AI terms.
              </p>
              <div className="flex items-center gap-4 pt-1 text-sm">
                <Link to="/terms" className="text-[#c8ff00] hover:underline font-semibold flex items-center gap-1">
                  <span>Terms of service</span> &rarr;
                </Link>
                <Link to="/privacy" className="text-[#c8ff00] hover:underline font-semibold flex items-center gap-1">
                  <span>Privacy policy</span> &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'account' && (
          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<FloppyDisk className="w-4 h-4" weight="bold" />}
            >
              Save
            </Button>
          </div>
        )}
      </form>

      {/* Add AI Model Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#c8ff00]" weight="duotone" />
                <h3 className="text-base font-bold text-white">Register AI model</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewModel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model display name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Anthropic Claude 3.5 Sonnet (Production)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model identifier *
                </label>
                <input
                  type="text"
                  required
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g. anthropic/claude-3.5-sonnet or meta-llama/llama-3.3-70b-instruct"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  API Base URL *
                </label>
                <input
                  type="text"
                  required
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showNewKey ? 'text' : 'password'}
                    required
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {showNewKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Dedicated API key used for all verification analyses routed through this model.
                </p>
              </div>

              {/* Pre-save Test Connection */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isTestingNew || !newModelId.trim() || !newApiKey.trim()}
                  leftIcon={
                    isTestingNew ? (
                      <CircleNotch className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
                    ) : (
                      <Sparkle className="w-3.5 h-3.5 text-[#c8ff00]" weight="fill" />
                    )
                  }
                  onClick={handleTestNewModel}
                >
                  {isTestingNew ? 'Testing...' : 'Test connection'}
                </Button>

                {newTestResult && (
                  <div
                    className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 ${
                      newTestResult.success
                        ? 'border border-[#c8ff00]/40 bg-[#c8ff00]/10 text-[#c8ff00]'
                        : 'border border-rose-900/60 bg-rose-950/40 text-rose-300'
                    }`}
                  >
                    {newTestResult.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="fill" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" weight="fill" />
                    )}
                    <span>
                      {newTestResult.success ? `Verified (${newTestResult.latencyMs}ms)` : 'Failed'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newName.trim() || !newModelId.trim() || !newApiKey.trim()}
                >
                  Register model
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit AI Model Modal */}
      {isEditModalOpen && editingModel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <PencilSimple className="w-5 h-5 text-[#c8ff00]" weight="duotone" />
                <h3 className="text-base font-bold text-white">Edit AI model</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model display name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model identifier *
                </label>
                <input
                  type="text"
                  required
                  value={editModelId}
                  onChange={(e) => setEditModelId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  API Base URL *
                </label>
                <input
                  type="text"
                  required
                  value={editBaseUrl}
                  onChange={(e) => setEditBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  API Key (leave blank to keep current key)
                </label>
                <div className="relative">
                  <input
                    type={showEditKey ? 'text' : 'password'}
                    value={editApiKey}
                    onChange={(e) => setEditApiKey(e.target.value)}
                    placeholder={editingModel.apiKeyPreview || 'sk-... (leave blank to retain current)'}
                    className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditKey(!showEditKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {showEditKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Current key is active. Enter a new key only if you wish to overwrite it.
                </p>
              </div>

              {/* Pre-save Test Connection */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isTestingEdit || !editModelId.trim()}
                  leftIcon={
                    isTestingEdit ? (
                      <CircleNotch className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
                    ) : (
                      <Sparkle className="w-3.5 h-3.5 text-[#c8ff00]" weight="fill" />
                    )
                  }
                  onClick={handleTestEditModel}
                >
                  {isTestingEdit ? 'Testing...' : 'Test connection'}
                </Button>

                {editTestResult && (
                  <div
                    className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 ${
                      editTestResult.success
                        ? 'border border-[#c8ff00]/40 bg-[#c8ff00]/10 text-[#c8ff00]'
                        : 'border border-rose-900/60 bg-rose-950/40 text-rose-300'
                    }`}
                  >
                    {editTestResult.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="fill" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" weight="fill" />
                    )}
                    <span>
                      {editTestResult.success ? `Verified (${editTestResult.latencyMs}ms)` : 'Failed'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!editName.trim() || !editModelId.trim()}
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Model Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        onClose={() => {
          setIsConfirmingDelete(false);
          setModelToDelete(null);
        }}
        onConfirm={handleConfirmModelDelete}
        title={`Delete AI Model: ${modelToDelete?.name || ''}`}
        message={`Are you sure you want to remove the AI model "${modelToDelete?.name}" (${modelToDelete?.modelIdentifier}) from the registry? Future analyses cannot use this model until re-registered.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Update Model Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingUpdate}
        onClose={() => setIsConfirmingUpdate(false)}
        onConfirm={handleConfirmModelUpdate}
        title={`Update AI Model: ${pendingModelUpdate?.name || ''}`}
        message={`Apply modifications to "${pendingModelUpdate?.name}"? Future comparison analyses using this model will use the updated endpoint and credentials.`}
        confirmText="Save changes"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Save Settings Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingSave}
        onClose={() => setIsConfirmingSave(false)}
        onConfirm={handleConfirmSave}
        title="Update System Settings"
        message="Apply modified SSH timeout thresholds and diff normalization policies? Active and future automated collections will use these parameters."
        confirmText="Save"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};
