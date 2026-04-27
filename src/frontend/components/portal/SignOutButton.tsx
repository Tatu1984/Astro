"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/frontend/components/ui/Button";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      Sign out
    </Button>
  );
}
