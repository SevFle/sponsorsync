import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  return timingSafeEqual(a, b);
}

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}
