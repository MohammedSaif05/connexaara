/**
 * storage.ts
 *
 * A thin, typed wrapper around AsyncStorage.
 * All persistent app data is managed through this module.
 * Never call AsyncStorage directly from a screen — always use these helpers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Storage Keys (single source of truth) ---
const KEYS = {
  TERMS_AGREED: '@connexaara/terms_agreed',
  AUTH_TOKEN: '@connexaara/auth_token',
  USER_ROLE: '@connexaara/user_role',
  IS_TUTOR: '@connexaara/is_tutor',
  USER_ID: '@connexaara/user_id',
  USER_NAME: '@connexaara/user_name',
  USER_EMAIL: '@connexaara/user_email',
  DEPT_NAME: '@connexaara/dept_name',
} as const;

// --- Types ---
export type UserRole = 'HOD' | 'STAFF' | 'STUDENT';

export interface StoredAuthData {
  token: string;
  role: UserRole;
  isTutor: boolean;
  userId: string;
  name: string;
  email: string;
  departmentName: string;
}

// --- Terms Agreement ---

export const saveTermsAgreed = async (): Promise<void> => {
  await AsyncStorage.setItem(KEYS.TERMS_AGREED, 'true');
};

export const getTermsAgreed = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(KEYS.TERMS_AGREED);
  return value === 'true';
};

// --- Authentication ---

export const saveAuthData = async (data: StoredAuthData): Promise<void> => {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, data.token);
  await AsyncStorage.setItem(KEYS.USER_ROLE, data.role);
  await AsyncStorage.setItem(KEYS.IS_TUTOR, String(data.isTutor));
  await AsyncStorage.setItem(KEYS.USER_ID, data.userId);
  await AsyncStorage.setItem(KEYS.USER_NAME, data.name);
  await AsyncStorage.setItem(KEYS.USER_EMAIL, data.email);
  await AsyncStorage.setItem(KEYS.DEPT_NAME, data.departmentName);
};

export const getAuthData = async (): Promise<StoredAuthData | null> => {
  const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  const role = await AsyncStorage.getItem(KEYS.USER_ROLE) as UserRole | null;
  const isTutor = await AsyncStorage.getItem(KEYS.IS_TUTOR);
  const userId = await AsyncStorage.getItem(KEYS.USER_ID);
  const name = await AsyncStorage.getItem(KEYS.USER_NAME);
  const email = await AsyncStorage.getItem(KEYS.USER_EMAIL);
  const departmentName = await AsyncStorage.getItem(KEYS.DEPT_NAME);

  if (!token || !role || !userId) return null;

  return {
    token,
    role,
    isTutor: isTutor === 'true',
    userId,
    name: name ?? '',
    email: email ?? '',
    departmentName: departmentName ?? '',
  };
};

export const clearAuthData = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  await AsyncStorage.removeItem(KEYS.USER_ROLE);
  await AsyncStorage.removeItem(KEYS.IS_TUTOR);
  await AsyncStorage.removeItem(KEYS.USER_ID);
};

// --- Token Utilities ---

/**
 * Decodes a JWT payload without verifying the signature.
 * Used only for reading expiry time locally.
 * NEVER use this for security-sensitive decisions.
 */
/** Pure JS base64 decoder — no browser/Node globals required. */
const base64Decode = (input: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  // Remove non-base64 characters
  const str = input.replace(/[^A-Za-z0-9+/=]/g, '');
  while (i < str.length) {
    const enc1 = chars.indexOf(str[i++]);
    const enc2 = chars.indexOf(str[i++]);
    const enc3 = chars.indexOf(str[i++]);
    const enc4 = chars.indexOf(str[i++]);
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }
  return output;
};

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Normalize base64url → base64, then pad to a multiple of 4
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const decoded = base64Decode(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

/**
 * Returns true if the stored JWT has expired.
 * The `exp` field in a JWT is a Unix timestamp in seconds.
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // If we can't decode it, treat it as expired for safety
    return true;
  }
  // Add a 60-second buffer to prevent edge-case expiry during transition
  return payload.exp * 1000 < Date.now() - 60_000;
};
