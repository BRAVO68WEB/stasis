"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CommitAuthorProps {
  author: string;
  authorEmail: string;
}

export default function CommitAuthor({ author, authorEmail }: CommitAuthorProps) {
  const [linkedUser, setLinkedUser] = useState<{ username: string; display_name?: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/v1/users/by-email?email=${encodeURIComponent(authorEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setLinkedUser(data);
        }
      } catch {
        // Silent fail - author linking is optional
      }
    };

    if (authorEmail) {
      fetchUser();
    }
  }, [authorEmail]);

  if (linkedUser) {
    return (
      <Link
        href={`/${linkedUser.username}`}
        className="text-[var(--color-accent)] hover:underline font-medium"
        title={`${author} (${authorEmail})`}
      >
        {linkedUser.display_name || linkedUser.username}
      </Link>
    );
  }

  return (
    <span className="font-medium text-[var(--color-text-primary)]">
      {author}
    </span>
  );
}
