import { listPublicRepositories, listUserRepositories, getUserProfile, getRepoActivity, getBlob } from "@/lib/api";
import { getServerCurrentUser } from "@/lib/server-auth";
import Link from "next/link";
import Button from "@/components/ui/Button";
import CommitGraphWrapper from "@/components/CommitGraphWrapper";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getSocialPlatform, mastodonToUrl, isMastodonUsername } from "@/lib/social-icons";
import type { DayActivity, ActivityResponse } from "@/lib/types";

export default async function UserReposPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let repos: Array<{
    id: string;
    name: string;
    owner: string;
    description: string;
    is_private: boolean;
    clone_url: string;
    created_at: string;
    updated_at: string;
  }> = [];
  let failed = false;
  let isOwnProfile = false;

  // First, try to get the current user (won't throw, returns null if not authenticated)
  let currentUser = null;
  try {
    currentUser = await getServerCurrentUser();
  } catch {
    // Ignore auth errors - user is just not logged in
  }

  if (currentUser && currentUser.username === username) {
    // Viewing own profile - show all repos (public + private)
    isOwnProfile = true;
    try {
      const response = await listUserRepositories();
      repos = response.repositories || [];
    } catch (error) {
      console.error("[UserReposPage] Failed to fetch user repos:", error);
      failed = true;
    }
  } else {
    // Not logged in OR viewing another user's profile - show only their public repos
    try {
      const response = await listPublicRepositories(1, 100);
      repos = (response.repositories || []).filter((r) => r.owner === username);
    } catch (error) {
      console.error("[UserReposPage] Failed to fetch public repos:", error);
      failed = true;
    }
  }

  // Fetch user profile
  let profile = null;
  try {
    profile = await getUserProfile(username);
  } catch {
    // Profile endpoint might not exist yet or user not found
  }

  // Fetch profile README from .stasis repo (like GitHub's profile README)
  let profileReadme = "";
  try {
    const readmeData = await getBlob(username, ".stasis", "main", "README.md");
    profileReadme = readmeData.content;
  } catch {
    // No .stasis repo or no README.md - that's fine
  }

  // Fetch activity for all repos and aggregate
  let activity: ActivityResponse | null = null;
  if (repos.length > 0) {
    const activityResults = await Promise.all(
      repos.map((r) =>
        getRepoActivity(r.owner, r.name, 365).catch(() => null),
      ),
    );

    const dayMap = new Map<string, DayActivity>();
    let total = 0;
    for (const result of activityResults) {
      if (!result) continue;
      total += result.total;
      for (const day of result.days) {
        const existing = dayMap.get(day.date);
        if (existing) {
          existing.count += day.count;
          existing.level = Math.min(4, existing.level + day.level);
        } else {
          dayMap.set(day.date, { ...day });
        }
      }
    }

    const sortedDays = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Recompute levels from aggregated counts
    const maxCount = Math.max(...sortedDays.map((d) => d.count), 1);
    for (const day of sortedDays) {
      if (day.count === 0) day.level = 0;
      else if (day.count <= maxCount * 0.25) day.level = 1;
      else if (day.count <= maxCount * 0.5) day.level = 2;
      else if (day.count <= maxCount * 0.75) day.level = 3;
      else day.level = 4;
    }

    // Compute streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    for (const day of sortedDays) {
      if (day.count > 0) {
        streak++;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }
    // Current streak: count from the end
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (sortedDays[i].count > 0) currentStreak++;
      else break;
    }

    if (sortedDays.length > 0) {
      activity = {
        days: sortedDays,
        total,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      };
    }
  }

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : null;

  if (failed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]">
          Unable to load repositories.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1280px]">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left sidebar - profile info (sticky) */}
        <aside className="lg:w-[296px] shrink-0">
          <div className="lg:sticky lg:top-24">
            {/* Avatar */}
            <div className="mb-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={username}
                  className="w-[296px] h-[296px] rounded-full border border-[var(--color-border)]"
                />
              ) : (
                <div className="w-[296px] h-[296px] rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="96"
                    height="96"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--color-text-muted)]"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="mb-2">
              {profile?.display_name && (
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
                  {profile.display_name}
                </h1>
              )}
              <p className="text-lg text-[var(--color-text-muted)]">
                {username}
              </p>
            </div>

            {/* Edit profile button */}
            {isOwnProfile && (
              <div className="mb-4">
                <Link href="/settings">
                  <Button variant="secondary" size="sm" className="w-full">
                    Edit profile
                  </Button>
                </Link>
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
              {profile?.company && (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                    <path d="M10 6h4" />
                    <path d="M10 10h4" />
                    <path d="M10 14h4" />
                    <path d="M10 18h4" />
                  </svg>
                  <span>{profile.company}</span>
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{profile.location}</span>
                </div>
              )}
              {profile?.website && (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent)] hover:underline truncate"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              {joinDate && (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span>Joined {joinDate}</span>
                </div>
              )}
            </div>

            {/* Social links */}
            {profile?.social_links && profile.social_links.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex flex-col gap-2">
                  {profile.social_links.map((link) => {
                    const platform = getSocialPlatform(link.url);
                    const href = isMastodonUsername(link.url) ? mastodonToUrl(link.url) : link.url;
                    return (
                      <a
                        key={link.url}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <span className="shrink-0" style={{ color: platform.color }}>
                          {platform.icon}
                        </span>
                        <span className="truncate">{link.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right side - content */}
        <main className="flex-1 min-w-0">
          {/* Profile README */}
          {profileReadme && (
            <div className="mb-6 border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-panel)]">
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="font-medium text-sm text-[var(--color-text-primary)]">
                  {username}/.stasis
                </h3>
              </div>
              <div className="p-4">
                <MarkdownRenderer content={profileReadme} />
              </div>
            </div>
          )}

          {/* Contribution graph */}
          {activity && (
            <div className="mb-6">
              <CommitGraphWrapper
                initialDays={activity.days}
                initialTotal={activity.total}
                initialYear={activity.year || new Date().getFullYear()}
                owner={username}
                repos={repos.map(r => ({ owner: r.owner, name: r.name }))}
              />
            </div>
          )}

          {/* Repository list header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Repositories
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                {repos.length}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Find a repository..."
                  className="w-64 pl-9 pr-4 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                  readOnly
                />
              </div>
              {isOwnProfile && (
                <Link href="/new">
                  <Button variant="primary" size="sm">
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
                    New
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Repository list */}
          {repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]">
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
                No repositories found.
              </p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                {isOwnProfile
                  ? "You haven't created any repositories yet."
                  : `${username} hasn't created any public repositories yet.`}
              </p>
              {isOwnProfile && (
                <Link href="/new" className="mt-4">
                  <Button variant="primary" size="sm">
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
                    Create your first repository
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="border-t border-[var(--color-border)]">
              {repos.map((repo, index) => (
                <div
                  key={repo.id}
                  className={`py-4 px-2 flex items-start justify-between gap-4 ${
                    index < repos.length - 1
                      ? "border-b border-[var(--color-border)]"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${username}/${repo.name}`}
                        className="text-[var(--color-accent)] font-semibold hover:underline text-lg truncate"
                      >
                        {repo.name}
                      </Link>
                      <span
                        className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${
                          repo.is_private
                            ? "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]"
                            : "bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                        }`}
                      >
                        {repo.is_private ? "Private" : "Public"}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-[var(--color-text-muted)] line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)] pt-1">
                    {new Date(repo.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
