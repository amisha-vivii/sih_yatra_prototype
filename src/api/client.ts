import { request } from '../server/api';

/**
 * Frontend API client. Single place that attaches the bearer token, maps
 * non-2xx responses to a typed error, and keeps stack traces out of the UI.
 * Swapping to the FastAPI deployment means replacing `request(...)` with
 * `fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, ...)` — nothing else
 * in the app changes.
 */

const TOKEN_KEY = 'yatrashield.token';

export class ApiError extends Error {
  constructor(
  public status: number,
  message: string,
  public fields?: Record<string, string>)
  {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);else
    localStorage.removeItem(TOKEN_KEY);
  } catch {

    /* storage blocked — the session simply won't survive a reload */}
}

async function call<T>(method: string, path: string, body?: any): Promise<T> {
  let response;
  try {
    response = await request<T>(method, path, { body, token: getToken() });
  } catch {
    throw new ApiError(503, 'The service is unreachable right now. Please try again in a moment.');
  }
  if (response.status >= 200 && response.status < 300) return response.data;
  const payload = response.data as any;
  throw new ApiError(
    response.status,
    payload?.message || 'Unable to complete that request right now.',
    payload?.fields
  );
}

export const api = {
  get: <T,>(path: string) => call<T>('GET', path),
  post: <T,>(path: string, body?: any) => call<T>('POST', path, body),
  patch: <T,>(path: string, body?: any) => call<T>('PATCH', path, body),
  del: <T,>(path: string) => call<T>('DELETE', path)
};