"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function DevAdminSignIn() {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);

  const handleDevSignIn = async () => {
    setIsLoading(true);
    try {
      try {
        await signIn("password", {
          email: "admin@volley.dev",
          password: "adminadmin",
          flow: "signIn",
        });
      } catch {
        await signIn("password", {
          email: "admin@volley.dev",
          password: "adminadmin",
          flow: "signUp",
        });
      }
    } catch (err) {
      console.error("Dev admin sign in error:", err);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDevSignIn}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {isLoading ? "Signing in..." : "Sign in as Admin"}
    </button>
  );
}
