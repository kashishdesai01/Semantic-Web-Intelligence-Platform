"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

/**
 * Redirects to /login if no auth token is present.
 * Call this at the top of every authenticated page component.
 */
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);
}
