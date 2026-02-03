"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInWithGoogle, SignInWithPassword } from "@/components/auth/SignIn";

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect to teams page if already signed in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/volleyball/teams");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Volley Studio
          </h1>
          <p className="text-gray-600">
            Sign in to save your teams and rotations
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <SignInWithGoogle />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          <SignInWithPassword />

          <div className="pt-2">
            <Link
              href="/volleyball"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Continue without signing in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
