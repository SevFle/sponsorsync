import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ComposeMessage } from "@/components/communications/ComposeMessage";

const mockContacts = [
  { id: "contact-1", name: "Jane Doe", email: "jane@test.com", isPrimary: true },
  { id: "contact-2", name: "John Smith", email: "john@test.com", isPrimary: false },
];

const mockTemplates = [
  { id: "tmpl-1", name: "Sponsor Outreach", subject: "Hello {{sponsor_name}}", category: "outreach" },
  { id: "tmpl-2", name: "Follow Up", subject: "Following up", category: "followup" },
];

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
});

function mockFetch(responses: Record<string, unknown>) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        } as Response);
      }
    }
    return Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Not found" }),
    } as Response);
  });
}

describe("ComposeMessage", () => {
  it("renders the compose form", () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Compose Message")).toBeInTheDocument();
    expect(screen.getByText("Send a templated email to this sponsor.")).toBeInTheDocument();
  });

  it("loads templates on mount", async () => {
    mockFetch({ templates: { templates: mockTemplates } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });
  });

  it("shows template select dropdown", () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByLabelText("Template *")).toBeInTheDocument();
  });

  it("shows contact select dropdown with contacts", async () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByLabelText("Recipient")).toBeInTheDocument();
    expect(screen.getByText(/Primary: Jane Doe \(jane@test\.com\)/)).toBeInTheDocument();
    expect(screen.getByText(/John Smith \(john@test\.com\)/)).toBeInTheDocument();
  });

  it("shows no contacts message when contacts is empty", () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={[]} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/No contacts found/)).toBeInTheDocument();
  });

  it("shows custom email input when __custom is selected", async () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    const contactSelect = screen.getByLabelText("Recipient") as HTMLSelectElement;
    fireEvent.change(contactSelect, { target: { value: "__custom" } });
    expect(screen.getByPlaceholderText("recipient@example.com")).toBeInTheDocument();
  });

  it("send button is disabled when no template selected", async () => {
    mockFetch({ templates: { templates: mockTemplates } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });
    expect(screen.getByText("Send Message")).toBeDisabled();
  });

  it("shows error when sending without recipient", async () => {
    mockFetch({ templates: { templates: mockTemplates } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });
    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });
    fireEvent.click(screen.getByText("Send Message"));
    expect(screen.getByText("Please select a contact or enter an email address")).toBeInTheDocument();
  });

  it("calls onSent after successful send", async () => {
    const onSent = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        } as Response);
      }
      if (urlStr.includes("/send")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "email-id-123" }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={onSent} onCancel={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });

    const contactSelect = screen.getByLabelText("Recipient") as HTMLSelectElement;
    fireEvent.change(contactSelect, { target: { value: "contact-1" } });

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => {
      expect(onSent).toHaveBeenCalled();
    });
  });

  it("shows error on send failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        } as Response);
      }
      if (urlStr.includes("/send")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Service unavailable" }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });

    const contactSelect = screen.getByLabelText("Recipient") as HTMLSelectElement;
    fireEvent.change(contactSelect, { target: { value: "contact-1" } });

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => {
      expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    });
  });

  it("shows network error when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        } as Response);
      }
      if (urlStr.includes("/send")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });

    const contactSelect = screen.getByLabelText("Recipient") as HTMLSelectElement;
    fireEvent.change(contactSelect, { target: { value: "contact-1" } });

    fireEvent.click(screen.getByText("Send Message"));

    await waitFor(() => {
      expect(screen.getByText("Failed to send email. Please try again.")).toBeInTheDocument();
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows preview button when template is selected", async () => {
    mockFetch({ templates: { templates: mockTemplates } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });
    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });
    expect(screen.getByText("Preview Email")).toBeInTheDocument();
  });

  it("renders preview HTML when preview is loaded", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        } as Response);
      }
      if (urlStr.includes("/send")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              preview: {
                html: "<p>Hello World</p>",
                subject: "Test Preview Subject",
              },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Sponsor Outreach")).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText("Template *") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "tmpl-1" } });

    fireEvent.click(screen.getByText("Preview Email"));

    await waitFor(() => {
      expect(screen.getByText(/Test Preview Subject/)).toBeInTheDocument();
    });
  });

  it("disables send button when no template is selected", () => {
    mockFetch({ templates: { templates: [] } });
    render(
      <ComposeMessage sponsorId="sponsor-1" contacts={mockContacts} onSent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Send Message")).toBeDisabled();
  });
});
