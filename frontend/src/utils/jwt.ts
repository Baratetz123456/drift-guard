/**
 * JWT Utility Module for DriftGuard
 * Implements RFC 7519 Base64URL encoding/decoding and emulates
 * AWS Cognito User Pool ID token schema.
 */

export interface CognitoJwtPayload {
  sub: string;
  email: string;
  name: string;
  'cognito:groups': string[];
  token_use: 'id';
  email_verified: boolean;
  iss: string;
  iat: number;
  exp: number;
  client_id?: string;
}

export interface DecodedJwt<T = CognitoJwtPayload> {
  header: {
    alg: string;
    typ: string;
  };
  payload: T;
  signature: string;
}

/**
 * Base64URL encoder (safe for browser environments)
 */
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL decoder
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes a JWT token into header, payload, and signature.
 * Returns null if token is malformed.
 */
export function decodeJwt<T = CognitoJwtPayload>(token: string): DecodedJwt<T> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1])) as T;
    const signature = parts[2];

    return { header, payload, signature };
  } catch {
    return null;
  }
}

/**
 * Validates whether a token exists, is structurally valid, and has not expired.
 */
export function isJwtValid(token: string | null | undefined): boolean {
  if (!token) return false;

  const decoded = decodeJwt<CognitoJwtPayload>(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.payload.exp > currentTime;
}

/**
 * Computes remaining seconds before token expiration.
 * Returns 0 if expired or invalid.
 */
export function getJwtRemainingSeconds(token: string | null | undefined): number {
  if (!token) return 0;

  const decoded = decodeJwt<CognitoJwtPayload>(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.payload.exp - currentTime);
}

/**
 * Generates an emulated AWS Cognito User Pool ID token.
 * Default lifespan: 30 minutes (1800 seconds).
 */
export function generateCognitoJwt(
  params: {
    userId?: string;
    email: string;
    name?: string;
    role?: string;
  },
  lifespanSeconds: number = 1800
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + lifespanSeconds;
  const userId = params.userId || `usr-${Date.now().toString(36)}`;
  const role = params.role || 'Network Architect';
  const name = params.name || params.email.split('@')[0].replace('.', ' ').toUpperCase();

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: CognitoJwtPayload = {
    sub: userId,
    email: params.email,
    name,
    'cognito:groups': [role.replace(/\s+/g, '')],
    token_use: 'id',
    email_verified: true,
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/deltanet-user-pool',
    iat,
    exp,
    client_id: 'deltanet-web-client',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const mockSignature = base64UrlEncode(`sig_${signatureInput.length}_driftguard_kms`);

  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}
