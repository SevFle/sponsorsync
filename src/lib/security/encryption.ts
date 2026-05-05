export function encrypt(text: string): string {
  const encoded = Buffer.from(text, "utf-8").toString("base64");
  return encoded;
}

export function decrypt(encoded: string): string {
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  return decoded;
}
