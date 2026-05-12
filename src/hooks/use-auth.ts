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
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
  };
}
