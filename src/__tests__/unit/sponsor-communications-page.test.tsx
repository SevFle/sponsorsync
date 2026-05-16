import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SponsorCommunicationsPage from "@/app/(dashboard)/sponsors/[id]/communications/page";

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

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/contacts/ContactList", () => ({
  ContactList: ({ contacts }: { contacts: Array<{ id: string; name: string }> }) => (
    <div data-testid="contact-list">
      {contacts.map((c) => <div key={c.id}>{c.name}</div>)}
    </div>
  ),
}));

vi.mock("@/components/contacts/ContactForm", () => ({
  ContactForm: () => <div>Contact Form</div>,
}));

vi.mock("@/components/communications/CommunicationList", () => ({
  CommunicationList: () => <div>Communication List</div>,
}));

vi.mock("@/components/communications/ComposeMessage", () => ({
  ComposeMessage: () => <div>Compose Message</div>,
}));

import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

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

beforeEach(() => {
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SponsorCommunicationsPage - auth guard via useAuth", () => {
  it("redirects to login with callbackUrl when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl=")
      );
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ sponsor: { name: "Acme Corp" } })
      .mockResolvedValueOnce({ contacts: [] })
      .mockResolvedValueOnce({ communications: [] });

    render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acme Corp.*Communications/)).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("SponsorCommunicationsPage - data fetching", () => {
  it("fetches sponsor, contacts, and communications on mount", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ sponsor: { name: "Acme Corp" } })
      .mockResolvedValueOnce({
        contacts: [
          { id: "c1", name: "John Doe", email: "john@acme.com", role: "PM", phone: null, isPrimary: true },
        ],
      })
      .mockResolvedValueOnce({ communications: [] });

    render(
      <SponsorCommunicationsPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledTimes(3);
  });
});
