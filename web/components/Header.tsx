"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  isAuthenticated,
  logout,
  logoutLocal,
  getCurrentUser,
  getStoredUserInfo,
  storeUserInfo,
} from "@/lib/api";
import { UserInfo } from "@/lib/types";
import Button from "@/components/ui/Button";
import Dropdown from "@/components/ui/Dropdown";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        setIsLoggedIn(true);

        // First, try to use stored user info for immediate display
        const storedUser = getStoredUserInfo();
        if (storedUser) {
          setUser(storedUser);
        }

        // Then verify with the API and update if needed
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          // Update stored user info if it changed
          storeUserInfo(userData);
        } catch {
          // Token might be invalid or expired - clear cookies
          // This prevents redirect loops when trying to re-login
          logoutLocal();
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    checkAuth();
    setShowMobileMenu(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const response = await logout();
      setIsLoggedIn(false);
      setUser(null);

      // If the provider has a logout URL, redirect to it
      if (response?.logout_url) {
        window.location.href = response.logout_url;
      } else {
        window.location.href = "/";
      }
    } catch {
      // If logout fails, still clear local state
      logoutLocal();
      setIsLoggedIn(false);
      setUser(null);
      window.location.href = "/";
    }
  };

  return (
    <header className="relative border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Home Link */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-accent)]"
              >
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="3" x2="12" y2="9" />
                <line x1="12" y1="15" x2="12" y2="21" />
                <path d="M9 12H3" />
                <path d="M21 12h-6" />
              </svg>
              <span>Stasis</span>
            </Link>
          </div>

          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label={showMobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={showMobileMenu}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            {showMobileMenu ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>

          {/* Right side navigation — desktop only */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                {/* New dropdown */}
                <Dropdown
                  trigger={
                    <Button variant="primary" size="sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </Button>
                  }
                >
                  <div className="w-56 py-1">
                    <Link
                      href="/new"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        <path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                      <div>
                        <div className="font-medium">New repository</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          Create a new repository
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/import"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      <div>
                        <div className="font-medium">Import repository</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          Import from external Git
                        </div>
                      </div>
                    </Link>
                  </div>
                </Dropdown>

                {/* User dropdown */}
                <Dropdown
                  align="right"
                  trigger={
                    <button
                      aria-label="User menu"
                      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-medium text-white">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  }
                >
                  <div className="w-56 py-1">
                    {user && (
                      <div className="px-4 py-2 border-b border-[var(--color-border)]">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {user.username}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {user.email}
                        </p>
                      </div>
                    )}

                    <Link
                      href={user ? `/${user.username}` : "/"}
                      className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Your repositories
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Settings
                    </Link>

                    <div className="border-t border-[var(--color-border)] my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </Dropdown>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
                >
                  Sign in
                </Link>
                <Link href="/auth/login">
                  <Button variant="primary" size="sm">
                    Sign up with SSO
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu overlay */}
          {showMobileMenu && (
            <div className="absolute top-14 left-0 right-0 z-50 bg-[var(--color-bg-panel)] border-b border-[var(--color-border)] shadow-lg md:hidden">
              <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
                {isLoggedIn ? (
                  <>
                    {user && (
                      <div className="px-3 py-2 border-b border-[var(--color-border)] mb-2">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {user.username}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {user.email}
                        </p>
                      </div>
                    )}

                    <Link
                      href="/new"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        <path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                      New repository
                    </Link>

                    <Link
                      href="/import"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      Import repository
                    </Link>

                    <div className="border-t border-[var(--color-border)] my-1" />

                    <Link
                      href={user ? `/${user.username}` : "/"}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        <path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                      Your repositories
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--color-text-muted)]"
                      >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Settings
                    </Link>

                    <div className="border-t border-[var(--color-border)] my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setShowMobileMenu(false)}
                      className="px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/login"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Button variant="primary" size="sm" className="w-full">
                        Sign up with SSO
                      </Button>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
