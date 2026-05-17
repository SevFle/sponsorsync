import { Page, request } from "@playwright/test";

const TEST_USER_EMAIL = "test@sponsorsync.dev";

export async function signIn(page: Page) {
  const csrfRes = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  const response = await page.request.post("/api/auth/callback/credentials", {
    form: {
      email: TEST_USER_EMAIL,
      csrfToken,
      callbackUrl: "http://localhost:3000/dashboard",
      json: "true",
    },
  });

  return response;
}

export async function getCsrfToken(page: Page): Promise<string> {
  const res = await page.request.get("/api/auth/csrf");
  if (!res.ok()) {
    throw new Error(
      `Failed to fetch CSRF token: ${res.status()} ${res.statusText()}`
    );
  }
  const data = await res.json();
  if (!data.csrfToken) {
    throw new Error("CSRF token not found in /api/auth/csrf response");
  }
  return data.csrfToken as string;
}

export async function getAuthCookies() {
  const apiRequest = await request.newContext({
    baseURL: "http://localhost:3000",
  });

  const csrfRes = await apiRequest.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  await apiRequest.post("/api/auth/callback/credentials", {
    form: {
      email: TEST_USER_EMAIL,
      csrfToken,
      callbackUrl: "http://localhost:3000/dashboard",
      json: "true",
    },
  });

  const cookies = await apiRequest.storageState();
  await apiRequest.dispose();
  return cookies;
}
