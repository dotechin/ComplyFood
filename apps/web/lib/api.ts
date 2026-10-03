const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : '/api/v1';

const AUTH_COOKIE = 'auth_token';

export function getApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const token = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return token ? decodeURIComponent(token.split('=').slice(1).join('=')) : null;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') ?? getCookie(AUTH_COOKIE);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ApiGetOptions {
  signal?: AbortSignal;
  cache?: RequestCache;
}

export function apiGet<T>(path: string, options: ApiGetOptions = {}): Promise<T> {
  return request<T>(path, { method: 'GET', ...options });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: 'Bearer ' + token } : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Upload failed');
  }

  return res.json();
}

export const DOWNLOAD_URL_REVOKE_DELAY_MS = 10_000;

/** Authenticated GET that returns the raw response body as a Blob. */
export async function apiFetchBlob(path: string, options: ApiGetOptions = {}): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : undefined,
    credentials: 'include',
    cache: options.cache ?? 'no-store',
    signal: options.signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Download failed');
  }

  return res.blob();
}

/** Saves a Blob to disk under the given file name. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoking synchronously can cancel the download in some browsers.
    window.setTimeout(() => window.URL.revokeObjectURL(url), DOWNLOAD_URL_REVOKE_DELAY_MS);
  }
}

export async function apiDownload(path: string, fileName: string) {
  saveBlob(await apiFetchBlob(path), fileName);
}
