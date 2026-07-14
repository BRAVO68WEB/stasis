"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/api";
import { Button, Alert } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    if (isAuthenticated()) {
      router.push("/");
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
            Account registration is handled through your identity provider
          </p>
        </div>

        <Alert type="info">
          <p className="font-medium">Single Sign-On (SSO) Authentication</p>
          <p className="mt-1">
            This application uses your organization&apos;s identity provider for
            authentication. When you sign in for the first time, your account
            will be automatically created.
          </p>
        </Alert>

        <div className="text-center">
          <Link href="/auth/login">
            <Button variant="primary" size="lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Sign in with SSO
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[var(--color-accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
