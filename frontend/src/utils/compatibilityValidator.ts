import { CommandSet, Device, DeviceType } from '../types';
import { normalizeDeviceType, getDeviceTypeLabel } from './networkValidator';

export interface CompatibilityResult {
  isCompatible: boolean;
  compatibleDevices: Device[];
  incompatibleDevices: Device[];
  requiredDriver?: DeviceType;
  conflictingDrivers: DeviceType[];
  summary: string;
  impact: string;
  nextStep: string;
}

/**
 * Validates that all target devices match the device driver required by the command set profile.
 * DriftGuard enforces strict homogeneity: vendor-specific show commands must not be dispatched
 * to incompatible platform architectures.
 * Uses canonical platform normalization so that naming variations (e.g. "cisco ios xe" vs "cisco_xe")
 * resolve accurately.
 */
export function validateCommandSetCompatibility(
  commandSet: CommandSet | undefined | null,
  devices: Device[]
): CompatibilityResult {
  if (!commandSet) {
    return {
      isCompatible: false,
      compatibleDevices: [],
      incompatibleDevices: [],
      conflictingDrivers: [],
      summary: 'No command set profile selected',
      impact: 'Execution cannot be scheduled without a valid command profile.',
      nextStep: 'Select an authorized command set from the profile catalog.',
    };
  }

  const requiredDriver = normalizeDeviceType(commandSet.deviceType) || commandSet.deviceType;
  const requiredLabel = getDeviceTypeLabel(requiredDriver);

  if (devices.length === 0) {
    return {
      isCompatible: false,
      compatibleDevices: [],
      incompatibleDevices: [],
      requiredDriver: requiredDriver as DeviceType,
      conflictingDrivers: [],
      summary: 'No target devices selected',
      impact: 'Zero nodes targeted for telemetry collection.',
      nextStep: 'Select at least one network device or device group.',
    };
  }

  const compatibleDevices: Device[] = [];
  const incompatibleDevices: Device[] = [];
  const conflictingDriversSet = new Set<DeviceType>();

  devices.forEach((dev) => {
    const devDriver = normalizeDeviceType(dev.deviceType) || dev.deviceType;
    if (devDriver === requiredDriver) {
      compatibleDevices.push(dev);
    } else {
      incompatibleDevices.push(dev);
      conflictingDriversSet.add(dev.deviceType);
    }
  });

  const conflictingDrivers = Array.from(conflictingDriversSet);
  const conflictingLabels = conflictingDrivers.map((d) => getDeviceTypeLabel(d));
  const isCompatible = incompatibleDevices.length === 0;

  if (isCompatible) {
    return {
      isCompatible: true,
      compatibleDevices,
      incompatibleDevices: [],
      requiredDriver: requiredDriver as DeviceType,
      conflictingDrivers: [],
      summary: `All ${devices.length} target node${devices.length === 1 ? '' : 's'} match the ${requiredLabel} driver profile.`,
      impact: 'All show commands in this profile are syntactically valid for the target platform.',
      nextStep: 'Ready to proceed with telemetry capture.',
    };
  }

  return {
    isCompatible: false,
    compatibleDevices,
    incompatibleDevices,
    requiredDriver: requiredDriver as DeviceType,
    conflictingDrivers: conflictingDrivers as DeviceType[],
    summary: `Driver mismatch: Command set "${commandSet.name}" requires ${requiredLabel} (${requiredDriver}), but ${incompatibleDevices.length} target node${
      incompatibleDevices.length === 1 ? '' : 's'
    } operate on mismatched platform${conflictingDrivers.length === 1 ? '' : 's'} (${conflictingLabels.join(', ')}).`,
    impact:
      'Dispatching vendor-specific CLI show commands across mismatched platform architectures will trigger syntax rejections, parser exceptions, or connection drops.',
    nextStep: `Switch to a command profile built for ${conflictingLabels.join(
      ' / '
    )} or adjust the target selection to include only ${requiredLabel} nodes.`,
  };
}

/**
 * Returns whether a command set is compatible with a given list of devices.
 * Uses canonical platform normalization.
 */
export function isCommandSetCompatible(commandSet: CommandSet, devices: Device[]): boolean {
  if (devices.length === 0) return false;
  const reqDriver = normalizeDeviceType(commandSet.deviceType) || commandSet.deviceType;
  return devices.every((d) => {
    const devDriver = normalizeDeviceType(d.deviceType) || d.deviceType;
    return devDriver === reqDriver;
  });
}
