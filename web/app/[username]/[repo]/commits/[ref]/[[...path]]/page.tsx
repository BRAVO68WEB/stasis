import { getCommits } from "@/lib/api";
import Link from "next/link";
import CommitAuthor from "@/components/CommitAuthor";

export default async function CommitsPage({
  params,
  searchParams,
}: {
  params: Promise<{
    username: string;
    repo: string;
    ref: string;
    path?: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { username, repo, ref: refParam, path: pathSegments } = await params;
  const { ref: queryRef } = await searchParams;
  
  // Support ref as query parameter for branch names with /
  const ref = (typeof queryRef === "string" ? queryRef : null) || refParam;
  const path = (pathSegments || []).map((p) => decodeURIComponent(p)).join("/");

  let commits: Array<{
    hash: string;
    short_hash: string;
    author: string;
    author_email: string;
    author_date: string;
    committer: string;
    committer_email: string;
    committer_date: string;
    message: string;
    parent_hashes: string[];
  }> = [];
  let failed = false;

  try {
    const data = await getCommits(username, repo, ref, path);
    commits = data.commits || [];
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="border border-base rounded-md overflow-hidden bg-panel">
        <div className="px-4 py-3 border-b border-base">
          <span className="font-semibold text-base">Commits</span>
        </div>
          <div className="p-4 text-base">
          Unable to load commits.
          <div className="mt-2">
            <Link
              href={ref.includes("/") 
                ? `/${username}/${repo}/tree/_?ref=${encodeURIComponent(ref)}`
                : `/${username}/${repo}/tree/${ref}`
              }
              className="text-accent hover:underline"
            >
              Browse files
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="border border-base rounded-md overflow-hidden bg-panel">
        <div className="px-4 py-3 border-b border-base flex items-center gap-2 text-sm">
          <span className="font-semibold text-base">Commits</span>
          <span className="bg-base px-2 py-0.5 rounded text-muted text-xs">
            {ref}
          </span>
          {path && (
            <>
              <span className="text-muted">/</span>
              <span className="font-medium text-base">{path}</span>
            </>
          )}
        </div>
        <div className="p-6 text-base">No commits found.</div>
      </div>
    );
  }

  return (
    <div className="border border-base rounded-md overflow-hidden bg-panel">
      <div className="px-4 py-3 border-b border-base flex items-center gap-2 text-sm">
        <span className="font-semibold text-base">Commits</span>
        <span className="bg-base px-2 py-0.5 rounded text-muted text-xs">
          {ref}
        </span>
        {path && (
          <>
            <span className="text-muted">/</span>
            <span className="font-medium text-base">{path}</span>
          </>
        )}
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {commits.map((commit) => (
          <div
            key={commit.hash}
            className="p-4 hover:bg-base transition-colors flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">
                {commit.message}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                <CommitAuthor author={commit.author} authorEmail={commit.author_email} />
                <span>
                  committed on{" "}
                  {new Date(commit.author_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex border border-base rounded-md overflow-hidden text-xs font-mono">
                <span className="bg-base px-2 py-1 text-muted border-r border-base">
                  commit
                </span>
                <Link
                  href={`/${username}/${repo}/commit/${commit.hash}`}
                  className="px-2 py-1 text-accent bg-panel hover:underline"
                >
                  {commit.hash.substring(0, 7)}
                </Link>
              </div>
              <Link
                href={`/${username}/${repo}/tree/${commit.hash}`}
                className="ml-2 text-xs px-2 py-1 rounded btn"
              >
                Browse Files
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
