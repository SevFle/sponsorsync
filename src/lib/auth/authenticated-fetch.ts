import { apiFetch, ApiError } from "@/lib/api-client";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security/csrf";

export interface AuthenticatedFetchOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}\\s*=\\s*([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function buildHeaders(
  defaultHeaders: Record<string, string>
): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    ...defaultHeaders,
    ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
  };
}

export function createAuthenticatedFetch(options: AuthenticatedFetchOptions = {}) {
  const { baseUrl = "", defaultHeaders = {} } = options;

  async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "GET",
      params,
      headers: buildHeaders(defaultHeaders),
    });
  }

  async function post<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: buildHeaders(defaultHeaders),
    });
  }

  async function put<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: buildHeaders(defaultHeaders),
    });
  }

  async function del<T = void>(url: string): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "DELETE",
      headers: buildHeaders(defaultHeaders),
    });
  }

  return { get, post, put, delete: del };
}

export { ApiError };
