import { describe, it, expect } from "vitest";
import {
  createTemplateSchema,
  updateTemplateSchema,
  sendTemplateSchema,
  duplicateTemplateSchema,
  TEMPLATE_CATEGORIES,
} from "@/domain/templates";

describe("createTemplateSchema - boundary values", () => {
  it("accepts name with exactly 255 characters", () => {
    const result = createTemplateSchema.safeParse({
      name: "a".repeat(255),
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name with 256 characters", () => {
    const result = createTemplateSchema.safeParse({
      name: "a".repeat(256),
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(false);
  });

  it("accepts whitespace name and trims to empty string", () => {
    const result = createTemplateSchema.safeParse({
      name: "   ",
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });

  it("accepts subject with exactly 500 characters", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      subject: "a".repeat(500),
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects subject exceeding 500 characters", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      subject: "a".repeat(501),
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(false);
  });

  it("rejects body with only whitespace", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts body with minimal HTML tag", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>X</p>",
    });
    expect(result.success).toBe(true);
  });

  it("accepts body with self-closing HTML tag", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<br/>",
    });
    expect(result.success).toBe(true);
  });

  it("accepts body with nested HTML", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<div><ul><li>Item</li></ul></div>",
    });
    expect(result.success).toBe(true);
  });

  it("accepts body with HTML attributes", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: '<a href="https://example.com">Link</a>',
    });
    expect(result.success).toBe(true);
  });

  it("accepts body with template variables inside HTML", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hello {{sponsor_name}}, your deal {{deal_title}} is ready.</p>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects plain text body without any HTML", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "Hello World",
    });
    expect(result.success).toBe(false);
  });

  it("rejects body with only an unclosed angle bracket", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "< not html",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTemplateSchema - strict mode", () => {
  it("rejects extra unknown field", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      unknownField: "value",
    });
    expect(result.success).toBe(false);
  });

  it("rejects multiple extra fields", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      foo: 1,
      bar: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("createTemplateSchema - transform behavior", () => {
  it("trims leading and trailing spaces from name", () => {
    const result = createTemplateSchema.safeParse({
      name: "\t  My Template  \n",
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Template");
    }
  });

  it("transforms undefined subject to null", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBeNull();
    }
  });

  it("transforms undefined category to null", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeNull();
    }
  });

  it("preserves explicitly provided category", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      category: "outreach",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("outreach");
    }
  });

  it("preserves explicitly null category", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      category: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeNull();
    }
  });
});

describe("updateTemplateSchema - boundary and edge cases", () => {
  it("accepts empty object (no-op update)", () => {
    const result = updateTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts name with exactly 255 characters", () => {
    const result = updateTemplateSchema.safeParse({ name: "a".repeat(255) });
    expect(result.success).toBe(true);
  });

  it("rejects name with 256 characters", () => {
    const result = updateTemplateSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects empty name string", () => {
    const result = updateTemplateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts whitespace name and trims to empty string", () => {
    const result = updateTemplateSchema.safeParse({ name: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });

  it("rejects plain text body", () => {
    const result = updateTemplateSchema.safeParse({ body: "Just text" });
    expect(result.success).toBe(false);
  });

  it("accepts body with HTML tags", () => {
    const result = updateTemplateSchema.safeParse({ body: "<p>Updated</p>" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields in strict mode", () => {
    const result = updateTemplateSchema.safeParse({ id: "tmpl-1" });
    expect(result.success).toBe(false);
  });

  it("accepts subject up to 500 characters", () => {
    const result = updateTemplateSchema.safeParse({ subject: "a".repeat(500) });
    expect(result.success).toBe(true);
  });

  it("rejects subject exceeding 500 characters", () => {
    const result = updateTemplateSchema.safeParse({ subject: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("accepts setting category to null", () => {
    const result = updateTemplateSchema.safeParse({ category: null });
    expect(result.success).toBe(true);
  });

  it("accepts each valid category", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      const result = updateTemplateSchema.safeParse({ category: cat });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    const result = updateTemplateSchema.safeParse({ category: "nonexistent" });
    expect(result.success).toBe(false);
  });
});

describe("sendTemplateSchema - boundary and edge cases", () => {
  it("accepts single valid email as to", () => {
    const result = sendTemplateSchema.safeParse({ to: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts array of valid emails as to", () => {
    const result = sendTemplateSchema.safeParse({
      to: ["a@example.com", "b@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects single invalid email", () => {
    const result = sendTemplateSchema.safeParse({ to: "not-email" });
    expect(result.success).toBe(false);
  });

  it("rejects array containing invalid email", () => {
    const result = sendTemplateSchema.safeParse({
      to: ["valid@example.com", "invalid"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty to array", () => {
    const result = sendTemplateSchema.safeParse({ to: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing to field entirely", () => {
    const result = sendTemplateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID sponsorId", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      sponsorId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID dealId", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      dealId: "123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID for sponsorId", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid UUID for all ID fields", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "550e8400-e29b-41d4-a716-446655440001",
      deliverableId: "550e8400-e29b-41d4-a716-446655440002",
      paymentId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cc as single email", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      cc: "cc@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cc as array of emails", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts bcc as single email", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      bcc: "bcc@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts replyTo as single email", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      replyTo: "reply@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts replyTo as array of emails", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      replyTo: ["reply1@example.com", "reply2@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts variables as record of strings", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      variables: {
        sponsor_name: "Acme",
        deal_amount: "$500",
        custom_var: "value",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts preview boolean flag", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
      preview: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal payload with only to", () => {
    const result = sendTemplateSchema.safeParse({
      to: "test@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("duplicateTemplateSchema - boundary and edge cases", () => {
  it("accepts empty object", () => {
    const result = duplicateTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts name with exactly 255 characters", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "a".repeat(255) });
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "  Copy  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Copy");
    }
  });

  it("accepts whitespace name and trims to empty string", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });
});
