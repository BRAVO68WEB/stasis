"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ContributorRowProps {
  username: string;
  email: string;
  commitCount: number;
  totalCommits: number;
}

export default function ContributorRow({ username, email, commitCount, totalCommits }: ContributorRowProps) {
  const [linkedUser, setLinkedUser] = useState<{ username: string; display_name?: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/v1/users/by-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setLinkedUser(data);
        }
      } catch {
        // Silent fail
      }
    };

    if (email) {
      fetchUser();
    }
  }, [email]);

  const percentage = totalCommits > 0
    ? (commitCount / totalCommits * 100).toFixed(1)
    : "0";

  const displayName = linkedUser ? (linkedUser.display_name || linkedUser.username) : username;

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-medium text-white">
        {username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        {linkedUser ? (
          <Link
            href={`/${linkedUser.username}`}
            className="text-[var(--color-accent)] hover:underline font-medium"
          >
            {displayName}
          </Link>
        ) : (
          <span className="font-medium text-[var(--color-text-primary)]">
            {displayName}
          </span>
        )}
        <div className="text-sm text-[var(--color-text-muted)]">
          {commitCount} commits ({percentage}%)
        </div>
      </div>
      <div className="w-32 h-2 bg-[var(--color-bg-base)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)] rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
