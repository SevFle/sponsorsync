import { apiFetch, ApiError } from "@/lib/api-client";

export interface AuthenticatedFetchOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export function createAuthenticatedFetch(options: AuthenticatedFetchOptions = {}) {
  const { baseUrl = "", defaultHeaders = {} } = options;

  async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "GET",
      params,
      headers: defaultHeaders,
    });
  }

  async function post<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: defaultHeaders,
    });
  }

  async function put<T>(url: string, body?: unknown): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: defaultHeaders,
    });
  }

  async function del<T = void>(url: string): Promise<T> {
    return apiFetch<T>(`${baseUrl}${url}`, {
      method: "DELETE",
      headers: defaultHeaders,
    });
  }

  return { get, post, put, delete: del };
}

export { ApiError };
