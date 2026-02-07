"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInWithGoogle, SignInWithPassword } from "@/components/auth/SignIn";
import { BackgroundShader } from "@/components/BackgroundShader";

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect to teams page if already signed in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/teams");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <BackgroundShader />

      {/* Content */}
      <div className="w-full max-w-sm relative z-10">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2C12 2 14.5 5.5 14.5 12C14.5 18.5 12 22 12 22" />
              <path d="M12 2C12 2 9.5 5.5 9.5 12C9.5 18.5 12 22 12 22" />
              <path d="M2 12H22" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 uppercase tracking-wide">
            Volley Studio
          </h1>
          <p className="text-muted-foreground">
            Sign in to save your teams and rotations
          </p>
        </div>

        <div className="bg-transparent backdrop-blur-sm rounded-xl border border-border/60 p-6 space-y-4">
          <SignInWithGoogle />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/80 px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <SignInWithPassword />

          <div className="pt-2">
            <Link
              href="/"
              className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue without signing in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
