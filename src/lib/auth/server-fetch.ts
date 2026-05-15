import { cookies } from "next/headers";
import { ApiError } from "@/lib/api-client";

export interface ServerFetchOptions {
  baseUrl?: string;
}

export function createServerFetch(options: ServerFetchOptions = {}) {
  const { baseUrl = "" } = options;

  async function buildHeaders(
    customHeaders?: Record<string, string>
  ): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const cookieString = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const csrfToken = cookieStore.get("csrfToken")?.value;

    return {
      "Content-Type": "application/json",
      Cookie: cookieString,
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(customHeaders ?? {}),
    };
  }

  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const mergedHeaders = await buildHeaders(
      init.headers as Record<string, string> | undefined
    );

    const response = await fetch(`${baseUrl}${url}`, {
      ...init,
      headers: mergedHeaders,
    });

    if (response.status === 401) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        body.error ?? response.statusText,
        body
      );
    }

    return response.json() as Promise<T>;
  }

  async function get<T>(
    url: string,
    params?: Record<string, string>
  ): Promise<T> {
    const resolvedUrl = params
      ? `${url}?${new URLSearchParams(params).toString()}`
      : url;
    return request<T>(resolvedUrl, { method: "GET" });
  }

  async function post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function del<T = void>(url: string): Promise<T> {
    return request<T>(url, { method: "DELETE" });
  }

  return { get, post, put, delete: del };
}

export { ApiError };
