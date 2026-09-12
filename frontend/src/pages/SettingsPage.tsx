import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { detectUserTimezoneAndRegion } from '../utils/geoDetection';
import {
  Gear,
  Key,
  ShieldCheck,
  Sliders,
  Cpu,
  Globe,
  FloppyDisk,
  Eye,
  EyeSlash,
  User,
  SignOut,
} from '@phosphor-icons/react';

const POPULAR_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
  { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, user, logout } = useAppStore();
  const [activeTab, setActiveTab] = useState<'ai' | 'ssh' | 'diff' | 'account'>('ai');
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const geoInfo = useMemo(() => detectUserTimezoneAndRegion(), []);

  // AI Tab form state
  const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl || 'https://openrouter.ai/api/v1');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(settings.defaultModel || 'anthropic/claude-3.5-sonnet');
  const [maxTokens, setMaxTokens] = useState(settings.defaultTimeoutSeconds ? 4096 : 4096);

  // SSH Tab state
  const [timeout, setTimeoutVal] = useState(settings.defaultTimeoutSeconds || 30);

  // Diff & Safety Tab state
  const [maskSecrets, setMaskSecrets] = useState(settings.maskSecretsInDiffs);
  const [normalizeCounters, setNormalizeCounters] = useState(settings.normalizeDynamicCounters);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmingSave(true);
  };

  const handleConfirmSave = () => {
    updateSettings({
      aiBaseUrl: baseUrl.trim(),
      defaultModel: model.trim(),
      defaultTimeoutSeconds: Number(timeout),
      maskSecretsInDiffs: maskSecrets,
      normalizeDynamicCounters: normalizeCounters,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    });
    setApiKey('');
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
          Manage your OpenAI-compatible API configuration, network connection thresholds, and security policies.
        </p>
      </div>

      {/* Sub-Navigation Tabs Bar (Secondary Hierarchy) */}
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
        {/* TAB 1: AI Model */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">OpenAI-Compatible API Format</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Point to any endpoint supporting OpenAI chat completions (OpenRouter, OpenAI, vLLM, Ollama).
                </p>
              </div>
              <Badge variant="default" size="sm">
                KMS Encrypted
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    API Base URL
                  </label>
                  <input
                    type="text"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1 or https://api.openai.com/v1"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Default: https://openrouter.ai/api/v1 (or https://api.openai.com/v1)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={settings.apiKeyPreview || 'sk-... (leave blank to retain current)'}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  Model Name
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. anthropic/claude-3.5-sonnet, openai/gpt-4o, deepseek/deepseek-r1"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                />

                {/* Popular model pill shortcuts */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-zinc-500 self-center mr-1">Presets:</span>
                  {POPULAR_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                        model === m.id
                          ? 'bg-[#c8ff00] text-zinc-950 border-[#c8ff00] font-bold shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SSH & Transport */}
        {activeTab === 'ssh' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <h3 className="text-xs font-bold text-zinc-200">Netmiko SSH Transport Settings</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
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
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
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
              <h3 className="text-xs font-bold text-zinc-200">Diff Engine & Sanitization Policies</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
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
                  <div className="text-xs font-semibold text-zinc-200">
                    Mask Secrets & Password Hashes in Diffs
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
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
                  <div className="text-xs font-semibold text-zinc-200">
                    Normalize Dynamic Timers & Packet Counters
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
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
              <h3 className="text-xs font-bold text-zinc-200">Operator Profile</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Authenticated session details and access permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 space-y-3 text-xs">
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
                  <h3 className="text-xs font-bold text-zinc-200">Regional Localization & Telemetry</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically detected from browser client environment.
                  </p>
                </div>
                <Badge variant="default" size="sm">
                  Auto-detected
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/20 space-y-2.5 text-xs">
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
              <h3 className="text-xs font-bold text-zinc-200">Legal & compliance</h3>
              <p className="text-[11px] text-zinc-400">
                Review data collection standards, KMS envelope encryption architecture, and advisory AI terms.
              </p>
              <div className="flex items-center gap-4 pt-1 text-xs">
                <Link to="/terms" className="text-[#c8ff00] hover:underline font-semibold flex items-center gap-1">
                  <span>Terms of service</span> &rarr;
                </Link>
                <Link to="/privacy" className="text-[#c8ff00] hover:underline font-semibold flex items-center gap-1">
                  <span>Privacy policy</span> &rarr;
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="danger"
                leftIcon={<SignOut className="w-4 h-4" />}
                onClick={() => logout()}
              >
                Sign out
              </Button>
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

      {/* Save Settings Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingSave}
        onClose={() => setIsConfirmingSave(false)}
        onConfirm={handleConfirmSave}
        title="Update System Settings"
        message="Apply modified API endpoints, AI models, SSH timeout thresholds, and diff normalization policies? Active and future automated collections will use these parameters."
        confirmText="Save"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};
