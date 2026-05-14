import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommunicationList, type CommunicationListItem } from "@/components/communications/CommunicationList";

const mockCommunications: CommunicationListItem[] = [
  {
    id: "comm-1",
    subject: "Sponsorship Proposal",
    to: "jane@acme.com",
    status: "sent",
    templateId: "tmpl-1",
    sponsorContactId: "contact-1",
    sentAt: "2025-03-15T10:00:00Z",
  },
  {
    id: "comm-2",
    subject: "Follow Up",
    to: "john@acme.com",
    status: "delivered",
    templateId: "tmpl-2",
    sponsorContactId: "contact-2",
    sentAt: "2025-03-16T12:00:00Z",
  },
  {
    id: "comm-3",
    subject: "Invoice Reminder",
    to: "billing@acme.com",
    status: "failed",
    templateId: "tmpl-3",
    sponsorContactId: null,
    sentAt: "2025-03-17T14:00:00Z",
  },
  {
    id: "comm-4",
    subject: "Welcome",
    to: "new@acme.com",
    status: "bounced",
    templateId: "tmpl-4",
    sponsorContactId: null,
    sentAt: "2025-03-18T16:00:00Z",
  },
];

describe("CommunicationList", () => {
  it("renders empty state when no communications", () => {
    render(<CommunicationList communications={[]} />);
    expect(screen.getByText("No communications yet")).toBeInTheDocument();
  });

  it("renders empty state description", () => {
    render(<CommunicationList communications={[]} />);
    expect(
      screen.getByText("Send a message to this sponsor to see the history here.")
    ).toBeInTheDocument();
  });

  it("renders all communications", () => {
    render(<CommunicationList communications={mockCommunications} />);
    expect(screen.getByText("Sponsorship Proposal")).toBeInTheDocument();
    expect(screen.getByText("Follow Up")).toBeInTheDocument();
    expect(screen.getByText("Invoice Reminder")).toBeInTheDocument();
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });

  it("renders recipient email addresses", () => {
    render(<CommunicationList communications={mockCommunications} />);
    expect(screen.getByText("To: jane@acme.com")).toBeInTheDocument();
    expect(screen.getByText("To: john@acme.com")).toBeInTheDocument();
  });

  it("renders status badges for each status type", () => {
    render(<CommunicationList communications={mockCommunications} />);
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("bounced")).toBeInTheDocument();
  });

  it("renders unknown status badge", () => {
    const comm: CommunicationListItem[] = [
      {
        id: "comm-x",
        subject: "Test",
        to: "test@test.com",
        status: "pending",
        templateId: null,
        sponsorContactId: null,
        sentAt: "2025-03-19T10:00:00Z",
      },
    ];
    render(<CommunicationList communications={comm} />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders sentAt dates", () => {
    render(<CommunicationList communications={mockCommunications} />);
    expect(screen.getByText(/3\/15\/2025/)).toBeInTheDocument();
  });

  it("calls onView when a communication item is clicked", () => {
    const onView = vi.fn();
    render(<CommunicationList communications={mockCommunications} onView={onView} />);
    (screen.getByText("Sponsorship Proposal").closest("div[class*='rounded-lg']") as HTMLElement)!.click();
    expect(onView).toHaveBeenCalledWith("comm-1");
  });

  it("does not render cursor-pointer when onView is not provided", () => {
    const { container } = render(
      <CommunicationList communications={mockCommunications} />
    );
    const firstItem = container.querySelector("[class*='rounded-lg']");
    expect(firstItem?.className).not.toContain("cursor-pointer");
  });

  it("renders cursor-pointer when onView is provided", () => {
    const { container } = render(
      <CommunicationList communications={mockCommunications} onView={vi.fn()} />
    );
    const firstItem = container.querySelector("[class*='rounded-lg']");
    expect(firstItem?.className).toContain("cursor-pointer");
  });

  it("renders a single communication correctly", () => {
    render(
      <CommunicationList
        communications={[mockCommunications[0]]}
      />
    );
    expect(screen.getByText("Sponsorship Proposal")).toBeInTheDocument();
    expect(screen.queryByText("Follow Up")).not.toBeInTheDocument();
  });
});
