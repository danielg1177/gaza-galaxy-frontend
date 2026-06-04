import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  'https://gaza-galaxy-backend-production.up.railway.app/api';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorized = callback;
}

/** Auth routes handle 401 locally; avoid global logout during login or session bootstrap. */
function shouldNotifyUnauthorized(path: string): boolean {
  return (
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/me') &&
    !path.startsWith('/auth/logout')
  );
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    if (shouldNotifyUnauthorized(path)) {
      onUnauthorized?.();
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    const errorBody = (await response.json()) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiError(
      errorBody.message ?? 'Request failed',
      response.status,
      errorBody.errors,
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
