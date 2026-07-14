"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface RepoNavProps {
  username: string;
  repo: string;
  branchCount: number;
  tagCount: number;
}

export default function RepoNav({
  username,
  repo,
  branchCount,
  tagCount,
}: RepoNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === `/${username}/${repo}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const linkClass = (href: string) => {
    const active = isActive(href);
    return `border-b-2 pb-3 px-1 transition-colors ${
      active
        ? "border-[var(--color-accent)] text-[var(--color-text-primary)] font-medium"
        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-border)]"
    }`;
  };

  return (
    <nav className="flex gap-6 -mb-px">
      <Link
        href={`/${username}/${repo}`}
        className={linkClass(`/${username}/${repo}`)}
      >
        Code
      </Link>
      <Link
        href={`/${username}/${repo}/commits`}
        className={linkClass(`/${username}/${repo}/commits`)}
      >
        Commits
      </Link>
      <Link
        href={`/${username}/${repo}/branches`}
        className={linkClass(`/${username}/${repo}/branches`)}
      >
        Branches
        {branchCount > 0 && (
          <span className="ml-1 text-xs bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded-full">
            {branchCount}
          </span>
        )}
      </Link>
      <Link
        href={`/${username}/${repo}/tags`}
        className={linkClass(`/${username}/${repo}/tags`)}
      >
        Tags
        {tagCount > 0 && (
          <span className="ml-1 text-xs bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded-full">
            {tagCount}
          </span>
        )}
      </Link>
      <Link
        href={`/${username}/${repo}/ci`}
        className={linkClass(`/${username}/${repo}/ci`)}
      >
        CI
      </Link>
      <Link
        href={`/${username}/${repo}/settings`}
        className={linkClass(`/${username}/${repo}/settings`)}
      >
        Settings
      </Link>
    </nav>
  );
}
