"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UseAuthOptions {
  redirectTo?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = "/login" } = options;
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentPath = window.location.pathname;
      router.replace(
        `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`
      );
    }
  }, [status, redirectTo, router]);

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
  };
}
