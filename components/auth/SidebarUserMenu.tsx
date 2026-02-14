"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { cn } from "@/lib/utils";

const triggerClass =
  "flex w-full items-center gap-2 rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0";

export function SidebarUserMenu() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md p-1">
        <div className="h-8 w-8 rounded-full bg-secondary animate-pulse" />
        <div className="h-3.5 flex-1 rounded-md bg-secondary animate-pulse group-data-[collapsible=icon]:hidden" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link href="/sign-in" className={triggerClass} aria-label="Sign in">
        <LogIn className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">Sign in</span>
      </Link>
    );
  }

  const displayIdentity = user?.email || user?.name || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(triggerClass, "text-left")}
          aria-label="Open account menu"
        >
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="h-8 w-8 rounded-full shrink-0"
            />
          ) : (
            <Facehash
              name={user?.email || user?.name || "user"}
              size={32}
              className="h-8 w-8 shrink-0"
            />
          )}
          <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
            {displayIdentity}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
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
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            void signOut();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
