"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listPublicRepositories,
  listUserRepositories,
  isAuthenticated,
  getCurrentUser,
} from "@/lib/api";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  is_private: boolean;
  clone_url: string;
  created_at: string;
}

export default function Home() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      setError(false);

      try {
        // Check if we have a token stored
        const hasToken = isAuthenticated();
        let authenticated = false;

        if (hasToken) {
          // Verify the token is still valid by calling the API
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              authenticated = true;
              setUsername(currentUser.username);
            }
          } catch {
            // Token is invalid or expired, treat as not authenticated
            authenticated = false;
          }
        }

        setIsLoggedIn(authenticated);

        if (authenticated) {
          // Fetch user's own repositories (includes private repos)
          // and public repositories in parallel
          const [userReposResponse, publicReposResponse] = await Promise.all([
            listUserRepositories().catch(() => ({ repositories: [] })),
            listPublicRepositories(1, 100).catch(() => ({ repositories: [] })),
          ]);

          const userRepos = userReposResponse.repositories || [];
          const publicRepos = publicReposResponse.repositories || [];

          // Merge user repos with public repos, avoiding duplicates
          // User's repos take priority (they may include private repos)
          const userRepoIds = new Set(userRepos.map((r) => r.id));
          const otherPublicRepos = publicRepos.filter(
            (r) => !userRepoIds.has(r.id),
          );

          // Combine: user's repos first, then other public repos
          setRepos([...userRepos, ...otherPublicRepos]);
        } else {
          // Fetch public repositories for unauthenticated users
          const response = await listPublicRepositories(1, 50);
          setRepos(response.repositories || []);
        }
      } catch (err) {
        console.error("Failed to fetch repositories:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
          <span className="ml-3 text-[var(--color-text-muted)]">Loading repositories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoggedIn ? "Repositories" : "Public Repositories"}
          </h1>
          {isLoggedIn && username && (
            <p className="text-[var(--color-text-muted)] mt-1">
              Welcome back, <span className="font-medium">{username}</span>
            </p>
          )}
        </div>
        <Link href="/new">
          <Button variant="primary">
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
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Repository
          </Button>
        </Link>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          Failed to load repositories. Please try again later.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <Link
            key={repo.id}
            href={`/${repo.owner}/${repo.name}`}
            className="group block p-6 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg text-[var(--color-accent)] group-hover:underline">
                {repo.owner} / {repo.name}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full border uppercase font-medium ${
                  repo.is_private
                    ? "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]"
                    : "bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                }`}
              >
                {repo.is_private ? "private" : "public"}
              </span>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm line-clamp-2 h-10">
              {repo.description || "No description provided."}
            </p>
            <div className="mt-3 text-xs text-[var(--color-text-muted)]">
              Created{" "}
              {new Date(repo.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </Link>
        ))}
        {repos.length === 0 && !error && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-text-muted)] mb-4"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <p className="text-[var(--color-text-muted)] font-medium">
              {isLoggedIn
                ? "No repositories found."
                : "No public repositories found."}
            </p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {isLoggedIn
                ? "Create a repository to get started."
                : "Sign in to see your repositories or create a new one."}
            </p>
            <Link href={isLoggedIn ? "/new" : "/auth/login"} className="mt-4">
              <Button variant="primary">
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
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {isLoggedIn ? "Create your first repository" : "Sign in"}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
