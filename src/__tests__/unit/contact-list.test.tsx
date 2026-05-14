import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactList, type ContactListItem } from "@/components/contacts/ContactList";

const mockContacts: ContactListItem[] = [
  {
    id: "contact-1",
    name: "Jane Doe",
    email: "jane@test.com",
    role: "Marketing Director",
    phone: "+1234567890",
    isPrimary: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "contact-2",
    name: "John Smith",
    email: "john@test.com",
    role: null,
    phone: null,
    isPrimary: false,
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "contact-3",
    name: "Alice Brown",
    email: "alice@test.com",
    role: "CEO",
    phone: "+9876543210",
    isPrimary: false,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-03T00:00:00Z",
  },
];

describe("ContactList", () => {
  it("renders empty state when no contacts", () => {
    render(<ContactList contacts={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("No contacts yet")).toBeInTheDocument();
    expect(screen.getByText("Add a contact person for this sponsor.")).toBeInTheDocument();
  });

  it("renders all contacts", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Alice Brown")).toBeInTheDocument();
  });

  it("renders contact email addresses", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
  });

  it("renders primary badge for primary contacts", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("renders role when available", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Marketing Director")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
  });

  it("does not render role element when null", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const johnContainer = screen.getByText("John Smith").closest("[class*='rounded']");
    expect(johnContainer?.textContent).not.toContain("null");
  });

  it("renders phone number when available", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
    expect(screen.getByText("+9876543210")).toBeInTheDocument();
  });

  it("does not render phone element when null", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const johnContainer = screen.getByText("John Smith").closest("[class*='rounded']");
    expect(johnContainer?.textContent).not.toContain("null");
  });

  it("calls onEdit with the correct contact", () => {
    const onEdit = vi.fn();
    render(<ContactList contacts={mockContacts} onEdit={onEdit} onDelete={vi.fn()} />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contact-1", name: "Jane Doe" })
    );
  });

  it("calls onDelete with correct id", () => {
    const onDelete = vi.fn();
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith("contact-1");
  });

  it("shows loading state on delete button after click", () => {
    render(<ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);
    expect(deleteButtons[0]).toBeDisabled();
  });

  it("calls onSelect when a contact row is clicked", () => {
    const onSelect = vi.fn();
    render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Jane Doe"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contact-1" })
    );
  });

  it("does not call onSelect when not provided", () => {
    const onSelect = vi.fn();
    render(
      <ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Jane Doe"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("highlights selected contact with blue styling", () => {
    const { container } = render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        selectedId="contact-1"
      />
    );
    const contactRows = container.querySelectorAll("[class*='rounded-lg']");
    expect(contactRows[0].className).toContain("border-blue-500");
    expect(contactRows[0].className).toContain("bg-blue-50");
  });

  it("non-selected contacts have default styling", () => {
    const { container } = render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        selectedId="contact-1"
      />
    );
    const contactRows = container.querySelectorAll("[class*='rounded-lg']");
    expect(contactRows[1].className).toContain("border-gray-200");
    expect(contactRows[1].className).toContain("bg-white");
  });

  it("stops propagation when clicking Edit button", () => {
    const onSelect = vi.fn();
    render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />
    );
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("stops propagation when clicking Delete button", () => {
    const onSelect = vi.fn();
    render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />
    );
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders with cursor-pointer when onSelect is provided", () => {
    const { container } = render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    const contactRows = container.querySelectorAll("[class*='rounded-lg']");
    expect(contactRows[0].className).toContain("cursor-pointer");
  });

  it("renders without cursor-pointer when onSelect is not provided", () => {
    const { container } = render(
      <ContactList contacts={mockContacts} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    const contactRows = container.querySelectorAll("[class*='rounded-lg']");
    expect(contactRows[0].className).not.toContain("cursor-pointer");
  });
});
