"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Temporary sign-in page while auth credentials are being configured
// TODO: Restore full auth once AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET are set up
export default function SignInPage() {
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
          <p className="text-center text-gray-500 text-sm">
            Account sign-in coming soon!
          </p>
          <p className="text-center text-gray-400 text-xs">
            For now, teams are shared publicly. Sign-in will let you save private teams.
          </p>
          <Link href="/volleyball" className="block">
            <Button className="w-full">
              Continue to Volley Studio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
