import { getContributors } from "@/lib/api";
import ContributorRow from "@/components/ContributorRow";

export default async function ContributorsPage({
  params,
}: {
  params: Promise<{ username: string; repo: string }>;
}) {
  const { username, repo } = await params;

  let contributors: Array<{ username: string; email: string; commit_count: number }> = [];
  let failed = false;

  try {
    const response = await getContributors(username, repo);
    contributors = response.contributors || [];
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="p-6 text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-md bg-[var(--color-bg-panel)]">
        Unable to load contributors.
      </div>
    );
  }

  const totalCommits = contributors.reduce((sum, c) => sum + c.commit_count, 0);

  return (
    <div className="space-y-4">
      <div className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-bg-panel)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Contributors ({contributors.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {contributors.map((contributor) => (
            <ContributorRow
              key={contributor.email || contributor.username}
              username={contributor.username}
              email={contributor.email}
              commitCount={contributor.commit_count}
              totalCommits={totalCommits}
            />
          ))}
          {contributors.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
              No contributors found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
