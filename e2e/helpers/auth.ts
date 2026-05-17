import { Page, request, expect } from "@playwright/test";

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
  await page.goto("/dashboard");
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find((c) => c.name === "csrfToken");
  if (!csrfCookie) throw new Error("CSRF cookie not found after navigating to /dashboard");
  return csrfCookie.value;
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
