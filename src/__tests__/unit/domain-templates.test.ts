import { describe, it, expect } from "vitest";
import {
  createTemplateSchema,
  updateTemplateSchema,
  sendTemplateSchema,
  duplicateTemplateSchema,
  getRequiredVariablesForCategory,
  TEMPLATE_CATEGORIES,
  TEMPLATE_TYPE_VARIABLE_MAP,
  type TemplateCategory,
} from "@/domain/templates";

describe("createTemplateSchema", () => {
  it("validates a complete template", () => {
    const result = createTemplateSchema.safeParse({
      name: "Welcome Email",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Welcome!</p>",
      category: "outreach",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Welcome Email");
      expect(result.data.category).toBe("outreach");
    }
  });

  it("trims name whitespace", () => {
    const result = createTemplateSchema.safeParse({
      name: "  My Template  ",
      body: "<p>Content</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Template");
    }
  });

  it("rejects empty name", () => {
    const result = createTemplateSchema.safeParse({
      name: "",
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(false);
  });

  it("allows missing body (defaults to empty string)", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe("");
    }
  });

  it("allows empty body string", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe("");
    }
  });

  it("rejects body without HTML tags", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "Just plain text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      category: "invalid_category",
    });
    expect(result.success).toBe(false);
  });

  it("allows null subject", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      subject: null,
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
  });

  it("allows omitted subject (defaults to null)", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBeNull();
    }
  });

  it("rejects unknown fields", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      extraField: "not allowed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = createTemplateSchema.safeParse({
      name: "a".repeat(256),
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(false);
  });

  it("accepts each valid category", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      const result = createTemplateSchema.safeParse({
        name: `Template ${cat}`,
        body: `<p>${cat}</p>`,
        category: cat,
      });
      expect(result.success).toBe(true);
    }
  });

  it("allows null category", () => {
    const result = createTemplateSchema.safeParse({
      name: "Test",
      body: "<p>Hi</p>",
      category: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTemplateSchema", () => {
  it("validates partial update with name only", () => {
    const result = updateTemplateSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("validates partial update with body only", () => {
    const result = updateTemplateSchema.safeParse({ body: "<p>New body</p>" });
    expect(result.success).toBe(true);
  });

  it("validates full update", () => {
    const result = updateTemplateSchema.safeParse({
      name: "Updated",
      subject: "New Subject",
      body: "<p>New body</p>",
      category: "payment",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateTemplateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects body without HTML", () => {
    const result = updateTemplateSchema.safeParse({ body: "no html" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = updateTemplateSchema.safeParse({ category: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = updateTemplateSchema.safeParse({ unauthorized: true });
    expect(result.success).toBe(false);
  });

  it("allows setting subject to null", () => {
    const result = updateTemplateSchema.safeParse({ subject: null });
    expect(result.success).toBe(true);
  });
});

describe("sendTemplateSchema", () => {
  it("validates single email recipient", () => {
    const result = sendTemplateSchema.safeParse({ to: "sponsor@test.com" });
    expect(result.success).toBe(true);
  });

  it("validates array of recipients", () => {
    const result = sendTemplateSchema.safeParse({
      to: ["one@test.com", "two@test.com"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing to field", () => {
    const result = sendTemplateSchema.safeParse({ variables: {} });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = sendTemplateSchema.safeParse({ to: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects empty recipient array", () => {
    const result = sendTemplateSchema.safeParse({ to: [] });
    expect(result.success).toBe(false);
  });

  it("validates all optional fields", () => {
    const result = sendTemplateSchema.safeParse({
      to: "sponsor@test.com",
      cc: "cc@test.com",
      bcc: ["bcc1@test.com", "bcc2@test.com"],
      replyTo: "reply@test.com",
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "550e8400-e29b-41d4-a716-446655440001",
      deliverableId: "550e8400-e29b-41d4-a716-446655440002",
      paymentId: "550e8400-e29b-41d4-a716-446655440003",
      variables: { sponsor_name: "Acme" },
      preview: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal send payload", () => {
    const result = sendTemplateSchema.safeParse({ to: "test@example.com" });
    expect(result.success).toBe(true);
  });
});

describe("duplicateTemplateSchema", () => {
  it("validates with custom name", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "My Copy" });
    expect(result.success).toBe(true);
  });

  it("validates with empty body (no name override)", () => {
    const result = duplicateTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("trims name whitespace", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "  spaced  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("spaced");
    }
  });

  it("rejects empty name", () => {
    const result = duplicateTemplateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("getRequiredVariablesForCategory", () => {
  it("returns outreach variables", () => {
    const vars = getRequiredVariablesForCategory("outreach");
    expect(vars).toContain("sponsor_name");
    expect(vars).toContain("creator_name");
    expect(vars).toContain("deal_amount");
  });

  it("returns deliverable variables", () => {
    const vars = getRequiredVariablesForCategory("deliverable");
    expect(vars).toContain("deliverable_title");
    expect(vars).toContain("due_date");
  });

  it("returns payment variables", () => {
    const vars = getRequiredVariablesForCategory("payment");
    expect(vars).toContain("invoice_amount");
    expect(vars).toContain("invoice_number");
    expect(vars).toContain("payment_due_date");
  });

  it("returns renewal variables", () => {
    const vars = getRequiredVariablesForCategory("renewal");
    expect(vars).toContain("deal_title");
    expect(vars).toContain("deal_amount");
    expect(vars).toContain("deal_start_date");
    expect(vars).toContain("deal_end_date");
  });

  it("returns empty for custom category", () => {
    expect(getRequiredVariablesForCategory("custom")).toEqual([]);
  });

  it("returns empty for null category", () => {
    expect(getRequiredVariablesForCategory(null)).toEqual([]);
  });
});

describe("TEMPLATE_TYPE_VARIABLE_MAP", () => {
  it("every category has a defined variable list", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(TEMPLATE_TYPE_VARIABLE_MAP[cat]).toBeDefined();
      expect(Array.isArray(TEMPLATE_TYPE_VARIABLE_MAP[cat])).toBe(true);
    }
  });

  it("all referenced variables are valid strings", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      for (const v of TEMPLATE_TYPE_VARIABLE_MAP[cat]) {
        expect(typeof v).toBe("string");
        expect(v.length).toBeGreaterThan(0);
        expect(v).toMatch(/^[a-z_]+$/);
      }
    }
  });
});
