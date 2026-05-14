import { describe, it, expect } from "vitest";
import {
  renderEmailFromTemplate,
  stripHandlebarsConditionals,
} from "@/lib/email/emailRenderer";

describe("renderEmailFromTemplate", () => {
  it("interpolates subject and body with variables", () => {
    const result = renderEmailFromTemplate(
      "Hello {{sponsor_name}}",
      "<p>Deal: {{deal_amount}}</p>",
      { sponsor_name: "Acme", deal_amount: "$500" }
    );

    expect(result.subject).toBe("Hello Acme");
    expect(result.html).toContain("Deal: $500");
    expect(result.text).toContain("Deal: $500");
  });

  it("wraps body in HTML email envelope", () => {
    const result = renderEmailFromTemplate(null, "<p>Hello</p>", {});

    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("<html");
    expect(result.html).toContain("<body");
  });

  it("handles null subject", () => {
    const result = renderEmailFromTemplate(null, "<p>Hello</p>", {});
    expect(result.subject).toBe("");
  });

  it("generates plain text from HTML", () => {
    const result = renderEmailFromTemplate(
      null,
      "<h1>Title</h1><p>Hello <strong>World</strong></p><br/><p>Line 2</p>",
      {}
    );

    expect(result.text).toContain("Title");
    expect(result.text).toContain("Hello World");
    expect(result.text).toContain("Line 2");
    expect(result.text).not.toContain("<h1>");
    expect(result.text).not.toContain("<strong>");
  });

  it("converts links to text with URL", () => {
    const result = renderEmailFromTemplate(
      null,
      '<a href="https://example.com">Click here</a>',
      {}
    );

    expect(result.text).toContain("Click here");
    expect(result.text).toContain("https://example.com");
  });

  it("handles HTML entities in plain text conversion", () => {
    const result = renderEmailFromTemplate(
      null,
      "<p>A &amp; B &lt; C &gt; D &quot;E&quot;</p>",
      {}
    );

    expect(result.text).toContain("A & B < C > D");
  });

  it("preserves unmatched variables in output", () => {
    const result = renderEmailFromTemplate(
      "Hello {{unknown_var}}",
      "<p>{{another}}</p>",
      {}
    );

    expect(result.subject).toContain("{{unknown_var}}");
    expect(result.html).toContain("{{another}}");
  });
});

describe("stripHandlebarsConditionals", () => {
  it("strips {{#if}} blocks keeping content", () => {
    const result = stripHandlebarsConditionals(
      "{{#if sponsor_company}}Company: {{sponsor_company}}{{/if}}"
    );
    expect(result).toBe("Company: {{sponsor_company}}");
  });

  it("handles multiple conditionals", () => {
    const result = stripHandlebarsConditionals(
      "{{#if a}}A{{/if}} middle {{#if b}}B{{/if}}"
    );
    expect(result).toBe("A middle B");
  });

  it("handles nested-like content", () => {
    const html = "<div>{{#if show_header}}<h1>Header</h1>{{/if}}</div>";
    const result = stripHandlebarsConditionals(html);
    expect(result).toBe("<div><h1>Header</h1></div>");
  });

  it("returns original when no conditionals present", () => {
    const html = "<p>Hello {{name}}</p>";
    expect(stripHandlebarsConditionals(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(stripHandlebarsConditionals("")).toBe("");
  });
});
