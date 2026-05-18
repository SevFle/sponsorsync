import { request, APIRequestContext } from "@playwright/test";

const TEST_USER_EMAIL = "test@sponsorsync.dev";
const BASE_URL = "http://localhost:3000";

export interface SeededNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
}

export async function createAuthenticatedContext(): Promise<APIRequestContext> {
  const apiContext = await request.newContext({ baseURL: BASE_URL });

  const csrfRes = await apiContext.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  await apiContext.post("/api/auth/callback/credentials", {
    form: {
      email: TEST_USER_EMAIL,
      csrfToken,
      callbackUrl: `${BASE_URL}/dashboard`,
      json: "true",
    },
  });

  return apiContext;
}

export async function seedNotifications(
  apiContext: APIRequestContext,
  notifications: Array<{
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    read?: boolean;
  }>
): Promise<SeededNotification[]> {
  const response = await apiContext.post("/api/test/notifications", {
    data: { notifications },
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to seed notifications: ${response.status()} ${await response.text()}`
    );
  }
  const body = await response.json();
  return body.notifications;
}

export async function cleanupNotifications(
  apiContext: APIRequestContext
): Promise<void> {
  await apiContext.delete("/api/test/notifications");
}
