"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { SignInWithGoogle, SignInWithPassword } from "@/components/auth/SignIn";
import VolleyWordmark from "@/components/logo/VolleyWordmark";

const BackgroundShader = dynamic(
  () => import("@/components/BackgroundShader").then((mod) => mod.BackgroundShader),
  { ssr: false }
);
const DevAdminSignIn = process.env.NODE_ENV === "development"
  ? dynamic(
      () => import("@/components/auth/DevAdminSignIn").then((mod) => mod.DevAdminSignIn),
      { ssr: false }
    )
  : () => null;

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
          <VolleyWordmark fillColor="#f97316" height={48} />
        </div>

        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Sign in to save your rosters, layouts, and settings.
          </p>
        </div>

        <div className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/60 p-6 space-y-4">
          <SignInWithGoogle />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
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

          {process.env.NODE_ENV === "development" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">dev</span>
                </div>
              </div>
              <DevAdminSignIn />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
