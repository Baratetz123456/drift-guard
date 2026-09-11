import { Device, CommandSet, Snapshot, Comparison, AIAnalysis, AuditLogEntry, UserSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token') || 'mock-jwt-token';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Devices
  getDevices: () => request<{ devices: Device[] }>('/devices'),
  getDevice: (id: string) => request<Device>(`/devices/${id}`),
  createDevice: (data: Partial<Device>) =>
    request<Device>('/devices', { method: 'POST', body: JSON.stringify(data) }),
  testDevice: (id: string) =>
    request<{ success: boolean; latencyMs?: number; error?: string }>(`/devices/${id}/test`, {
      method: 'POST',
    }),
  deleteDevice: (id: string) => request(`/devices/${id}`, { method: 'DELETE' }),

  // Command Sets
  getCommandSets: () => request<{ commandSets: CommandSet[] }>('/commands'),
  createCommandSet: (data: Partial<CommandSet>) =>
    request<CommandSet>('/commands', { method: 'POST', body: JSON.stringify(data) }),
  deleteCommandSet: (id: string) => request(`/commands/${id}`, { method: 'DELETE' }),

  // Snapshots
  getSnapshots: (deviceId?: string) =>
    request<{ snapshots: Snapshot[] }>(deviceId ? `/snapshots?deviceId=${deviceId}` : '/snapshots'),
  getSnapshot: (id: string) => request<Snapshot>(`/snapshots/${id}`),
  createSnapshotJob: (data: { deviceId: string; commandSetId: string; snapshotType: string; changeTicket?: string }) =>
    request<{ jobId: string; executionArn: string }>('/collect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSnapshot: (id: string) => request(`/snapshots/${id}`, { method: 'DELETE' }),

  // Compare & Diff
  createComparison: (preSnapshotId: string, postSnapshotId: string) =>
    request<Comparison>('/compare', {
      method: 'POST',
      body: JSON.stringify({ preSnapshotId, postSnapshotId }),
    }),
  getComparison: (id: string) => request<Comparison>(`/compare/${id}`),

  // AI Analysis
  runAIAnalysis: (comparisonId: string) =>
    request<AIAnalysis>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ comparisonId }),
    }),
  getAIAnalysis: (id: string) => request<AIAnalysis>(`/ai/analyze/${id}`),

  // History & Audit
  getHistory: () => request<any>('/history'),
  getAuditLogs: () => request<{ logs: AuditLogEntry[] }>('/audit-logs'),

  // Settings
  getSettings: () => request<UserSettings>('/settings'),
  updateSettings: (data: Partial<UserSettings> & { openaiApiKey?: string }) =>
    request<UserSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
