const SAFE_CALLBACK_PATTERN = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

function decodeIteratively(url: string, maxRounds = 3): string {
  let decoded = url;
  for (let i = 0; i < maxRounds; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function hasPathTraversal(url: string): boolean {
  const decoded = decodeIteratively(url);
  const segments = decoded.split("/");
  return segments.some((segment) => segment === "..");
}

export function isSafeRedirectUrl(url: string): boolean {
  if (hasPathTraversal(url)) return false;
  return SAFE_CALLBACK_PATTERN.test(url);
}

export function redirectToLogin(callbackUrl?: string): void {
  if (typeof window !== "undefined") {
    let url: string;
    if (callbackUrl != null && isSafeRedirectUrl(callbackUrl)) {
      url = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } else {
      url = "/login";
    }
    window.location.href = url;
  }
}
