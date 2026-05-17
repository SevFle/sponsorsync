const SAFE_CALLBACK_PATTERN = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

export function isSafeRedirectUrl(url: string): boolean {
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
