import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/(dashboard)/settings/page";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

import { useSession } from "next-auth/react";

function mockAuthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: "user-1", email: "test@test.com" } },
    status: "authenticated",
  });
}

function mockUnauthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "unauthenticated",
  });
}

function mockLoadingSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "loading",
  });
}

const defaultProfile = { id: "u1", email: "test@test.com", name: "Test User", image: null };
const defaultPrefs = {
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
};
const defaultSubscription = { plan: "free", status: "active", currentPeriodEnd: null, cancelAtPeriodEnd: false };

type FetchHandler = (url: string, opts?: RequestInit) => Response | Promise<Response>;

function settingsResponseForPath(
  path: string,
  overrides?: {
    profile?: object;
    preferences?: object;
    integrations?: object;
    subscription?: object;
  }
): Response {
  if (path.includes("/api/settings/profile")) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ profile: overrides?.profile ?? defaultProfile }),
    } as Response;
  }
  if (path.includes("/api/settings/notifications")) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ preferences: overrides?.preferences ?? defaultPrefs }),
    } as Response;
  }
  if (path.includes("/api/integrations")) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ integrations: overrides?.integrations ?? [] }),
    } as Response;
  }
  if (path.includes("/api/settings/subscription")) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ subscription: overrides?.subscription ?? defaultSubscription }),
    } as Response;
  }
  return { ok: false, status: 404, json: () => Promise.resolve({}) } as Response;
}

function mockSettingsFetch(overrides?: Parameters<typeof settingsResponseForPath>[1]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
    const path = typeof url === "string" ? url : url.toString();
    return Promise.resolve(settingsResponseForPath(path, overrides));
  });
}

function mockSettingsFetchWithHandler(handler: FetchHandler) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request, opts?: RequestInit) => {
    const path = typeof url === "string" ? url : url.toString();
    const result = handler(path, opts);
    return result instanceof Promise ? result : Promise.resolve(result);
  });
}

function mockFetchError() {
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
}

function mockFetchNonOk() {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    } as Response)
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockAuthenticatedSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsPage - auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<SettingsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows loading skeleton when session is loading and does not fetch data", async () => {
    mockLoadingSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<SettingsPage />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches settings after session is authenticated", async () => {
    const fetchSpy = mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});

describe("SettingsPage - tabs", () => {
  it("renders all tab buttons", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
  });

  it("shows profile tab by default", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("switches to notifications tab on click", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Notifications")[0]);

    await waitFor(() => {
      expect(screen.getByText("Deadline Reminders")).toBeInTheDocument();
    });

    expect(screen.getByText("Payment Reminders")).toBeInTheDocument();
    expect(screen.getByText("Deliverable Updates")).toBeInTheDocument();
  });

  it("switches to integrations tab on click", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Integrations")[0]);

    await waitFor(() => {
      expect(screen.getByText("Buzzsprout")).toBeInTheDocument();
    });

    expect(screen.getByText("Transistor")).toBeInTheDocument();
    expect(screen.getAllByText("Connect").length).toBeGreaterThan(0);
  });

  it("switches to billing tab on click", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText("Current Plan")).toBeInTheDocument();
    });

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });
});

describe("SettingsPage - profile tab", () => {
  it("populates name field with current profile name", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Test User");
  });

  it("shows email as read-only", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.value).toBe("test@test.com");
    expect(emailInput).toHaveAttribute("readonly");
  });

  it("shows validation error for empty name", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("saves profile on valid submit", async () => {
    mockSettingsFetchWithHandler((path, opts) => {
      if (path.includes("/api/settings/profile") && opts?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ profile: { id: "u1", email: "test@test.com", name: "New Name", image: null } }),
        } as Response;
      }
      return settingsResponseForPath(path);
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("shows error on save failure", async () => {
    mockSettingsFetchWithHandler((path, opts) => {
      if (path.includes("/api/settings/profile") && opts?.method === "PATCH") {
        return {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Server error" }),
        } as Response;
      }
      return settingsResponseForPath(path);
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Failed to update profile")).toBeInTheDocument();
    });
  });
});

describe("SettingsPage - notifications tab", () => {
  it("shows current notification preferences", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Notifications")[0]);

    await waitFor(() => {
      expect(screen.getByText("Deadline Reminders")).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole("switch");
    expect(toggles.length).toBe(3);
    expect(toggles[0]).toHaveAttribute("aria-checked", "true");
  });

  it("saves notification preferences", async () => {
    mockSettingsFetchWithHandler((path, opts) => {
      if (path.includes("/api/settings/notifications") && opts?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              preferences: {
                deadlineReminders: false,
                paymentReminders: true,
                deliverableUpdates: true,
                reminderDaysBefore: 3,
              },
            }),
        } as Response;
      }
      return settingsResponseForPath(path);
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Notifications")[0]);

    await waitFor(() => {
      expect(screen.getByText("Deadline Reminders")).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[0]);

    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(screen.getByText("Preferences updated.")).toBeInTheDocument();
    });
  });
});

describe("SettingsPage - integrations tab", () => {
  it("shows connected integrations", async () => {
    mockSettingsFetch({
      integrations: [
        { id: "i1", platform: "buzzsprout", isConnected: true, lastSyncedAt: "2025-01-01T00:00:00Z" },
        { id: "i2", platform: "convertkit", isConnected: false, lastSyncedAt: null },
      ],
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Integrations")[0]);

    await waitFor(() => {
      expect(screen.getByText("Buzzsprout")).toBeInTheDocument();
    });

    expect(screen.getByText("Disconnect")).toBeInTheDocument();
    expect(screen.getAllByText("Not connected").length).toBeGreaterThan(0);
  });

  it("disconnects an integration on click", async () => {
    const connectedIntegrations = [
      { id: "i1", platform: "buzzsprout", isConnected: true, lastSyncedAt: null },
    ];

    mockSettingsFetchWithHandler((path, opts) => {
      if (path.includes("/api/integrations/buzzsprout") && opts?.method === "DELETE") {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ disconnected: "buzzsprout" }),
        } as Response;
      }
      return settingsResponseForPath(path, { integrations: connectedIntegrations });
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Integrations")[0]);

    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Disconnect"));

    await waitFor(() => {
      expect(screen.getAllByText("Connect").length).toBe(5);
    });
  });
});

describe("SettingsPage - billing tab", () => {
  it("shows current plan and status", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText("Current Plan")).toBeInTheDocument();
    });

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows upgrade CTA for free plan", async () => {
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
    });

    expect(screen.getByText("Upgrade Plan")).toBeInTheDocument();
  });

  it("shows next billing date when available", async () => {
    mockSettingsFetch({
      subscription: {
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2025-12-31T00:00:00Z",
        cancelAtPeriodEnd: false,
      },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText("Next billing date")).toBeInTheDocument();
    });
  });

  it("shows cancellation notice when cancelAtPeriodEnd is true", async () => {
    mockSettingsFetch({
      subscription: {
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2025-12-31T00:00:00Z",
        cancelAtPeriodEnd: true,
      },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText(/cancelled at the end of the current billing period/)).toBeInTheDocument();
    });
  });

  it("does not show upgrade CTA for non-free plan", async () => {
    mockSettingsFetch({
      subscription: {
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2025-12-31T00:00:00Z",
        cancelAtPeriodEnd: false,
      },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Billing")[0]);

    await waitFor(() => {
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });
});

describe("SettingsPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchError();
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchNonOk();
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchError();
    mockSettingsFetch();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton while fetching", () => {
    mockAuthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<SettingsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does not set error state when fetch is aborted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        (opts as RequestInit).signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }) as Promise<Response>;
    });

    const { unmount, container } = render(<SettingsPage />);
    await waitFor(() => {
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    unmount();

    await waitFor(() => {
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });
});

describe("SettingsPage - abort and cleanup", () => {
  it("aborts fetch on unmount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<SettingsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
