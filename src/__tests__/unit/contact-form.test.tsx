import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactForm, type ContactFormData } from "@/components/contacts/ContactForm";

const validData: ContactFormData = {
  name: "Jane Doe",
  email: "jane@test.com",
  role: "Marketing Director",
  phone: "+1234567890",
  isPrimary: true,
};

describe("ContactForm", () => {
  it("renders all form fields", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary contact")).toBeInTheDocument();
  });

  it("renders Add Contact button for new contact", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Add Contact")).toBeInTheDocument();
  });

  it("renders Update Contact button when initial data provided", () => {
    render(<ContactForm initial={validData} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Update Contact")).toBeInTheDocument();
  });

  it("pre-fills form with initial data", () => {
    render(<ContactForm initial={validData} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByLabelText("Name *") as HTMLInputElement).value).toBe("Jane Doe");
    expect((screen.getByLabelText("Email *") as HTMLInputElement).value).toBe("jane@test.com");
    expect((screen.getByLabelText("Role") as HTMLInputElement).value).toBe("Marketing Director");
    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe("+1234567890");
    expect((screen.getByLabelText("Primary contact") as HTMLInputElement).checked).toBe(true);
  });

  it("shows empty form without initial data", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByLabelText("Name *") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Email *") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Role") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Primary contact") as HTMLInputElement).checked).toBe(false);
  });

  it("calls onSubmit with form data on valid submission", () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "jane@test.com" } });
    fireEvent.click(screen.getByLabelText("Primary contact"));
    fireEvent.click(screen.getByText("Add Contact"));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@test.com",
      role: "",
      phone: "",
      isPrimary: true,
    });
  });

  it("shows validation error for empty name", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Add Contact"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("shows validation error for empty email", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane" } });
    fireEvent.click(screen.getByText("Add Contact"));
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("shows validation error for invalid email", () => {
    const { container } = render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "not-an-email" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("shows multiple validation errors simultaneously", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Add Contact"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("does not call onSubmit when validation fails", () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Add Contact"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts valid email formats", () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "jane.doe+tag@example.co.uk" } });
    fireEvent.click(screen.getByText("Add Contact"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<ContactForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables submit button when loading", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} loading={true} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...")).toBeDisabled();
  });

  it("updates form fields on change", () => {
    render(<ContactForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const nameInput = screen.getByLabelText("Name *") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    expect(nameInput.value).toBe("Updated Name");
  });

  it("clears validation errors after fixing and resubmitting", () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText("Add Contact"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "jane@test.com" } });
    fireEvent.click(screen.getByText("Add Contact"));

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalled();
  });

  it("preserves optional fields as empty strings when not filled", () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "jane@test.com" } });
    fireEvent.click(screen.getByText("Add Contact"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ role: "", phone: "" })
    );
  });
});
