import { describe, it, expect } from "vitest";
import {
  extractVariables,
  extractVariablesFromTemplate,
  interpolateTemplate,
  validateVariables,
  getVariableInfo,
  TEMPLATE_VARIABLES,
} from "@/lib/templates/templateEngine";

describe("extractVariables", () => {
  it("extracts single variable", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("extracts multiple variables", () => {
    const result = extractVariables("Hello {{sponsor_name}} from {{creator_show}}");
    expect(result).toContain("sponsor_name");
    expect(result).toContain("creator_show");
    expect(result).toHaveLength(2);
  });

  it("extracts duplicate variables only once", () => {
    expect(extractVariables("{{name}} and {{name}} again")).toEqual(["name"]);
  });

  it("returns empty array for template without variables", () => {
    expect(extractVariables("Hello World")).toEqual([]);
  });

  it("extracts variables with underscores", () => {
    expect(extractVariables("{{deal_amount}}")).toEqual(["deal_amount"]);
  });

  it("ignores non-mustache patterns", () => {
    expect(extractVariables("{not_var} {{is_var}} {also_not}")).toEqual(["is_var"]);
  });
});

describe("extractVariablesFromTemplate", () => {
  it("combines variables from subject and body", () => {
    const result = extractVariablesFromTemplate(
      "Hello {{sponsor_name}}",
      "From {{creator_name}}"
    );
    expect(result).toContain("sponsor_name");
    expect(result).toContain("creator_name");
  });

  it("handles null subject", () => {
    const result = extractVariablesFromTemplate(null, "Hello {{name}}");
    expect(result).toEqual(["name"]);
  });

  it("deduplicates across subject and body", () => {
    const result = extractVariablesFromTemplate("{{name}}", "{{name}} again");
    expect(result).toEqual(["name"]);
  });
});

describe("interpolateTemplate", () => {
  it("replaces single variable", () => {
    expect(interpolateTemplate("Hello {{name}}", { name: "World" })).toBe("Hello World");
  });

  it("replaces multiple variables", () => {
    expect(
      interpolateTemplate("Hi {{sponsor_name}}, deal: {{deal_amount}}", {
        sponsor_name: "Acme Corp",
        deal_amount: "$500",
      })
    ).toBe("Hi Acme Corp, deal: $500");
  });

  it("leaves unmatched variables unchanged", () => {
    expect(interpolateTemplate("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("handles empty template", () => {
    expect(interpolateTemplate("", { name: "World" })).toBe("");
  });

  it("replaces all occurrences of same variable", () => {
    expect(interpolateTemplate("{{name}} and {{name}}", { name: "Alice" })).toBe(
      "Alice and Alice"
    );
  });

  it("ignores extra variables not in template", () => {
    expect(interpolateTemplate("Hello {{name}}", { name: "World", extra: "ignored" })).toBe(
      "Hello World"
    );
  });

  it("handles variables with empty string values", () => {
    expect(interpolateTemplate("Hello {{name}}!", { name: "" })).toBe("Hello !");
  });

  it("handles template with no variables", () => {
    expect(interpolateTemplate("No variables here", { name: "test" })).toBe(
      "No variables here"
    );
  });
});

describe("validateVariables", () => {
  it("returns valid when all variables provided", () => {
    const result = validateVariables("Hello {{name}}", { name: "World" });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns missing variables", () => {
    const result = validateVariables("Hello {{name}} {{age}}", { name: "World" });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["age"]);
  });

  it("returns valid for template with no variables", () => {
    const result = validateVariables("Hello World", {});
    expect(result.valid).toBe(true);
  });

  it("handles empty variable value as provided", () => {
    const result = validateVariables("Hello {{name}}", { name: "" });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["name"]);
  });
});

describe("getVariableInfo", () => {
  it("returns variable info for known key", () => {
    const info = getVariableInfo("sponsor_name");
    expect(info).toBeDefined();
    expect(info?.key).toBe("sponsor_name");
    expect(info?.label).toBe("Sponsor Name");
    expect(info?.required).toBe(true);
  });

  it("returns undefined for unknown key", () => {
    expect(getVariableInfo("unknown_var")).toBeUndefined();
  });
});

describe("TEMPLATE_VARIABLES", () => {
  it("contains all expected core variables", () => {
    const keys = TEMPLATE_VARIABLES.map((v) => v.key);
    expect(keys).toContain("sponsor_name");
    expect(keys).toContain("creator_name");
    expect(keys).toContain("creator_show");
    expect(keys).toContain("deal_amount");
    expect(keys).toContain("deliverable_description");
    expect(keys).toContain("due_date");
  });

  it("each variable has required fields", () => {
    for (const v of TEMPLATE_VARIABLES) {
      expect(v.key).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(typeof v.required).toBe("boolean");
    }
  });
});
