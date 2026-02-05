"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignOut } from "./SignIn";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { Facehash } from "facehash";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.viewer,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign in</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <Facehash name={user?.email || user?.name || "user"} size={32} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user?.name || "User"}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/teams" className="cursor-pointer">
            My Teams
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-0">
          <SignOut />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
