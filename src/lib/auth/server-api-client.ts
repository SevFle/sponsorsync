import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security/csrf";

export class ServerApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.body = body;
  }
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  return {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
    ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
  };
}

async function serverRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await buildAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ServerApiError(
      response.status,
      (body as Record<string, unknown>).error as string ?? response.statusText,
      body as Record<string, unknown>
    );
  }

  return response.json() as Promise<T>;
}

export function createServerApiClient(baseUrl = "") {
  async function get<T>(url: string): Promise<T> {
    return serverRequest<T>(`${baseUrl}${url}`, { method: "GET" });
  }

  async function post<T>(url: string, body?: unknown): Promise<T> {
    return serverRequest<T>(`${baseUrl}${url}`, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function put<T>(url: string, body?: unknown): Promise<T> {
    return serverRequest<T>(`${baseUrl}${url}`, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function del<T = void>(url: string): Promise<T> {
    return serverRequest<T>(`${baseUrl}${url}`, { method: "DELETE" });
  }

  return { get, post, put, delete: del };
}
