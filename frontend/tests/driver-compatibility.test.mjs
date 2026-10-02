import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommandSetCompatibility, isCommandSetCompatible } from '../src/utils/compatibilityValidator.ts';

describe('Driver Compatibility Matrix & Invariance Tests', () => {
  const standardIosXeSet = {
    setId: 'set-standard',
    userId: 'user-default',
    name: 'Standard Operational Health',
    description: 'Core show commands for Cisco IOS-XE',
    deviceType: 'cisco_xe',
    commands: ['show ip interface brief', 'show version'],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('Compatible: Standard Cisco IOS-XE device with deviceType="cisco_xe"', () => {
    const dev = {
      deviceId: 'dev-001',
      userId: 'user-default',
      name: 'Cat-9300-Core',
      hostname: '10.100.1.1',
      port: 22,
      deviceType: 'cisco_xe',
      authType: 'password',
      username: 'admin',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateCommandSetCompatibility(standardIosXeSet, [dev]);
    assert.equal(result.isCompatible, true, 'Device should be compatible');
    assert.equal(result.compatibleDevices.length, 1);
    assert.equal(result.incompatibleDevices.length, 0);
    assert.match(result.summary, /match the Cisco IOS-XE driver profile/);
    assert.equal(isCommandSetCompatible(standardIosXeSet, [dev]), true);
  });

  test('Compatible: Device with only raw backend "driver" field and undefined "deviceType"', () => {
    const dev = {
      deviceId: 'dev-002',
      userId: 'user-default',
      name: 'Cat-9400-Dist',
      hostname: '10.100.1.2',
      port: 22,
      driver: 'cisco_xe', // DeviceType is omitted or undefined
      authType: 'password',
      username: 'admin',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateCommandSetCompatibility(standardIosXeSet, [dev]);
    assert.equal(result.isCompatible, true, 'Device with fallback driver field should be compatible');
    assert.equal(result.compatibleDevices.length, 1);
    assert.equal(result.incompatibleDevices.length, 0);
    assert.equal(isCommandSetCompatible(standardIosXeSet, [dev]), true);
  });

  test('Compatible: Device registered with human-friendly alias "cisco ios xe"', () => {
    const dev = {
      deviceId: 'dev-003',
      userId: 'user-default',
      name: 'ISR-4451-Branch',
      hostname: '10.100.1.3',
      port: 22,
      deviceType: 'cisco ios xe', // un-normalized alias
      authType: 'password',
      username: 'admin',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateCommandSetCompatibility(standardIosXeSet, [dev]);
    assert.equal(result.isCompatible, true, 'Un-normalized alias should resolve to cisco_xe');
    assert.equal(result.compatibleDevices.length, 1);
    assert.equal(result.incompatibleDevices.length, 0);
    assert.equal(isCommandSetCompatible(standardIosXeSet, [dev]), true);
  });

  test('Compatible: CommandSet with fallback "driver" field and Device with "deviceType"', () => {
    const commandSetWithDriver = {
      setId: 'set-custom',
      userId: 'user-default',
      name: 'Custom IOS-XE Profile',
      description: 'Test',
      driver: 'cisco_xe',
      commands: ['show ip route'],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dev = {
      deviceId: 'dev-004',
      userId: 'user-default',
      name: 'Cat-9500-Core',
      hostname: '10.100.1.4',
      port: 22,
      deviceType: 'cisco_xe',
      authType: 'password',
      username: 'admin',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateCommandSetCompatibility(commandSetWithDriver, [dev]);
    assert.equal(result.isCompatible, true, 'Command set with driver field should be compatible');
  });

  test('Incompatible: Cisco IOS-XR node against Cisco IOS-XE command set (true mismatch)', () => {
    const devXr = {
      deviceId: 'dev-xr-01',
      userId: 'user-default',
      name: 'ASR-9000-Core',
      hostname: '10.200.1.1',
      port: 22,
      deviceType: 'cisco_xr',
      authType: 'password',
      username: 'admin',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = validateCommandSetCompatibility(standardIosXeSet, [devXr]);
    assert.equal(result.isCompatible, false, 'True platform mismatch must be caught');
    assert.equal(result.incompatibleDevices.length, 1);
    assert.match(result.summary, /Driver mismatch/);
    assert.equal(isCommandSetCompatible(standardIosXeSet, [devXr]), false);
  });
});
