import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/security/encryption";

describe("encrypt", () => {
  it("encodes a string to base64", () => {
    expect(encrypt("hello")).toBe("aGVsbG8=");
  });

  it("encodes an empty string", () => {
    expect(encrypt("")).toBe("");
  });

  it("encodes unicode characters", () => {
    const encoded = encrypt("héllo wörld 你好");
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("produces different output for different inputs", () => {
    expect(encrypt("abc")).not.toBe(encrypt("def"));
  });

  it("produces valid base64", () => {
    const encoded = encrypt("test-value-123");
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe("decrypt", () => {
  it("decodes base64 back to original string", () => {
    expect(decrypt("aGVsbG8=")).toBe("hello");
  });

  it("roundtrips with encrypt", () => {
    const original = "SponsorSync API Key: sk-test-12345";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("roundtrips empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("roundtrips unicode characters", () => {
    const original = "日本語テスト 🎉 éèêë";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("roundtrips long strings", () => {
    const original = "a".repeat(10000);
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("roundtrips special characters", () => {
    const original = 'hello\n\t"world"\n<>&special=chars&more=true';
    expect(decrypt(encrypt(original))).toBe(original);
  });
});
