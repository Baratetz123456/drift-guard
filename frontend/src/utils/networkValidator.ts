import type { DeviceType } from '../types';

export interface IpValidationResult {
  isValid: boolean;
  version?: 'IPv4' | 'IPv6';
  error?: string;
  normalized?: string;
}

export interface DeviceTypeValidationResult {
  isValid: boolean;
  deviceType: DeviceType | null;
  label?: string;
  error?: string;
}

// Canonical platform metadata for the top 5 supported Cisco operating systems
export const SUPPORTED_DEVICE_TYPES: {
  id: DeviceType;
  label: string;
  aliases: string[];
}[] = [
  {
    id: 'cisco_xe',
    label: 'Cisco IOS-XE',
    aliases: [
      'cisco_xe',
      'cisco_ios_xe',
      'cisco ios xe',
      'cisco-ios-xe',
      'ciscoiosxe',
      'ios-xe',
      'ios_xe',
      'ios xe',
      'iosxe',
      'xe',
      'ciscoxe',
      'cisco ios-xe',
    ],
  },
  {
    id: 'cisco_ios',
    label: 'Cisco IOS',
    aliases: [
      'cisco_ios',
      'cisco ios',
      'cisco-ios',
      'ciscoios',
      'ios',
      'classic-ios',
      'ios-classic',
      'cisco-classic',
      'cisco classic',
      'cisco_classic',
    ],
  },
  {
    id: 'cisco_nxos',
    label: 'Cisco NX-OS',
    aliases: [
      'cisco_nxos',
      'cisco nxos',
      'cisco nx-os',
      'cisco_nx_os',
      'nx-os',
      'nxos',
      'nx_os',
      'nx os',
      'cisco-nxos',
      'cisconxos',
    ],
  },
  {
    id: 'cisco_xr',
    label: 'Cisco IOS-XR',
    aliases: [
      'cisco_xr',
      'cisco ios xr',
      'cisco_ios_xr',
      'cisco-ios-xr',
      'ciscoiosxr',
      'cisco xr',
      'ios-xr',
      'ios_xr',
      'ios xr',
      'xr',
      'ciscoxr',
    ],
  },
  {
    id: 'cisco_asa',
    label: 'Cisco ASA',
    aliases: [
      'cisco_asa',
      'cisco asa',
      'cisco-asa',
      'ciscoasa',
      'asa',
      'asa-firewall',
      'cisco-asa-firewall',
    ],
  },
];

/**
 * Canonical normalizer for Cisco platform driver identifiers.
 * Strips whitespace, hyphens, and underscores, mapping strings like "cisco ios xe",
 * "cisco_ios_xe", "ios-xe", "Cisco IOS-XE" to the canonical ID "cisco_xe".
 */
export function normalizeDeviceType(rawType: string | undefined | null): DeviceType | null {
  if (!rawType) return null;
  const trimmed = rawType.trim().toLowerCase();
  if (!trimmed) return null;

  // Direct canonical match
  for (const platform of SUPPORTED_DEVICE_TYPES) {
    if (platform.id === trimmed) {
      return platform.id;
    }
  }

  // Check aliases directly with normalized underscores
  const withUnderscores = trimmed.replace(/[\s-]+/g, '_');
  for (const platform of SUPPORTED_DEVICE_TYPES) {
    if (platform.id === withUnderscores) {
      return platform.id;
    }
    if (
      platform.aliases.some(
        (alias) =>
          alias.toLowerCase() === trimmed ||
          alias.toLowerCase() === withUnderscores
      )
    ) {
      return platform.id;
    }
  }

  // Aggressive alphanumeric compaction check (e.g. "ciscoiosxe" -> "cisco_xe")
  const stripped = trimmed.replace(/[^a-z0-9]/g, '');
  for (const platform of SUPPORTED_DEVICE_TYPES) {
    if (platform.id.replace(/[^a-z0-9]/g, '') === stripped) {
      return platform.id;
    }
    if (
      platform.aliases.some(
        (alias) => alias.replace(/[^a-z0-9]/g, '') === stripped
      )
    ) {
      return platform.id;
    }
  }

  return null;
}

/**
 * Returns a human-friendly display label for a given device type or raw string.
 * e.g. "cisco_xe" -> "Cisco IOS-XE", "cisco ios xe" -> "Cisco IOS-XE"
 */
export function getDeviceTypeLabel(rawType: string | undefined | null): string {
  const normalized = normalizeDeviceType(rawType);
  if (normalized) {
    const platform = SUPPORTED_DEVICE_TYPES.find((p) => p.id === normalized);
    if (platform) return platform.label;
  }
  return rawType || 'Unknown Device Type';
}

/**
 * Live validator for IPv4 (RFC 791) and IPv6 (RFC 4291) addresses.
 */
export function validateIpAddress(rawIp: string): IpValidationResult {
  const ip = rawIp.trim();

  if (!ip) {
    return { isValid: false, error: 'Empty IP address' };
  }

  // 1. IPv4 Validation
  const ipv4Parts = ip.split('.');
  if (ipv4Parts.length === 4) {
    const areAllOctetsValid = ipv4Parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && (part === '0' || !part.startsWith('0'));
    });

    if (areAllOctetsValid) {
      // Prohibit common invalid broadcast / zero octets for host addresses
      const first = parseInt(ipv4Parts[0], 10);
      if (first === 0 || first === 255) {
        return { isValid: false, error: 'Invalid leading octet for host address' };
      }
      return {
        isValid: true,
        version: 'IPv4',
        normalized: ip,
      };
    }
    return {
      isValid: false,
      error: 'Invalid IPv4 octet. Each octet must be an integer between 0 and 255 with no leading zeros',
    };
  }

  // 2. IPv6 Validation
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;

  if (ipv6Pattern.test(ip)) {
    return {
      isValid: true,
      version: 'IPv6',
      normalized: ip.toLowerCase(),
    };
  }

  return {
    isValid: false,
    error: 'Invalid IP format. Must be valid IPv4 (e.g. 10.200.1.1) or IPv6',
  };
}

/**
 * Live availability validator for Cisco operating system drivers.
 */
export function validateDeviceType(rawType: string): DeviceTypeValidationResult {
  const normalized = normalizeDeviceType(rawType);

  if (!normalized) {
    if (!rawType || !rawType.trim()) {
      return {
        isValid: false,
        deviceType: null,
        error: 'Empty device type',
      };
    }
    return {
      isValid: false,
      deviceType: null,
      error: `Unsupported device type "${rawType}". Supported: cisco_xe, cisco_ios, cisco_nxos, cisco_xr, cisco_asa`,
    };
  }

  const platform = SUPPORTED_DEVICE_TYPES.find((p) => p.id === normalized)!;
  return {
    isValid: true,
    deviceType: platform.id,
    label: platform.label,
  };
}

export interface ConnectionTypeValidationResult {
  isValid: boolean;
  connectionType: 'ssh' | 'telnet' | null;
  defaultPort: number;
  error?: string;
}

/**
 * Live validator for device connection protocol (SSH vs Telnet).
 */
export function validateConnectionType(rawConn: string): ConnectionTypeValidationResult {
  const normalized = rawConn.trim().toLowerCase();

  if (!normalized) {
    return {
      isValid: false,
      connectionType: null,
      defaultPort: 22,
      error: 'Empty connection protocol',
    };
  }

  if (normalized === 'ssh') {
    return {
      isValid: true,
      connectionType: 'ssh',
      defaultPort: 22,
    };
  }

  if (normalized === 'telnet') {
    return {
      isValid: true,
      connectionType: 'telnet',
      defaultPort: 23,
    };
  }

  return {
    isValid: false,
    connectionType: null,
    defaultPort: 22,
    error: `Unsupported protocol "${rawConn}". Allowed: ssh, telnet`,
  };
}

