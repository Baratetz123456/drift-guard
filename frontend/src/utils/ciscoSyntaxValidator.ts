import { DeviceType } from '../types';

export interface CommandValidationResult {
  command: string;
  isValid: boolean;
  status: 'verified' | 'warning' | 'error';
  message: string;
  normalized?: string;
  category?: string;
}

// Strict disallowed mutating / configuration tokens across all Cisco network operating systems
export const DANGEROUS_PATTERNS = [
  'config',
  'conf t',
  'configure',
  'reload',
  'write',
  'erase',
  'format',
  'delete',
  'boot',
  'crypto key generate',
  'crypto key zeroize',
  'write erase',
  'shutdown',
  'no shutdown',
  'no ',
  'clear',
  'debug',
  'undebug',
  'terminal length',
  'copy',
  'install activate',
  'license boot',
];

// Common show command subtrees per Cisco platform
const PLATFORM_SHOW_TREES: Record<DeviceType, string[]> = {
  cisco_xe: [
    'show version',
    'show ip interface brief',
    'show ip interface',
    'show ip route',
    'show ip route summary',
    'show interfaces',
    'show interfaces status',
    'show interfaces description',
    'show interfaces summary',
    'show ip bgp summary',
    'show ip bgp',
    'show ip bgp neighbors',
    'show ip ospf neighbor',
    'show ip ospf',
    'show vlan brief',
    'show vlan',
    'show standby brief',
    'show standby',
    'show running-config',
    'show running-config interface',
    'show mac address-table',
    'show mac-address-table',
    'show cdp neighbors',
    'show cdp neighbors detail',
    'show lldp neighbors',
    'show lldp neighbors detail',
    'show environment',
    'show environment all',
    'show inventory',
    'show processes cpu',
    'show processes cpu sorted',
    'show memory statistics',
    'show logging',
    'show clock',
    'show ntp status',
    'show ntp associations',
    'show power inline',
    'show spanning-tree',
    'show spanning-tree summary',
    'show etherchannel summary',
    'show ip arp',
    'show access-lists',
    'show authentication sessions',
    'show port-security',
  ],
  cisco_ios: [
    'show version',
    'show ip interface brief',
    'show ip route',
    'show ip route summary',
    'show interfaces',
    'show interfaces status',
    'show interfaces description',
    'show ip bgp summary',
    'show ip ospf neighbor',
    'show vlan brief',
    'show standby brief',
    'show running-config',
    'show mac address-table',
    'show cdp neighbors',
    'show environment all',
    'show inventory',
    'show processes cpu',
    'show logging',
    'show clock',
    'show ip arp',
    'show access-lists',
  ],
  cisco_nxos: [
    'show version',
    'show ip interface brief',
    'show interface status',
    'show interface brief',
    'show interfaces',
    'show ip route',
    'show ip route summary',
    'show ip route vrf all',
    'show vrf',
    'show vpc',
    'show vpc brief',
    'show port-channel summary',
    'show ip bgp summary',
    'show ip bgp summary vrf all',
    'show bgp l2vpn evpn summary',
    'show nve interface',
    'show nve peers',
    'show bfd neighbors',
    'show lldp neighbors',
    'show cdp neighbors',
    'show mac address-table',
    'show running-config',
    'show system resources',
    'show environment',
    'show inventory',
    'show logging',
    'show feature',
    'show spanning-tree',
    'show fex',
    'show ip arp',
  ],
  cisco_xr: [
    'show version',
    'show interfaces brief',
    'show interfaces description',
    'show ip interface brief',
    'show ipv4 interface brief',
    'show route',
    'show route summary',
    'show route ipv4',
    'show bgp summary',
    'show bgp ipv4 unicast summary',
    'show bgp neighbors',
    'show bfd session',
    'show bundle brief',
    'show lldp neighbors',
    'show cdp neighbors',
    'show mpls ldp neighbor',
    'show isis neighbors',
    'show ospf neighbor',
    'show running-config',
    'show platform',
    'show redundancy',
    'show logging',
    'show clock',
    'show memory summary',
  ],
  cisco_asa: [
    'show version',
    'show ip address',
    'show interface ip brief',
    'show interface summary',
    'show route',
    'show vpn-sessiondb',
    'show vpn-sessiondb anyconnect',
    'show vpn-sessiondb l2l',
    'show conn count',
    'show conn',
    'show xlate count',
    'show xlate',
    'show failover',
    'show failover state',
    'show nat',
    'show access-list',
    'show running-config',
    'show running-config interface',
    'show crypto ipsec sa',
    'show crypto ikev1 sa',
    'show crypto ikev2 sa',
    'show cpu usage',
    'show memory',
    'show logging',
    'show clock',
  ],
};

export const CISCO_DEVICE_PLATFORMS: {
  id: DeviceType;
  label: string;
  category: string;
  sampleCommands: string[];
}[] = [
  {
    id: 'cisco_xe',
    label: 'Cisco IOS-XE (Catalyst / ISR / ASR)',
    category: 'Enterprise Routing & Switching',
    sampleCommands: [
      'show ip interface brief',
      'show ip route summary',
      'show interfaces status',
      'show ip bgp summary',
      'show version',
    ],
  },
  {
    id: 'cisco_ios',
    label: 'Cisco IOS (Classic)',
    category: 'Legacy Campus & Branch',
    sampleCommands: [
      'show ip interface brief',
      'show ip route summary',
      'show interfaces',
      'show version',
      'show running-config',
    ],
  },
  {
    id: 'cisco_nxos',
    label: 'Cisco NX-OS (Nexus Data Center)',
    category: 'Data Center Spine-Leaf & VPC',
    sampleCommands: [
      'show ip interface brief',
      'show interface status',
      'show vpc brief',
      'show port-channel summary',
      'show ip route summary',
    ],
  },
  {
    id: 'cisco_xr',
    label: 'Cisco IOS-XR (Service Provider / Core)',
    category: 'High-Density Carrier Routing',
    sampleCommands: [
      'show interfaces brief',
      'show bgp summary',
      'show route summary',
      'show bfd session',
      'show platform',
    ],
  },
  {
    id: 'cisco_asa',
    label: 'Cisco ASA (Firewall / Security Appliance)',
    category: 'Perimeter Security & VPN',
    sampleCommands: [
      'show interface ip brief',
      'show route',
      'show failover state',
      'show conn count',
      'show vpn-sessiondb anyconnect',
    ],
  },
];

/**
 * Validates a single Cisco show command against platform rules.
 */
export function validateCiscoCommand(
  rawCommand: string,
  platform: DeviceType = 'cisco_xe'
): CommandValidationResult {
  const command = rawCommand.trim();

  if (!command) {
    return {
      command: '',
      isValid: false,
      status: 'warning',
      message: 'Empty command line.',
    };
  }

  const lowerCmd = command.toLowerCase();

  // 1. Enforce strict show command rule
  if (!lowerCmd.startsWith('show ') && lowerCmd !== 'show') {
    // Check if it matches a known dangerous or configuration command
    const matchedDanger = DANGEROUS_PATTERNS.find(
      (p) => lowerCmd === p || lowerCmd.startsWith(`${p} `)
    );
    if (matchedDanger) {
      return {
        command,
        isValid: false,
        status: 'error',
        message: `Command "${matchedDanger}" is mutating or dangerous. DriftGuard enforces show commands only.`,
      };
    }

    return {
      command,
      isValid: false,
      status: 'error',
      message: 'Command must start with "show". DriftGuard enforces read-only show commands only.',
    };
  }

  // 2. Check if a show command contains piped dangerous tokens (e.g. show ... | reload)
  for (const pattern of DANGEROUS_PATTERNS) {
    if (lowerCmd.includes(`| ${pattern}`) || lowerCmd.includes(`; ${pattern}`)) {
      return {
        command,
        isValid: false,
        status: 'error',
        message: `Piped instruction contains forbidden token "${pattern}".`,
      };
    }
  }

  // 3. Platform-specific validation
  const platformTree = PLATFORM_SHOW_TREES[platform] || PLATFORM_SHOW_TREES.cisco_xe;
  const isExactKnown = platformTree.includes(lowerCmd);

  // Check prefix match for commands with arguments (e.g. show interfaces GigabitEthernet0/0/1, show ip bgp 10.0.0.1)
  const isPrefixKnown = platformTree.some(
    (treeCmd) => lowerCmd.startsWith(treeCmd) && (lowerCmd.length === treeCmd.length || lowerCmd[treeCmd.length] === ' ')
  );

  if (isExactKnown || isPrefixKnown) {
    return {
      command,
      isValid: true,
      status: 'verified',
      message: `Read-only safe syntax verified for ${platform.replace('cisco_', 'Cisco ').toUpperCase()}.`,
      normalized: lowerCmd,
    };
  }

  // 4. If command starts with "show" but not in standard curated catalog:
  // It is permitted as custom show command, with a safe advisory notice
  return {
    command,
    isValid: true,
    status: 'warning',
    message: `Read-only show command accepted. Verify parameter syntax matches ${platform.replace('cisco_', 'Cisco ').toUpperCase()} CLI.`,
    normalized: lowerCmd,
  };
}

/**
 * Validates multiple commands in a multiline text block.
 */
export function validateCiscoCommandSuite(
  rawText: string,
  platform: DeviceType
): {
  results: CommandValidationResult[];
  hasErrors: boolean;
  errorMessage: string | null;
  validCommands: string[];
} {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      results: [],
      hasErrors: true,
      errorMessage: 'At least one show command is required.',
      validCommands: [],
    };
  }

  const results: CommandValidationResult[] = lines.map((line) =>
    validateCiscoCommand(line, platform)
  );

  const firstError = results.find((r) => r.status === 'error');
  const validCommands = results.filter((r) => r.isValid).map((r) => r.command);

  return {
    results,
    hasErrors: Boolean(firstError),
    errorMessage: firstError ? firstError.message : null,
    validCommands,
  };
}
