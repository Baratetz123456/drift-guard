import { Device, CommandSet, Snapshot, Comparison, AIAnalysis, AuditLogEntry, UserSettings } from '../types';

export const initialDevices: Device[] = [
  {
    deviceId: 'dev-001',
    userId: 'user-default',
    name: 'CORE-SW-01',
    hostname: '10.200.1.1',
    port: 22,
    deviceType: 'cisco_xe',
    authType: 'password',
    username: 'admin',
    status: 'online',
    lastTestedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    tags: ['Core', 'Datacenter-A', 'Catalyst 9300'],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-10T08:30:00Z',
  },
  {
    deviceId: 'dev-002',
    userId: 'user-default',
    name: 'BORDER-RTR-02',
    hostname: '10.200.1.254',
    port: 22,
    deviceType: 'cisco_xr',
    authType: 'key',
    username: 'netops',
    status: 'online',
    lastTestedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    tags: ['Edge', 'Transit-WAN', 'ASR 9000'],
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-10T14:10:00Z',
  },
  {
    deviceId: 'dev-003',
    userId: 'user-default',
    name: 'DIST-LEAF-03',
    hostname: '10.200.2.15',
    port: 22,
    deviceType: 'cisco_nxos',
    authType: 'password',
    username: 'admin',
    status: 'online',
    lastTestedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    tags: ['Spine-Leaf', 'Nexus 9300', 'VPC-Pair'],
    createdAt: '2026-09-03T09:30:00Z',
    updatedAt: '2026-09-08T11:00:00Z',
  },
  {
    deviceId: 'dev-004',
    userId: 'user-default',
    name: 'BRANCH-RTR-04',
    hostname: '192.168.100.1',
    port: 2222,
    deviceType: 'cisco_ios',
    authType: 'password',
    username: 'cisco',
    status: 'offline',
    lastTestedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    tags: ['Branch', 'ISDN-Backup', 'ISR 4331'],
    createdAt: '2026-09-05T14:20:00Z',
    updatedAt: '2026-09-10T16:00:00Z',
  },
];

export const initialCommandSets: CommandSet[] = [
  {
    setId: 'set-standard',
    userId: 'user-default',
    name: 'Standard Operational Health',
    description: 'Core show commands for routing, interface status, IP routes, and hardware environment.',
    deviceType: 'cisco_xe',
    commands: [
      'show ip interface brief',
      'show ip route summary',
      'show interfaces status',
      'show ip bgp summary',
      'show vlan brief',
      'show standby brief',
    ],
    isDefault: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  {
    setId: 'set-bgp-wan',
    userId: 'user-default',
    name: 'BGP & Peering Deep-Dive',
    description: 'Comprehensive border routing protocols, peer status, and route convergence tables.',
    deviceType: 'cisco_xr',
    commands: [
      'show ip bgp summary',
      'show ip route',
      'show bgp neighbors',
      'show interfaces brief',
      'show bfd session',
    ],
    isDefault: false,
    createdAt: '2026-09-02T11:00:00Z',
    updatedAt: '2026-09-02T11:00:00Z',
  },
  {
    setId: 'set-security-vlans',
    userId: 'user-default',
    name: 'Security & Access-Lists',
    description: 'Verify ACL counters, port-security, and authentication status across access layers.',
    deviceType: 'cisco_xe',
    commands: [
      'show access-lists',
      'show port-security',
      'show authentication sessions',
      'show ip arp',
    ],
    isDefault: false,
    createdAt: '2026-09-03T16:00:00Z',
    updatedAt: '2026-09-03T16:00:00Z',
  },
];

const PRE_INTERFACE_BRIEF = `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   10.200.1.1      YES NVRAM  up                    up      
GigabitEthernet0/0/1   10.200.1.5      YES NVRAM  up                    up      
GigabitEthernet0/0/2   10.200.1.9      YES NVRAM  up                    up      
TenGigabitEthernet0/1/0 172.16.50.1     YES NVRAM  up                    up      
TenGigabitEthernet0/1/1 unassigned      YES unset  up                    up      
Loopback0              10.255.255.1    YES NVRAM  up                    up      
Vlan100                192.168.10.1    YES NVRAM  up                    up      
Vlan200                192.168.20.1    YES NVRAM  up                    up`;

const POST_INTERFACE_BRIEF = `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   10.200.1.1      YES NVRAM  up                    up      
GigabitEthernet0/0/1   10.200.1.5      YES NVRAM  up                    up      
GigabitEthernet0/0/2   10.200.1.9      YES NVRAM  administratively down down    
TenGigabitEthernet0/1/0 172.16.50.1     YES NVRAM  up                    up      
TenGigabitEthernet0/1/1 172.16.51.1     YES manual up                    up      
Loopback0              10.255.255.1    YES NVRAM  up                    up      
Vlan100                192.168.10.1    YES NVRAM  up                    up      
Vlan200                192.168.20.1    YES NVRAM  up                    up      
Vlan300                192.168.30.1    YES manual up                    up`;

const PRE_BGP_SUMMARY = `BGP router identifier 10.255.255.1, local AS number 65001
BGP table version is 482, main routing table version 482
32 network entries using 8192 bytes of memory
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.200.1.2      4        65001   14292   14290      482    0    0 04:12:30        18
10.200.1.6      4        65002    8492    8491      482    0    0 01:45:10        42
172.16.50.2     4        64512   59302   59300      482    0    0 3d18h          154`;

const POST_BGP_SUMMARY = `BGP router identifier 10.255.255.1, local AS number 65001
BGP table version is 490, main routing table version 490
31 network entries using 7936 bytes of memory
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.200.1.2      4        65001   14310   14308      490    0    0 04:15:12        18
10.200.1.6      4        65002    8495    8492        0    0    0 00:01:23     Active
172.16.50.2     4        64512   59320   59318      490    0    0 3d18h          154`;

const PRE_ROUTE_SUMMARY = `IP routing table name is default (0x0)
IP routing table maximum-paths is 32
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
application     0           0           0           0           0
connected       0           7           0           560         1680
static          0           2           0           160         480
ospf 1          0           24          0           1920        5760
bgp 65001       0           214         0           17120       51360
internal        3                                               3480
Total           3           247         0           19760       62760`;

const POST_ROUTE_SUMMARY = `IP routing table name is default (0x0)
IP routing table maximum-paths is 32
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
application     0           0           0           0           0
connected       0           8           0           640         1920
static          0           2           0           160         480
ospf 1          0           22          0           1760        5280
bgp 65001       0           172         0           13760       41280
internal        3                                               3480
Total           3           204         0           16320       52440`;

export const initialSnapshots: Snapshot[] = [
  {
    snapshotId: 'snap-pre-001',
    userId: 'user-default',
    deviceId: 'dev-001',
    deviceName: 'CORE-SW-01',
    deviceHostname: '10.200.1.1',
    deviceType: 'cisco_xe',
    snapshotType: 'pre_change',
    commands: [
      'show ip interface brief',
      'show ip bgp summary',
      'show ip route summary',
    ],
    outputs: {
      'show ip interface brief': PRE_INTERFACE_BRIEF,
      'show ip bgp summary': PRE_BGP_SUMMARY,
      'show ip route summary': PRE_ROUTE_SUMMARY,
    },
    s3Key: 'snapshots/user-default/CORE-SW-01/snap-pre-001.json',
    timestamp: '2026-09-11T09:15:00Z',
    changeTicket: 'CHG-998214',
    notes: 'Pre-maintenance snapshot before uplink failover test & VLAN 300 provisioning.',
  },
  {
    snapshotId: 'snap-post-002',
    userId: 'user-default',
    deviceId: 'dev-001',
    deviceName: 'CORE-SW-01',
    deviceHostname: '10.200.1.1',
    deviceType: 'cisco_xe',
    snapshotType: 'post_change',
    commands: [
      'show ip interface brief',
      'show ip bgp summary',
      'show ip route summary',
    ],
    outputs: {
      'show ip interface brief': POST_INTERFACE_BRIEF,
      'show ip bgp summary': POST_BGP_SUMMARY,
      'show ip route summary': POST_ROUTE_SUMMARY,
    },
    s3Key: 'snapshots/user-default/CORE-SW-01/snap-post-002.json',
    timestamp: '2026-09-11T10:45:00Z',
    changeTicket: 'CHG-998214',
    notes: 'Post-maintenance verification snapshot after VLAN 300 rollout.',
  },
];

export const initialComparisons: Comparison[] = [
  {
    comparisonId: 'cmp-001',
    userId: 'user-default',
    deviceId: 'dev-001',
    deviceName: 'CORE-SW-01',
    preSnapshotId: 'snap-pre-001',
    postSnapshotId: 'snap-post-002',
    preTimestamp: '2026-09-11T09:15:00Z',
    postTimestamp: '2026-09-11T10:45:00Z',
    diffSummary: {
      totalCommands: 3,
      changedCommands: 3,
      identicalCommands: 0,
      totalAdditions: 7,
      totalDeletions: 5,
    },
    commandDiffs: {
      'show ip interface brief': {
        command: 'show ip interface brief',
        hasDiff: true,
        additions: 3,
        deletions: 1,
        unifiedDiff: `--- pre-change
+++ post-change
@@ -3,5 +3,6 @@
-GigabitEthernet0/0/2   10.200.1.9      YES NVRAM  up                    up      
+GigabitEthernet0/0/2   10.200.1.9      YES NVRAM  administratively down down    
 TenGigabitEthernet0/1/0 172.16.50.1     YES NVRAM  up                    up      
-TenGigabitEthernet0/1/1 unassigned      YES unset  up                    up      
+TenGigabitEthernet0/1/1 172.16.51.1     YES manual up                    up      
 Loopback0              10.255.255.1    YES NVRAM  up                    up      
 Vlan100                192.168.10.1    YES NVRAM  up                    up      
 Vlan200                192.168.20.1    YES NVRAM  up                    up      
+Vlan300                192.168.30.1    YES manual up                    up`,
        preOutput: PRE_INTERFACE_BRIEF,
        postOutput: POST_INTERFACE_BRIEF,
      },
      'show ip bgp summary': {
        command: 'show ip bgp summary',
        hasDiff: true,
        additions: 2,
        deletions: 2,
        unifiedDiff: `--- pre-change
+++ post-change
@@ -6,3 +6,3 @@
 10.200.1.2      4        65001   14310   14308      490    0    0 04:15:12        18
-10.200.1.6      4        65002    8492    8491      482    0    0 01:45:10        42
+10.200.1.6      4        65002    8495    8492        0    0    0 00:01:23     Active
 172.16.50.2     4        64512   59320   59318      490    0    0 3d18h          154`,
        preOutput: PRE_BGP_SUMMARY,
        postOutput: POST_BGP_SUMMARY,
      },
      'show ip route summary': {
        command: 'show ip route summary',
        hasDiff: true,
        additions: 2,
        deletions: 2,
        unifiedDiff: `--- pre-change
+++ post-change
@@ -7,4 +7,4 @@
-ospf 1          0           24          0           1920        5760
-bgp 65001       0           214         0           17120       51360
+ospf 1          0           22          0           1760        5280
+bgp 65001       0           172         0           13760       41280
-Total           3           247         0           19760       62760
+Total           3           204         0           16320       52440`,
        preOutput: PRE_ROUTE_SUMMARY,
        postOutput: POST_ROUTE_SUMMARY,
      },
    },
    createdAt: '2026-09-11T10:46:12Z',
  },
];

export const initialAnalyses: AIAnalysis[] = [
  {
    analysisId: 'ana-001',
    comparisonId: 'cmp-001',
    userId: 'user-default',
    deviceId: 'dev-001',
    overallRisk: 'High',
    riskScore: 78,
    summary: 'AI analysis suggests potential BGP peer session drop to AS65002 and inadvertent administrative shutdown of GigabitEthernet0/0/2, resulting in a loss of 42 routing prefixes. Senior engineer verification required before change approval.',
    executiveSummary: 'Maintenance activity CHG-998214 successfully brought up VLAN 300 and TenGigabitEthernet0/1/1. However, peer 10.200.1.6 (AS65002) transitioned from Established (42 prefixes) into an "Active" (TCP SYN failed) state. Concurrently, GigabitEthernet0/0/2 was placed into administratively down status, causing routing table degradation from 247 subnets down to 204 subnets. Senior engineer verification required before closing change window.',
    findings: [
      {
        title: 'BGP Peer Flapped & Stuck in Active State',
        category: 'ROUTING',
        severity: 'Critical',
        description: 'BGP Neighbor 10.200.1.6 (AS65002) was previously established with 42 received prefixes. Post-change, it transitioned to Active state (TblVer 0, Up/Down 00:01:23) indicating failed TCP handshakes.',
        potentialImpact: 'Transit traffic towards external AS 65002 is blackholing or re-routing across congested secondary backup path.',
        recommendation: 'Verify IP reachability to 10.200.1.6, check ACLs on WAN uplinks, and inspect BGP neighbor session state via "show ip bgp neighbors 10.200.1.6".',
      },
      {
        title: 'Interface GigabitEthernet0/0/2 Administratively Down',
        category: 'INTERFACES',
        severity: 'High',
        description: 'GigabitEthernet0/0/2 (10.200.1.9) transitioned from "up/up" to "administratively down / down".',
        potentialImpact: 'Loss of Layer 2/3 adjacency for redundant server farm uplink.',
        recommendation: 'Confirm whether shutdown was intentional. If unexpected, issue "no shutdown" under interface GigabitEthernet0/0/2.',
      },
      {
        title: 'Route Table Shrinkage by 43 Subnets',
        category: 'ROUTING',
        severity: 'High',
        description: 'Total route table count decreased from 247 subnets to 204 subnets (OSPF decreased by 2, BGP prefixes decreased by 42).',
        potentialImpact: 'Downstream clients may lose connectivity to specific partner networks.',
        recommendation: 'Restore the AS65002 peering to re-populate the missing 42 BGP prefix advertisements.',
      },
      {
        title: 'New Service VLAN 300 Provisioned Cleanly',
        category: 'INTERFACES',
        severity: 'Informational',
        description: 'Vlan300 (192.168.30.1) and TenGigabitEthernet0/1/1 were successfully initialized and report line protocol up.',
        potentialImpact: 'New service subnet is operational.',
        recommendation: 'Proceed with tenant smoke testing for VLAN 300.',
      },
    ],
    suggestedRollbackPlan: `# Advisory Remediation Runbook
# Senior engineer verification required prior to script execution.

1. Re-enable interface:
   configure terminal
   interface GigabitEthernet0/0/2
    no shutdown
   exit

2. Check BGP connectivity:
   ping 10.200.1.6 source Loopback0
   show ip bgp neighbors 10.200.1.6

3. If peer remains Active, review recent ACL changes applied to TenGigabitEthernet0/1/0 or GigabitEthernet0/0/1.`,
    tokenUsage: {
      promptTokens: 1240,
      completionTokens: 680,
      totalTokens: 1920,
    },
    createdAt: '2026-09-11T10:48:30Z',
  },
];

export const initialAuditLogs: AuditLogEntry[] = [
  {
    auditId: 'aud-001',
    userId: 'user-default',
    userEmail: 'network-architect@enterprise.net',
    action: 'CREATE_SNAPSHOT',
    resource: 'Snapshot',
    resourceId: 'snap-pre-001',
    status: 'SUCCESS',
    details: { device: 'CORE-SW-01', snapshotType: 'pre_change', commandsCount: 3 },
    ipAddress: '198.51.100.42',
    timestamp: '2026-09-11T09:15:02Z',
  },
  {
    auditId: 'aud-002',
    userId: 'user-default',
    userEmail: 'network-architect@enterprise.net',
    action: 'CREATE_SNAPSHOT',
    resource: 'Snapshot',
    resourceId: 'snap-post-002',
    status: 'SUCCESS',
    details: { device: 'CORE-SW-01', snapshotType: 'post_change', commandsCount: 3 },
    ipAddress: '198.51.100.42',
    timestamp: '2026-09-11T10:45:01Z',
  },
  {
    auditId: 'aud-003',
    userId: 'user-default',
    userEmail: 'network-architect@enterprise.net',
    action: 'RUN_COMPARISON',
    resource: 'Comparison',
    resourceId: 'cmp-001',
    status: 'SUCCESS',
    details: { preSnapshot: 'snap-pre-001', postSnapshot: 'snap-post-002', diffsDetected: 3 },
    ipAddress: '198.51.100.42',
    timestamp: '2026-09-11T10:46:12Z',
  },
  {
    auditId: 'aud-004',
    userId: 'user-default',
    userEmail: 'network-architect@enterprise.net',
    action: 'REQUEST_AI_ANALYSIS',
    resource: 'AIAnalysis',
    resourceId: 'ana-001',
    status: 'SUCCESS',
    details: { comparisonId: 'cmp-001', model: 'gpt-4o', riskScore: 78, severity: 'High' },
    ipAddress: '198.51.100.42',
    timestamp: '2026-09-11T10:48:30Z',
  },
];

export const initialSettings: UserSettings = {
  userId: 'user-default',
  aiBaseUrl: 'https://openrouter.ai/api/v1',
  hasApiKey: true,
  apiKeyPreview: 'sk-or-v1-...9f2c',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  defaultTimeoutSeconds: 30,
  maskSecretsInDiffs: true,
  normalizeDynamicCounters: true,
  emailNotifications: false,
};
