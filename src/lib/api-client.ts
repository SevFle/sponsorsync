import { redirectToLogin } from "@/lib/auth/redirect";

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrfToken\s*=\s*([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  const resolvedUrl = params
    ? `${url}?${new URLSearchParams(params).toString()}`
    : url;

  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...((customHeaders as Record<string, string>) ?? {}),
  };

  const response = await fetch(resolvedUrl, {
    ...rest,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
