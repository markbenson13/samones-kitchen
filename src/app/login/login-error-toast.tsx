"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

export function LoginErrorToast({ error }: { error?: string }) {
  const toast = useToast();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (!error || shown.current) return;
    shown.current = true;
    toast.error(
      error === "pending"
        ? "Your Google account is signed in but not yet approved. Ask an existing admin to approve it from the Users page."
        : "Invalid email or password. Please try again."
    );
    // Strip the query param so refreshing the page doesn't re-show the toast.
    router.replace("/login");
  }, [error, toast, router]);

  return null;
}
