import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? "";
}

export function generateIcalToken(userId: string): string {
  const secret = getSecret();
  const hmac = createHmac("sha256", secret).update(userId).digest("base64url");
  return `${Buffer.from(userId).toString("base64url")}.${hmac}`;
}

export function validateIcalToken(token: string): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const userIdEncoded = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  let userId: string;
  try {
    userId = Buffer.from(userIdEncoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  if (!userId) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(userId)
    .digest("base64url");

  if (signature.length !== expectedSignature.length) return null;

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  return userId;
}
