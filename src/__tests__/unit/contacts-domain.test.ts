import { describe, it, expect } from "vitest";
import {
  createContactSchema,
  updateContactSchema,
} from "@/domain/contacts";

describe("createContactSchema", () => {
  it("validates a complete contact", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@test.com",
      role: "Marketing Director",
      phone: "+1234567890",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates with only required fields", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@test.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createContactSchema.safeParse({
      email: "jane@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createContactSchema.safeParse({
      name: "",
      email: "jane@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 255 characters", () => {
    const result = createContactSchema.safeParse({
      name: "a".repeat(256),
      email: "jane@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects role over 100 characters", () => {
    const result = createContactSchema.safeParse({
      name: "Jane",
      email: "jane@test.com",
      role: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("allows partial updates", () => {
    const result = updateContactSchema.safeParse({
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("allows empty object", () => {
    const result = updateContactSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("still validates email format when provided", () => {
    const result = updateContactSchema.safeParse({
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
