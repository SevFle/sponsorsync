import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
const mockApiError = class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
};

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: mockApiError,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    status: "authenticated",
    session: { user: { id: "user-1" } },
  }),
}));

const defaultPrefs = {
  deadlineReminders: true,
  paymentReminders: false,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
  reminderSchedule: [7, 3, 1],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockResolvedValue({ preferences: { ...defaultPrefs } });
});

describe("NotificationSettingsPage - fetch preferences", () => {
  it("uses apiFetch to load preferences on mount", async () => {
    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/settings/notifications");
    });
  });

  it("renders preferences after loading", async () => {
    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    const deadlineCheckbox = screen.getByRole("checkbox", {
      name: /Deadline Reminders/i,
    });
    expect(deadlineCheckbox).toBeChecked();

    const paymentCheckbox = screen.getByRole("checkbox", {
      name: /Payment Reminders/i,
    });
    expect(paymentCheckbox).not.toBeChecked();

    const deliverableCheckbox = screen.getByRole("checkbox", {
      name: /Deliverable Updates/i,
    });
    expect(deliverableCheckbox).toBeChecked();
  });

  it("shows error message when preferences fail to load", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load preferences")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state initially", async () => {
    let resolvePrefs: (v: unknown) => void;
    mockApiFetch.mockReturnValue(
      new Promise((resolve) => {
        resolvePrefs = resolve;
      })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await act(async () => {
      resolvePrefs!({ preferences: defaultPrefs });
    });
  });

  it("populates schedule input from loaded preferences", async () => {
    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("7, 3, 1")).toBeInTheDocument();
    });
  });
});

describe("NotificationSettingsPage - save preferences", () => {
  it("uses apiFetch with PUT to save preferences", async () => {
    mockApiFetch.mockResolvedValue({ preferences: defaultPrefs });

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Preferences"));
    });

    const saveCall = mockApiFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as { method?: string } | null)?.method === "PUT"
    );
    expect(saveCall).toBeDefined();
    expect(saveCall![0]).toBe("/api/settings/notifications");
    expect(saveCall![1]).toEqual(
      expect.objectContaining({
        method: "PUT",
        body: expect.any(String),
      })
    );

    const body = JSON.parse(saveCall![1].body);
    expect(body.deadlineReminders).toBe(true);
    expect(body.reminderSchedule).toEqual([7, 3, 1]);
  });

  it("shows success message after saving", async () => {
    mockApiFetch.mockResolvedValue({ preferences: defaultPrefs });

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Preferences"));
    });

    await waitFor(() => {
      expect(screen.getByText("Preferences saved")).toBeInTheDocument();
    });
  });

  it("shows error message when save fails with ApiError", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ preferences: defaultPrefs })
      .mockRejectedValueOnce(new mockApiError(500, "Server error"));

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Preferences"));
    });

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("shows error message when save fails with generic Error", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ preferences: defaultPrefs })
      .mockRejectedValueOnce(new Error("Network failure"));

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Preferences"));
    });

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  it("sends parsed schedule in save request", async () => {
    mockApiFetch.mockResolvedValue({ preferences: defaultPrefs });

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    const scheduleInput = screen.getByPlaceholderText("7, 3, 1");
    fireEvent.change(scheduleInput, { target: { value: "5, 2" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Preferences"));
    });

    const lastCall = mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    expect(body.reminderSchedule).toEqual([5, 2]);
  });
});

describe("NotificationSettingsPage - auth handling via apiFetch", () => {
  it("delegates 401 handling to apiFetch (redirect to login)", async () => {
    mockApiFetch.mockRejectedValue(
      new mockApiError(401, "Unauthorized", { error: "Unauthorized" })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load preferences")
      ).toBeInTheDocument();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/settings/notifications");
  });
});

describe("NotificationSettingsPage - auth guard", () => {
  it("shows spinner and does not fetch when unauthenticated", async () => {
    const { useAuth } = await import("@/hooks/use-auth");
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      status: "unauthenticated",
      session: null,
    });

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Notification Settings")).not.toBeInTheDocument();
  });

  it("shows spinner and does not fetch when auth is loading", async () => {
    const { useAuth } = await import("@/hooks/use-auth");
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      status: "loading",
      session: null,
    });

    const { default: Page } = await import(
      "@/app/(dashboard)/settings/notifications/page"
    );

    render(<Page />);

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
