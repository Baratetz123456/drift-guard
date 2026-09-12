import { create } from 'zustand';
import {
  Device,
  CommandSet,
  Snapshot,
  Comparison,
  AIAnalysis,
  AuditLogEntry,
  UserSettings,
  RiskSeverity,
  User,
} from '../types';
import {
  initialDevices,
  initialCommandSets,
  initialSnapshots,
  initialComparisons,
  initialAnalyses,
  initialAuditLogs,
} from '../data/mockData';
import { UI_COPY } from '../constants/uiCopy';
import {
  isJwtValid,
  decodeJwt,
  generateCognitoJwt,
} from '../utils/jwt';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  extendSession: () => void;
  logout: () => void;

  // Domain state
  devices: Device[];
  commandSets: CommandSet[];
  snapshots: Snapshot[];
  comparisons: Comparison[];
  analyses: AIAnalysis[];
  auditLogs: AuditLogEntry[];
  settings: UserSettings;
  toasts: Toast[];

  // Toast actions
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeToast: (id: string) => void;

  // Device actions
  addDevice: (device: Omit<Device, 'deviceId' | 'userId' | 'createdAt' | 'updatedAt'>) => Device;
  addDevices: (devices: Omit<Device, 'deviceId' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Device[];
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  deleteDevice: (deviceId: string) => void;
  testDeviceConnection: (deviceId: string) => Promise<{ success: boolean; latencyMs?: number; error?: string }>;

  // Command Set actions
  addCommandSet: (set: Omit<CommandSet, 'setId' | 'userId' | 'createdAt' | 'updatedAt'>) => CommandSet;
  updateCommandSet: (setId: string, updates: Partial<CommandSet>) => void;
  deleteCommandSet: (setId: string) => void;

  // Snapshot actions
  addSnapshot: (snapshot: Omit<Snapshot, 'snapshotId' | 'userId' | 'timestamp' | 's3Key'>) => Snapshot;
  deleteSnapshot: (snapshotId: string) => void;

  // Comparison actions
  createComparison: (preSnapshotId: string, postSnapshotId: string) => Comparison;
  deleteComparison: (comparisonId: string) => void;

  // AI Analysis actions
  runAIAnalysis: (comparisonId: string) => Promise<AIAnalysis>;

  // Settings actions
  updateSettings: (updates: Partial<UserSettings> & { apiKey?: string }) => void;
}

function getInitialAuth(): { user: User | null; isAuthenticated: boolean } {
  const token = sessionStorage.getItem('auth_token');
  if (!token || !isJwtValid(token)) {
    sessionStorage.removeItem('auth_token');
    return { user: null, isAuthenticated: false };
  }
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.payload) {
    sessionStorage.removeItem('auth_token');
    return { user: null, isAuthenticated: false };
  }
  return {
    user: {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      name: decoded.payload.name,
      role: decoded.payload['cognito:groups']?.[0] || 'Network Architect',
      token,
    },
    isAuthenticated: true,
  };
}

const initialAuth = getInitialAuth();

const initialSettings: UserSettings = {
  userId: 'user-default',
  aiBaseUrl: 'https://openrouter.ai/api/v1',
  hasApiKey: true,
  apiKeyPreview: 'sk-or-v1-...9f2c',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  defaultTimeoutSeconds: 30,
  maskSecretsInDiffs: true,
  normalizeDynamicCounters: true,
};

const COMMAND_SETS_STORAGE_KEY = 'driftguard_command_sets';

function getInitialCommandSets(): CommandSet[] {
  try {
    const raw = localStorage.getItem(COMMAND_SETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load command sets from localStorage:', e);
  }
  return initialCommandSets;
}

function persistCommandSets(sets: CommandSet[]) {
  try {
    localStorage.setItem(COMMAND_SETS_STORAGE_KEY, JSON.stringify(sets));
  } catch (e) {
    console.error('Failed to persist command sets to localStorage:', e);
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,

  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 600));
    const token = generateCognitoJwt({ email, role: 'Network Architect' }, 1800);
    const decoded = decodeJwt(token)!;
    const user: User = {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      name: decoded.payload.name,
      role: 'Network Architect',
      token,
    };
    sessionStorage.setItem('auth_token', token);
    set({ user, isAuthenticated: true });
    get().addToast('success', `Welcome back, ${user.name}`);
    return true;
  },

  register: async (name, email, password) => {
    await new Promise((r) => setTimeout(r, 800));
    const token = generateCognitoJwt({ email, name, role: 'Network Engineer' }, 1800);
    const decoded = decodeJwt(token)!;
    const user: User = {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      name,
      role: 'Network Engineer',
      token,
    };
    sessionStorage.setItem('auth_token', token);
    set({ user, isAuthenticated: true });
    get().addToast('success', `Account created for ${name}.`);
    return true;
  },

  extendSession: () => {
    const currentUser = get().user;
    if (!currentUser) return;
    const newToken = generateCognitoJwt(
      {
        userId: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
      },
      1800
    );
    sessionStorage.setItem('auth_token', newToken);
    set({
      user: { ...currentUser, token: newToken },
      isAuthenticated: true,
    });
    get().addToast('info', 'Operator session extended by 30 minutes.');
  },

  logout: () => {
    sessionStorage.removeItem('auth_token');
    set({ user: null, isAuthenticated: false });
    get().addToast('info', 'Signed out successfully.');
  },

  devices: initialDevices,
  commandSets: getInitialCommandSets(),
  snapshots: initialSnapshots,
  comparisons: initialComparisons,
  analyses: initialAnalyses,
  auditLogs: initialAuditLogs,
  settings: initialSettings,
  toasts: [],

  addToast: (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  addDevice: (deviceData) => {
    const newDevice: Device = {
      ...deviceData,
      deviceId: `dev-${Date.now().toString(36)}`,
      userId: get().user?.id || 'user-default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ devices: [newDevice, ...state.devices] }));
    get().addToast('success', UI_COPY.states.success.deviceAdded(newDevice.name));
    return newDevice;
  },

  addDevices: (devicesData) => {
    const currentUserId = get().user?.id || 'user-default';
    const now = new Date().toISOString();
    const newDevices: Device[] = devicesData.map((d, index) => ({
      ...d,
      deviceId: `dev-${(Date.now() + index).toString(36)}`,
      userId: currentUserId,
      createdAt: now,
      updatedAt: now,
    }));
    set((state) => ({ devices: [...newDevices, ...state.devices] }));
    get().addToast('success', `${newDevices.length} network devices registered in inventory.`);
    return newDevices;
  },

  updateDevice: (deviceId, updates) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.deviceId === deviceId
          ? { ...d, ...updates, updatedAt: new Date().toISOString() }
          : d
      ),
    }));
    get().addToast('info', `Device ${updates.name || 'configuration'} updated.`);
  },

  deleteDevice: (deviceId) => {
    set((state) => ({
      devices: state.devices.filter((d) => d.deviceId !== deviceId),
    }));
    get().addToast('warning', 'Device removed from inventory.');
  },

  testDeviceConnection: async (deviceId) => {
    const dev = get().devices.find((d) => d.deviceId === deviceId);
    if (!dev) return { success: false, error: 'Device not found' };

    await new Promise((res) => setTimeout(res, 1000));
    const isOnline = dev.hostname !== '192.168.100.1';
    const latency = isOnline ? Math.floor(Math.random() * 25) + 12 : undefined;

    set((state) => ({
      devices: state.devices.map((d) =>
        d.deviceId === deviceId
          ? {
              ...d,
              status: isOnline ? 'online' : 'offline',
              lastTestedAt: new Date().toISOString(),
            }
          : d
      ),
    }));

    if (isOnline) {
      get().addToast('success', UI_COPY.states.success.deviceTested(dev.name, latency));
      return { success: true, latencyMs: latency };
    } else {
      get().addToast('error', UI_COPY.states.deviceUnreachable.sshTimeout(`${dev.name} (${dev.hostname}:2222)`));
      return { success: false, error: 'TCP SYN timeout on port 2222' };
    }
  },

  addCommandSet: (setData) => {
    const newSet: CommandSet = {
      ...setData,
      setId: `set-${Date.now().toString(36)}`,
      userId: get().user?.id || 'user-default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedSets = [...get().commandSets, newSet];
    persistCommandSets(updatedSets);
    set({ commandSets: updatedSets });
    get().addToast('success', UI_COPY.states.success.commandSetSaved(newSet.name));
    return newSet;
  },

  updateCommandSet: (setId, updates) => {
    const updatedSets = get().commandSets.map((s) =>
      s.setId === setId
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s
    );
    persistCommandSets(updatedSets);
    set({ commandSets: updatedSets });
    get().addToast('info', 'Command set configuration updated.');
  },

  deleteCommandSet: (setId) => {
    const updatedSets = get().commandSets.filter((s) => s.setId !== setId);
    persistCommandSets(updatedSets);
    set({ commandSets: updatedSets });
    get().addToast('info', 'Command set removed from registry.');
  },

  addSnapshot: (snapData) => {
    const snapId = `snap-${Date.now().toString(36)}`;
    const newSnapshot: Snapshot = {
      ...snapData,
      snapshotId: snapId,
      userId: get().user?.id || 'user-default',
      timestamp: new Date().toISOString(),
      s3Key: `snapshots/user-default/${snapData.deviceName}/${snapId}.json`,
    };
    set((state) => ({ snapshots: [newSnapshot, ...state.snapshots] }));
    get().addToast('success', UI_COPY.states.success.snapshotCollected(newSnapshot.snapshotId));
    return newSnapshot;
  },

  deleteSnapshot: (snapshotId) => {
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.snapshotId !== snapshotId),
    }));
    get().addToast('info', 'Snapshot record removed.');
  },

  createComparison: (preSnapshotId, postSnapshotId) => {
    const { snapshots, comparisons } = get();
    const pre = snapshots.find((s) => s.snapshotId === preSnapshotId);
    const post = snapshots.find((s) => s.snapshotId === postSnapshotId);

    if (!pre || !post) {
      throw new Error('Snapshots not found');
    }

    const commandDiffs: Record<string, any> = {};
    const allCommands = Array.from(new Set([...pre.commands, ...post.commands]));
    let totalAdditions = 0;
    let totalDeletions = 0;
    let changedCommands = 0;

    allCommands.forEach((cmd) => {
      const preOut = pre.outputs[cmd] || '';
      const postOut = post.outputs[cmd] || '';
      const hasDiff = preOut !== postOut;

      const preLines = preOut ? preOut.split('\n') : [];
      const postLines = postOut ? postOut.split('\n') : [];

      let adds = 0;
      let dels = 0;

      if (hasDiff) {
        changedCommands++;
        const diffLines: string[] = [`--- ${pre.snapshotId} (${cmd})`, `+++ ${post.snapshotId} (${cmd})`];
        const maxLen = Math.max(preLines.length, postLines.length);
        for (let i = 0; i < maxLen; i++) {
          const p = preLines[i];
          const q = postLines[i];
          if (p !== q) {
            if (p !== undefined) {
              diffLines.push(`-${p}`);
              dels++;
            }
            if (q !== undefined) {
              diffLines.push(`+${q}`);
              adds++;
            }
          } else {
            diffLines.push(` ${p || ''}`);
          }
        }
        totalAdditions += adds;
        totalDeletions += dels;

        commandDiffs[cmd] = {
          command: cmd,
          hasDiff: true,
          additions: adds,
          deletions: dels,
          unifiedDiff: diffLines.join('\n'),
          preOutput: preOut,
          postOutput: postOut,
        };
      } else {
        commandDiffs[cmd] = {
          command: cmd,
          hasDiff: false,
          additions: 0,
          deletions: 0,
          unifiedDiff: '',
          preOutput: preOut,
          postOutput: postOut,
        };
      }
    });

    const newComparison: Comparison = {
      comparisonId: `cmp-${Date.now().toString(36)}`,
      userId: get().user?.id || 'user-default',
      deviceId: pre.deviceId,
      deviceName: pre.deviceName,
      preSnapshotId,
      postSnapshotId,
      preTimestamp: pre.timestamp,
      postTimestamp: post.timestamp,
      diffSummary: {
        totalCommands: allCommands.length,
        changedCommands,
        identicalCommands: allCommands.length - changedCommands,
        totalAdditions,
        totalDeletions,
      },
      commandDiffs,
      createdAt: new Date().toISOString(),
    };

    set({ comparisons: [newComparison, ...comparisons] });
    get().addToast('success', `Comparison ${newComparison.comparisonId} compiled with line-by-line diffs.`);
    return newComparison;
  },

  deleteComparison: (comparisonId) => {
    set((state) => ({
      comparisons: state.comparisons.filter((c) => c.comparisonId !== comparisonId),
    }));
    get().addToast('info', 'Comparison removed from local session.');
  },

  runAIAnalysis: async (comparisonId) => {
    const comparison = get().comparisons.find((c) => c.comparisonId === comparisonId);
    if (!comparison) throw new Error('Comparison not found');

    await new Promise((res) => setTimeout(res, 2000));

    const changed = comparison.diffSummary.changedCommands;
    let severity: RiskSeverity = 'Low';
    let riskScore = 20;

    if (changed >= 3 || comparison.diffSummary.totalDeletions > 4) {
      severity = 'High';
      riskScore = 82;
    } else if (changed >= 1) {
      severity = 'Medium';
      riskScore = 55;
    } else {
      severity = 'Informational';
      riskScore = 5;
    }

    const currentModel = get().settings.defaultModel;

    const newAnalysis: AIAnalysis = {
      analysisId: `ana-${Date.now().toString(36)}`,
      comparisonId,
      userId: get().user?.id || 'user-default',
      deviceId: comparison.deviceId,
      overallRisk: severity,
      riskScore,
      summary: `AI analysis suggests potential configuration and operational state divergence on ${comparison.deviceName}. Senior engineer verification required before change approval.`,
      executiveSummary: `Post-change verification on ${comparison.deviceName} indicates an advisory ${severity} risk assessment score (${riskScore}/100) evaluated via ${currentModel}. Review the detailed findings below before closing the change window.`,
      findings: [
        {
          title: 'Routing Protocol State & Adjacencies',
          category: 'ROUTING',
          severity: severity === 'High' ? 'High' : 'Low',
          description: 'Route table entries and dynamic neighbor sessions were audited across both snapshots.',
          potentialImpact: severity === 'High' ? 'Unplanned prefix redistribution or dropped peer sessions.' : 'Minimal routing volatility detected.',
          recommendation: 'Confirm convergence timers and BGP/OSPF neighbor uptime.',
        },
        {
          title: 'Physical & Virtual Interface Status',
          category: 'INTERFACES',
          severity: severity === 'High' ? 'Medium' : 'Informational',
          description: 'Link carrier states, line protocol changes, and IP assignments inspected.',
          potentialImpact: 'Interface flaps may cause spanning-tree or LACP recalculations.',
          recommendation: 'Ensure all expected links have negotiated correct speed/duplex.',
        },
      ],
      suggestedRollbackPlan: `# Recommended Rollback Runbook (Advisory)\n# Senior engineer verification required prior to script execution.\n1. Revert modified interface configurations\n2. Clear routing session soft-reset: 'clear ip bgp * soft'\n3. Execute post-rollback snapshot to verify baseline restore.`,
      tokenUsage: {
        promptTokens: 1150,
        completionTokens: 520,
        totalTokens: 1670,
      },
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ analyses: [newAnalysis, ...state.analyses] }));
    get().addToast('success', `AI advisory analysis completed: ${severity} severity (${riskScore}/100).`);
    return newAnalysis;
  },

  updateSettings: (updates) => {
    const { apiKey, ...rest } = updates;
    const newSettings = { ...get().settings, ...rest };

    if (apiKey && apiKey.trim()) {
      newSettings.hasApiKey = true;
      newSettings.apiKeyPreview = `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`;
    }

    set({ settings: newSettings });
    get().addToast('success', UI_COPY.states.success.settingsSaved);
  },
}));
