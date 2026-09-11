export type DeviceType = 'cisco_ios' | 'cisco_xe' | 'cisco_xr' | 'cisco_nxos';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
}

export interface Device {
  deviceId: string;
  userId: string;
  name: string;
  hostname: string;
  port: number;
  deviceType: DeviceType;
  authType: 'password' | 'key' | 'secret_arn';
  username: string;
  status: 'online' | 'offline' | 'untested';
  lastTestedAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommandSet {
  setId: string;
  userId: string;
  name: string;
  description: string;
  deviceType: DeviceType;
  commands: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SnapshotType = 'pre_change' | 'post_change' | 'ad_hoc';

export interface CommandOutput {
  command: string;
  output: string;
  executionTimeMs: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
}

export interface Snapshot {
  snapshotId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceHostname: string;
  deviceType: DeviceType;
  snapshotType: SnapshotType;
  commands: string[];
  outputs: Record<string, string>; // command -> output text
  commandOutputs?: CommandOutput[];
  s3Key: string;
  timestamp: string;
  changeTicket?: string;
  notes?: string;
}

export interface DiffLine {
  type: 'added' | 'deleted' | 'unchanged' | 'empty';
  preLineNumber?: number;
  postLineNumber?: number;
  content: string;
}

export interface DiffResult {
  command: string;
  hasDiff: boolean;
  additions: number;
  deletions: number;
  unifiedDiff: string;
  preOutput: string;
  postOutput: string;
  splitLines?: {
    pre: DiffLine[];
    post: DiffLine[];
  };
  unifiedLines?: DiffLine[];
}

export interface Comparison {
  comparisonId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  preSnapshotId: string;
  postSnapshotId: string;
  preTimestamp: string;
  postTimestamp: string;
  diffSummary: {
    totalCommands: number;
    changedCommands: number;
    identicalCommands: number;
    totalAdditions: number;
    totalDeletions: number;
  };
  commandDiffs: Record<string, DiffResult>;
  createdAt: string;
}

export type RiskSeverity =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Informational'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'SAFE';

export interface AnalysisFinding {
  title: string;
  category: 'ROUTING' | 'INTERFACES' | 'SECURITY' | 'SYSTEM' | 'PERFORMANCE';
  severity: RiskSeverity;
  description: string;
  potentialImpact: string;
  recommendation: string;
}

export interface AIAnalysis {
  analysisId: string;
  comparisonId: string;
  userId: string;
  deviceId: string;
  overallRisk: RiskSeverity;
  riskScore: number; // 0 - 100
  summary: string;
  executiveSummary: string;
  findings: AnalysisFinding[];
  suggestedRollbackPlan?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string;
}

export interface AuditLogEntry {
  auditId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export interface UserSettings {
  userId: string;
  aiBaseUrl: string;
  hasApiKey: boolean;
  apiKeyPreview?: string;
  defaultModel: string;
  defaultTimeoutSeconds: number;
  maskSecretsInDiffs: boolean;
  normalizeDynamicCounters: boolean;
  emailNotifications?: boolean;
}
