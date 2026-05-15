export function redirectToLogin(callbackUrl?: string): void {
  if (typeof window !== "undefined") {
    const url = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    window.location.href = url;
  }
}
