import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AuthProvider } from "@/components/providers/auth-provider";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

describe("AuthProvider", () => {
  it("wraps children in SessionProvider", () => {
    const { getByTestId, getByText } = render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    );

    expect(getByTestId("session-provider")).toBeInTheDocument();
    expect(getByTestId("child")).toBeInTheDocument();
    expect(getByText("Hello")).toBeInTheDocument();
  });

  it("renders children content correctly", () => {
    const { container } = render(
      <AuthProvider>
        <p>Test content</p>
      </AuthProvider>
    );

    expect(container.textContent).toContain("Test content");
  });
});
