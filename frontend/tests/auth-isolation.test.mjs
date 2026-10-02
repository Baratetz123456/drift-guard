import assert from 'node:assert/strict';

// Simple deterministic DJB2 / FNV-1a hash matching frontend jwt.ts
function resolveDeterministicUserId(email) {
  const clean = email.trim().toLowerCase();
  if (clean === 'operator@driftguard.local') {
    return 'user_default';
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  let hash2 = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash2 = (Math.imul(hash2, 33) ^ clean.charCodeAt(i)) >>> 0;
  }
  const hex2 = (hash2 >>> 0).toString(16).padStart(4, '0').slice(0, 4);
  return `usr_${hex}${hex2}`;
}

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return { payload };
  } catch {
    return null;
  }
}

function isJwtValid(token) {
  if (!token) return false;
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return decoded.payload.exp > now;
}

function generateCognitoJwt(params, lifespanSeconds = 1800) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + lifespanSeconds;
  const userId = params.userId || resolveDeterministicUserId(params.email);
  const role = params.role || 'Network Architect';
  const name = params.name || params.email.split('@')[0].replace('.', ' ').toUpperCase();

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    email: params.email,
    name,
    'cognito:groups': [role.replace(/\s+/g, '')],
    token_use: 'id',
    iss: 'https://auth.driftguard.internal/oauth2/token',
    iat,
    exp,
  };

  const toB64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${toB64(header)}.${toB64(payload)}.mockSignature`;
}

console.log('--- RUNNING AUTHENTICATION & MULTI-TENANT ISOLATION TESTS ---');

// Test 1: Deterministic User ID Resolution
console.log('Test 1: Deterministic User ID Resolution');
const demoId = resolveDeterministicUserId('operator@driftguard.local');
assert.equal(demoId, 'user_default', 'Default operator must map to user_default');

const userAId1 = resolveDeterministicUserId('alice@enterprise.com');
const userAId2 = resolveDeterministicUserId('alice@enterprise.com');
assert.equal(userAId1, userAId2, 'Same email must produce identical user ID across invocations');
assert.ok(userAId1.startsWith('usr_'), 'User ID must start with usr_');

const userBId = resolveDeterministicUserId('bob@enterprise.com');
assert.notEqual(userAId1, userBId, 'Different users must have distinct user IDs');
console.log('✓ Deterministic User ID Resolution passed.');

// Test 2: Token Generation and Validation
console.log('Test 2: Token Generation and Validation');
const token = generateCognitoJwt({ email: 'alice@enterprise.com', name: 'Alice Engineer' }, 1800);
assert.ok(token, 'JWT token must be generated');
assert.equal(isJwtValid(token), true, 'Newly generated token must be valid');

const decoded = decodeJwt(token);
assert.ok(decoded && decoded.payload, 'Token must decode into valid payload');
assert.equal(decoded.payload.sub, userAId1, 'Token sub must equal deterministic user ID');
assert.equal(decoded.payload.email, 'alice@enterprise.com');

// Expired token check
const expiredToken = generateCognitoJwt({ email: 'alice@enterprise.com' }, -10);
assert.equal(isJwtValid(expiredToken), false, 'Expired token must fail validation');
assert.equal(isJwtValid(null), false, 'Null token must fail validation');
assert.equal(isJwtValid('invalid.jwt'), false, 'Malformed token must fail validation');
console.log('✓ Token Generation and Validation passed.');

// Test 3: Storage Key Partitioning
console.log('Test 3: Storage Key Partitioning');
function getUserStorageKey(baseKey, userId) {
  const id = userId || 'default';
  return `driftguard_${id}_${baseKey}`;
}

const keyA = getUserStorageKey('devices', userAId1);
const keyB = getUserStorageKey('devices', userBId);
const keyDemo = getUserStorageKey('devices', demoId);

assert.notEqual(keyA, keyB, 'Storage keys for distinct users must be segregated');
assert.notEqual(keyA, keyDemo, 'User storage keys must not collide with demo account');
assert.equal(keyA, `driftguard_${userAId1}_devices`);
assert.equal(keyB, `driftguard_${userBId}_devices`);
assert.equal(keyDemo, 'driftguard_user_default_devices');
console.log('✓ Storage Key Partitioning passed.');

console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY ---');
