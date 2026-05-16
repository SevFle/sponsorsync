function isSafeRedirectUrl(url: string): boolean {
  if (!url || url.startsWith("//")) return false;
  try {
    const parsed = new URL(url, "http://localhost");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (parsed.origin !== "http://localhost") return false;
    return true;
  } catch {
    return false;
  }
}

export function redirectToLogin(callbackUrl?: string): void {
  if (typeof window !== "undefined") {
    let url: string;
    if (callbackUrl && isSafeRedirectUrl(callbackUrl)) {
      url = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } else {
      url = "/login";
    }
    window.location.href = url;
  }
}
