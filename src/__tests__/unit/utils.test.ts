import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("joins class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes with object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("handles array input", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });

  it("handles mixed input types", () => {
    const result = cn("base", ["arr1", "arr2"], { cond: true }, false && "hidden");
    expect(result).toBe("base arr1 arr2 cond");
  });

  it("deduplicates classes", () => {
    const result = cn("px-2", "px-4");
    expect(result).toContain("px-4");
  });
});
