import { DeviceType } from '../types';

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
    aliases: ['cisco_xe', 'ios-xe', 'ios_xe', 'xe', 'ciscoxe'],
  },
  {
    id: 'cisco_ios',
    label: 'Cisco IOS',
    aliases: ['cisco_ios', 'ios', 'cisco-ios', 'ciscoios'],
  },
  {
    id: 'cisco_nxos',
    label: 'Cisco NX-OS',
    aliases: ['cisco_nxos', 'nx-os', 'nxos', 'cisco-nxos', 'cisconxos'],
  },
  {
    id: 'cisco_xr',
    label: 'Cisco IOS-XR',
    aliases: ['cisco_xr', 'ios-xr', 'ios_xr', 'xr', 'ciscoxr'],
  },
  {
    id: 'cisco_asa',
    label: 'Cisco ASA',
    aliases: ['cisco_asa', 'asa', 'cisco-asa', 'ciscoasa'],
  },
];

/**
 * Live validator for IPv4 (RFC 791) and IPv6 (RFC 4291) addresses.
 */
export function validateIpAddress(rawIp: string): IpValidationResult {
  const ip = rawIp.trim();

  if (!ip) {
    return { isValid: false, error: 'Empty IP address' };
  }

  // 1. IPv4 Validation
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = ip.match(ipv4Pattern);

  if (ipv4Match) {
    const octets = [
      Number(ipv4Match[1]),
      Number(ipv4Match[2]),
      Number(ipv4Match[3]),
      Number(ipv4Match[4]),
    ];

    // Check for leading zeros (e.g. 01.02.03.04 is invalid)
    for (let i = 1; i <= 4; i++) {
      if (ipv4Match[i].length > 1 && ipv4Match[i].startsWith('0')) {
        return {
          isValid: false,
          error: `Octet ${ipv4Match[i]} contains illegal leading zero`,
        };
      }
    }

    // Check bounds 0-255
    const outOfBounds = octets.find((o) => o < 0 || o > 255);
    if (outOfBounds !== undefined) {
      return {
        isValid: false,
        error: `Octet ${outOfBounds} out of bounds (0–255)`,
      };
    }

    return {
      isValid: true,
      version: 'IPv4',
      normalized: ip,
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
  const normalized = rawType.trim().toLowerCase().replace(/[\s_-]+/g, '_');

  if (!normalized) {
    return {
      isValid: false,
      deviceType: null,
      error: 'Empty device type',
    };
  }

  for (const platform of SUPPORTED_DEVICE_TYPES) {
    if (
      platform.id === normalized ||
      platform.aliases.some((alias) => alias.toLowerCase() === normalized)
    ) {
      return {
        isValid: true,
        deviceType: platform.id,
        label: platform.label,
      };
    }
  }

  return {
    isValid: false,
    deviceType: null,
    error: `Unsupported device type "${rawType}". Supported: cisco_xe, cisco_ios, cisco_nxos, cisco_xr, cisco_asa`,
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

