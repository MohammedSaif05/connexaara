/**
 * api.ts
 *
 * Centralized API service layer.
 * All network requests go through this module.
 * Never call `fetch` directly from a screen component.
 */

import { getAuthData } from './storage';

// --- Config ---
const BASE_URL = 'https://campus-connect-backend-hlty.onrender.com/api/v1';

const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

// --- Types ---

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'HOD' | 'STAFF' | 'STUDENT';
    isTutor: boolean;
    departmentId: string | null;
    collegeId: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;
    department: {
      id: string;
      name: string;
    } | null;
  };
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Internal helpers ---

/**
 * Wraps a fetch promise with a timeout.
 * Rejects with a timeout error if the request takes too long.
 */
const fetchWithTimeout = (
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ApiError(0, 'Request timed out. Please check your connection.'));
    }, timeoutMs);

    fetch(url, options)
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(new ApiError(0, 'Network error. Please check your connection.'));
      });
  });
};

/**
 * Builds headers for authenticated requests.
 * Reads the stored token and adds the Authorization header.
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const authData = await getAuthData();
  return {
    'Content-Type': 'application/json',
    ...(authData?.token ? { Authorization: `Bearer ${authData.token}` } : {}),
  };
};

/**
 * Generic JSON request handler.
 * Throws an ApiError with the server's error message for non-2xx responses.
 */
const request = async <T>(
  method: string,
  path: string,
  body?: object,
  authenticated = false,
): Promise<T> => {
  const headers: Record<string, string> = authenticated
    ? await getAuthHeaders()
    : { 'Content-Type': 'application/json' };

  const response = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Extract the server's error message if it exists
    const message =
      data?.message ||
      (Array.isArray(data?.message) ? data.message[0] : null) ||
      `Server error (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return data as T;
};

// --- Auth Endpoints ---

/**
 * POST /auth/login
 * Authenticates a user with email and password.
 */
export const login = (email: string, password: string): Promise<LoginResponse> =>
  request<LoginResponse>('POST', '/auth/login', { email, password });
