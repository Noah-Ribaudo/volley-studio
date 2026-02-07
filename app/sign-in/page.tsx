"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInWithGoogle, SignInWithPassword } from "@/components/auth/SignIn";
import { BackgroundShader } from "@/components/BackgroundShader";
import VolleyWordmark from "@/components/logo/VolleyWordmark";

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
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <VolleyWordmark fillColor="currentColor" height={48} className="text-foreground" />
        </div>

        <div className="text-center mb-8">
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
