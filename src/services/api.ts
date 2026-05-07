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
    batch: {
      id: string;
      name: string;
      startYear: number;
      endYear: number;
      currentSemester: number;
      isPassedOut: boolean;
    } | null;
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

// --- Staff Endpoints ---

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  isTutor: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StaffListResponse {
  data: StaffMember[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * GET /staff?page=1&limit=10&search=...&isActive=true|false
 * Returns a paginated list of staff members.
 */
export const getStaff = (
  page: number,
  limit: number,
  search: string,
  isActive: boolean = true,
): Promise<StaffListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    isActive: String(isActive),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  return request<StaffListResponse>('GET', `/staff?${params.toString()}`, undefined, true);
};

/**
 * POST /staff
 * Creates a new staff member. isTutor is always false on creation.
 */
export const createStaff = (name: string, email: string): Promise<StaffMember> =>
  request<StaffMember>('POST', '/staff', { name, email, isTutor: false }, true);

export interface StaffDetail extends StaffMember {
  mustChangePassword: boolean;
  department: { id: string; name: string } | null;
}

/**
 * GET /staff/:id
 * Fetches full details for a single staff member.
 */
export const getStaffById = (id: string): Promise<StaffDetail> =>
  request<StaffDetail>('GET', `/staff/${id}`, undefined, true);

/**
 * PATCH /staff/:id
 * Updates an existing staff member's name, email, and/or isTutor.
 */
export const updateStaff = (
  id: string,
  payload: { name: string; email: string; isTutor: boolean },
): Promise<StaffDetail> =>
  request<StaffDetail>('PATCH', `/staff/${id}`, payload, true);

/**
 * PATCH /staff/:id/deactivate
 * Deactivates a staff member (sets isActive to false).
 */
export const deactivateStaff = (id: string): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/staff/${id}/deactivate`, undefined, true);

/**
 * PATCH /staff/:id/activate
 * Re-activates a previously deactivated staff member.
 */
export const activateStaff = (id: string): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/staff/${id}/activate`, undefined, true);

// ─────────────────────────────────────────────────────────────────────────────
// Batch API
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchTutor {
  id: string;
  name: string;
  email: string;
}

export interface Batch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  currentSemester: number;
  isPassedOut: boolean;
  tutorId: string | null;
  tutor: BatchTutor | null;
  _count: { students: number };
}

export interface BatchListResponse {
  data: Batch[];
  meta: { total: number; page: number; limit: number };
}

/**
 * GET /batches?page=1&limit=10&search=...&isPassedOut=false|true
 * Returns a paginated list of batches.
 */
export const getBatches = (
  page: number,
  limit: number,
  search: string,
  isPassedOut: boolean,
): Promise<BatchListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    isPassedOut: String(isPassedOut),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  return request<BatchListResponse>('GET', `/batches?${params.toString()}`, undefined, true);
};

export interface SubjectAssignment {
  id: string;
  subject: { id: string; name: string; subjectCode: string };
  staff: { id: string; name: string; email: string } | null;
}

export interface StaffBatchMapping {
  id: string;
  roleType: string;
  staff: { id: string; name: string; email: string };
}

export interface BatchDetail {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  currentSemester: number;
  isPassedOut: boolean;
  tutorId: string | null;
  tutor: BatchTutor | null;
  department: { id: string; name: string } | null;
  _count: { students: number; subjectAssignments: number };
  subjectAssignments: SubjectAssignment[];
  staffBatchMappings: StaffBatchMapping[];
}

export interface AvailableTutor {
  id: string;
  name: string;
  email: string;
  isTutor: boolean;
}

/**
 * POST /batches
 * Creates a new batch.
 */
export const createBatch = (payload: {
  name: string;
  startYear: number;
  endYear: number;
  currentSemester: number;
}): Promise<Batch> =>
  request<Batch>('POST', '/batches', payload, true);

/**
 * GET /batches/:id
 * Returns full batch detail including tutor, department, subjects, mappings.
 */
export const getBatchById = (id: string): Promise<BatchDetail> =>
  request<BatchDetail>('GET', `/batches/${id}`, undefined, true);

/**
 * GET /batches/available-tutors
 * Returns active staff not currently tutoring any active batch.
 */
export const getAvailableTutors = (): Promise<AvailableTutor[]> =>
  request<AvailableTutor[]>('GET', '/batches/available-tutors', undefined, true);

/**
 * PATCH /batches/:id/assign-tutor
 * Assigns a staff member as the tutor for the batch.
 */
export const assignTutor = (
  batchId: string,
  staffId: string,
): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/batches/${batchId}/assign-tutor`, { staffId }, true);

/**
 * PATCH /batches/:id/promote
 * Increments currentSemester by 1. Errors at final semester.
 */
export const promoteBatch = (id: string): Promise<Batch> =>
  request<Batch>('PATCH', `/batches/${id}/promote`, undefined, true);

/**
 * PATCH /batches/:id/passout
 * Marks a batch as passed out (irreversible).
 */
export const passoutBatch = (id: string): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/batches/${id}/passout`, undefined, true);

// ─────────────────────────────────────────────────────────────────────────────
// Student API
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentListItem {
  id: string;
  name: string;
  registerNumber: string;
  isActive: boolean;
}

export interface StudentListResponse {
  data: StudentListItem[];
  meta: { total: number; page: number; limit: number };
}

export interface StudentDetail {
  id: string;
  registerNumber: string;
  batchId: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;
  };
  batch: {
    id: string;
    name: string;
    startYear: number;
    endYear: number;
    currentSemester: number;
    isPassedOut: boolean;
  };
  _count: { odRequests: number };
}

/**
 * GET /students?batchId=&page=1&limit=10&search=&isActive=true
 * Returns a paginated list of students for the tutor's batch.
 */
export const getStudents = (
  batchId: string,
  page: number,
  limit: number,
  search: string,
  isActive: boolean = true,
): Promise<StudentListResponse> => {
  const params = new URLSearchParams({
    batchId,
    page: String(page),
    limit: String(limit),
    isActive: String(isActive),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  return request<StudentListResponse>('GET', `/students?${params.toString()}`, undefined, true);
};

/**
 * POST /students
 * Creates a new student.
 */
export const createStudent = (payload: {
  name: string;
  email: string;
  registerNumber: string;
  dob: string;
  batchId: string;
}): Promise<{ id: string; name: string; email: string; student: { id: string; registerNumber: string; batchId: string } }> =>
  request('POST', '/students', payload, true);

/**
 * GET /students/:id
 * Returns full detail of a single student.
 */
export const getStudentById = (id: string): Promise<StudentDetail> =>
  request<StudentDetail>('GET', `/students/${id}`, undefined, true);

/**
 * PATCH /students/:id
 * Updates an existing student.
 */
export const updateStudent = (id: string, payload: {
  name?: string;
  email?: string;
  registerNumber?: string;
  dob?: string;
}): Promise<StudentDetail> =>
  request<StudentDetail>('PATCH', `/students/${id}`, payload, true);

/**
 * PATCH /students/:id/deactivate
 * Deactivates a student.
 */
export const deactivateStudent = (id: string): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/students/${id}/deactivate`, undefined, true);

/**
 * PATCH /students/:id/activate
 * Activates a student.
 */
export const activateStudent = (id: string): Promise<{ message: string }> =>
  request<{ message: string }>('PATCH', `/students/${id}/activate`, undefined, true);

// ─────────────────────────────────────────────────────────────────────────────
// Subject API
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectListItem {
  id: string;
  name: string;
  subjectCode: string;
  departmentId: string;
  semester: number;
}

export interface SubjectListResponse {
  data: SubjectListItem[];
  meta: { total: number; page: number; limit: number };
}

export interface SubjectDetail {
  id: string;
  name: string;
  subjectCode: string;
  semester: number;
  departmentId: string;
  department: {
    id: string;
    name: string;
  };
  assignments: {
    id: string;
    batch: { id: string; name: string };
    staff: { id: string; name: string; email: string } | null;
  }[];
  _count: { timetableSlots: number };
}

/**
 * GET /subjects?page=1&limit=10&search=&semester=3
 * Returns a paginated list of subjects.
 */
export const getSubjects = (
  page: number,
  limit: number,
  search: string,
  semester?: number,
): Promise<SubjectListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(semester !== undefined ? { semester: String(semester) } : {}),
  });
  return request<SubjectListResponse>('GET', `/subjects?${params.toString()}`, undefined, true);
};

/**
 * GET /subjects/:id
 * Returns full detail of a single subject.
 */
export const getSubjectById = (id: string): Promise<SubjectDetail> =>
  request<SubjectDetail>('GET', `/subjects/${id}`, undefined, true);

/**
 * POST /subjects
 * Creates a new subject.
 */
export const createSubject = (payload: {
  name: string;
  subjectCode: string;
  departmentId: string;
  semester: number;
}): Promise<SubjectListItem> =>
  request<SubjectListItem>('POST', '/subjects', payload, true);

/**
 * POST /subjects/assign
 * Assigns a subject to a batch with a staff member.
 */
export const assignSubject = (payload: {
  subjectId: string;
  batchId: string;
  staffId: string;
}): Promise<{ message: string }> =>
  request<{ message: string }>('POST', '/subjects/assign', payload, true);
