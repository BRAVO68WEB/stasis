"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { storeAuthToken, storeUserInfo } from "@/lib/api";
import { UserInfo } from "@/lib/types";
import { Button, Alert } from "@/components/ui";

function OIDCCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        // Check for error from the identity provider (in query params)
        const errorParam = searchParams.get("error");
        if (errorParam) {
          const errorDescription =
            searchParams.get("error_description") || "Authentication failed";
          setError(errorDescription);
          setLoading(false);
          return;
        }

        // Parse the URL fragment (hash) for token and user data
        // The backend redirects with: /auth/callback#token=xyz&user=base64encodedJSON
        const hash = window.location.hash;

        if (hash && hash.length > 1) {
          const hashContent = hash.substring(1); // Remove the leading #
          const hashParams = new URLSearchParams(hashContent);
          const tokenFromHash = hashParams.get("token");
          const userBase64 = hashParams.get("user");

          if (tokenFromHash) {
            // Store the token in cookie
            storeAuthToken(tokenFromHash);

            // If we have user info, store it as well
            if (userBase64) {
              try {
                // Handle URL-safe base64 encoding
                const base64 = userBase64.replace(/-/g, "+").replace(/_/g, "/");
                // Add padding if needed
                const paddedBase64 =
                  base64 + "=".repeat((4 - (base64.length % 4)) % 4);
                const userJSON = atob(paddedBase64);
                const userInfo: UserInfo = JSON.parse(userJSON);
                storeUserInfo(userInfo);
              } catch (e) {
                console.warn("Failed to parse user info from callback:", e);
                // Continue anyway - the user info can be fetched later
              }
            }

            // Clear the hash from the URL for security
            window.history.replaceState(null, "", window.location.pathname);

            // Redirect to home page using window.location for a full page reload
            // This ensures the Header component re-checks authentication
            window.location.href = "/";
            return;
          }
        }

        // Fallback: Check for code and state in URL (OIDC authorization code flow)
        // This handles the case where the frontend directly receives the callback
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (code && state) {
          // The backend handles the callback at /api/v1/auth/oidc/callback
          // If we're here with code/state, we need to call the backend to exchange it
          try {
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL || "/api";
            const response = await fetch(
              `${apiUrl}/v1/auth/oidc/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
              {
                credentials: "include", // Include cookies for state validation
              },
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                message: "Authentication failed",
              }));
              setError(errorData.message || "Authentication failed");
              setLoading(false);
              return;
            }

            const data = await response.json();

            if (data.token) {
              storeAuthToken(data.token);

              // Store user info if available
              if (data.user) {
                storeUserInfo(data.user);
              }

              // Redirect to home page using window.location for a full page reload
              window.location.href = "/";
              return;
            }

            setError("No authentication token received");
          } catch (err) {
            console.error("Callback error:", err);
            setError("Failed to complete authentication");
          }
        } else {
          // No token in hash and no code/state - invalid callback
          setError("Invalid callback - missing authentication data");
        }

        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in callback:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-muted)]">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-[var(--color-text-primary)]">
              Authentication Failed
            </h2>
          </div>

          <Alert type="error">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </Alert>

          <div className="text-center">
            <Link href="/auth/login">
              <Button variant="primary" size="md">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function CallbackLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mx-auto"></div>
        <p className="mt-4 text-[var(--color-text-muted)]">Loading...</p>
      </div>
    </div>
  );
}

export default function OIDCCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoadingFallback />}>
      <OIDCCallbackContent />
    </Suspense>
  );
}
