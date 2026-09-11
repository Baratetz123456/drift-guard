/**
 * DriftGuard Standard UI Copy Library
 * Conforms to Voice & Tone Guidelines:
 * - Product Name: DriftGuard | Tagline: "Before. After. Understood."
 * - Calm, precise, directly technical (senior network engineer perspective)
 * - 3-part error pattern: What happened + What it means + What to do next
 * - Zero blame ("invalid format" instead of "you entered an invalid format")
 * - Zero exclamation marks, emojis, or colloquial humor
 * - AI framed as advisory ("DriftGuard analysis suggests…")
 * - Sentence case throughout
 */

export interface StructuredError {
  happened: string;
  means: string;
  next: string;
}

export const formatErrorCopy = ({ happened, means, next }: StructuredError): string => {
  return `${happened}. ${means}. ${next}.`;
};

export const UI_COPY = {
  // Common terms
  terms: {
    snapshot: 'snapshot',
    collection: 'collection',
    baseline: 'baseline',
    diff: 'diff',
  },

  // Canonical states
  states: {
    success: {
      snapshotCollected: (id: string, s3Key?: string) =>
        `Snapshot ${id} generated and archived${s3Key ? ` to ${s3Key}` : ''}. Ready for line-by-line diff.`,
      deviceAdded: (name: string) => `Device ${name} registered in inventory.`,
      deviceTested: (name: string, latencyMs?: number) =>
        `SSH handshake successful for ${name}${latencyMs ? ` (${latencyMs}ms latency)` : ''}.`,
      commandSetSaved: (name: string) => `Command set ${name} saved.`,
      settingsSaved: 'System configuration saved.',
      copied: 'Copied to clipboard.',
    },

    partialFailure: {
      commandsTimedOut: (succeeded: number, total: number, timedOutCmd: string) =>
        `Collected ${succeeded} of ${total} commands. ${timedOutCmd} timed out; continuing with available outputs.`,
    },

    deviceUnreachable: {
      sshTimeout: (endpoint: string) =>
        formatErrorCopy({
          happened: `SSH connection timed out to ${endpoint}`,
          means: 'Device state could not be gathered',
          next: 'Verify route reachability, ACL rules on port 22, and SSH service status',
        }),
      authFailed: (endpoint: string) =>
        formatErrorCopy({
          happened: `Authentication rejected by ${endpoint}`,
          means: 'Access credentials were not accepted by the target host',
          next: 'Check the configured SSH username, password, or private key permissions',
        }),
    },

    aiAdvisory: {
      bannerPrefix: 'DriftGuard analysis suggests',
      disclaimer: 'Advisory analysis only. Senior engineer verification required before change approval.',
      header: (summary: string) => `DriftGuard analysis suggests: ${summary}`,
    },

    destructive: {
      deleteDevice: (name: string) => ({
        title: `Delete ${name}`,
        message: `Delete device ${name}? This action removes all associated SSH credentials and historical records from inventory. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }),
      deleteSnapshot: (id: string) => ({
        title: `Delete ${id}`,
        message: `Delete snapshot ${id}? The associated S3 archive record will be unlinked. This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }),
      deleteCommandSet: (name: string) => ({
        title: `Delete ${name}`,
        message: `Delete command set ${name}? Devices referencing this set will require an alternate suite for collections.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }),
    },

    emptyStates: {
      noDevices: {
        title: 'No devices registered',
        description: 'Register a Cisco IOS, XE, XR, or NX-OS device to begin snapshot collection and configuration auditing.',
      },
      noSnapshots: {
        title: 'No snapshots yet',
        description: 'No snapshots yet. Run your first collection to establish a baseline.',
      },
      noComparisons: {
        title: 'No comparisons compiled',
        description: 'Select a pre-change baseline snapshot and a post-change verification snapshot to compute differences.',
      },
      noAnalyses: {
        title: 'No automated risk assessments',
        description: 'Compile a comparison between two snapshots to generate a DriftGuard analysis.',
      },
      noAuditLogs: {
        title: 'No audit records',
        description: 'Operational activities and SSH commands will be recorded here.',
      },
    },

    loadingStates: {
      collecting: (count = 1) => `Collecting from ${count} device${count === 1 ? '' : 's'}…`,
      comparing: 'Computing line-by-line difference delta and filtering dynamic counters.',
      analyzing: 'Querying advisory model for configuration risk assessment.',
      testingConnection: 'Testing SSH transport and measuring round-trip latency.',
    },
  },
} as const;
