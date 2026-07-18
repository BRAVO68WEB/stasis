import {
  listBranches,
  getTree,
  getRepositoryStats,
  getBlob,
  getLicense,
  getContributors,
  getRepository,
} from "@/lib/api";
import { RepoFileTree } from "@/components/RepoFileTree";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { env } from "@/lib/env";
import type { RepoStats } from "@/lib/types";
import Link from "next/link";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ username: string; repo: string }>;
}) {
  const { username, repo } = await params;

  // Fetch repository details including clone URLs
  const httpUrl = `${env.STASIS_SERVER_HOSTED_URL}/${username}/${repo}.git`;
  const sshUrl = `ssh://git@${env.STASIS_SSH_HOST_NAME}/${username}/${repo}.git`;

  let ref = "HEAD";
  const path = "";
  let entries: Awaited<ReturnType<typeof getTree>>["entries"] = [];
  let treeFailed = false;
  let stats: RepoStats | null = null;
  let readmeContent = "";
  let readmePath = "";
  let licenseData: { license: string; filename: string } | null = null;
  let contributorsCount = 0;
  let repoDescription = "";

  try {
    const branchResponse = await listBranches(username, repo);
    const branches = branchResponse.branches;
    const defaultBranch = branches.find((b) => b.is_head) || branches[0];
    if (defaultBranch) {
      ref = defaultBranch.name;
    }

    const [statsResponse, treeData, repoResponse] = await Promise.all([
      getRepositoryStats(username, repo, ref).catch(() => null),
      getTree(username, repo, ref).catch(() => null),
      getRepository(username, repo).catch(() => null),
    ]);

    stats = statsResponse;
    if (treeData) {
      entries = treeData.entries;
    } else {
      treeFailed = true;
    }

    if (repoResponse) {
      repoDescription = repoResponse.description || "";
    }

    const [licenseResult, contributorsResult] = await Promise.all([
      getLicense(username, repo).catch(() => null),
      getContributors(username, repo).catch(() => null),
    ]);

    licenseData = licenseResult;
    if (contributorsResult) {
      contributorsCount = contributorsResult.total;
    }

    if (!treeFailed) {
      const tryNames = ["README.md", "readme.md", "README", "Readme.md", "README.MD"];
      for (const name of tryNames) {
        try {
          const data = await getBlob(username, repo, ref, name);
          readmeContent = data.content;
          readmePath = name;
          break;
        } catch {}
      }
    }
  } catch {
    treeFailed = true;
  }

  if (treeFailed) {
    return (
      <div className="space-y-4">
        <div className="p-8 text-center border border-base rounded-lg bg-panel">
          <h3 className="text-lg font-medium mb-2">Empty Repository</h3>
          <p className="text-muted">
            This repository seems to be empty or does not have a HEAD reference.
          </p>
          <div className="mt-4 p-4 bg-base rounded text-left overflow-x-auto">
            <pre className="text-sm">
              {`git clone ${httpUrl}
cd ${repo}
echo "# ${repo}" >> README.md
git add README.md
git commit -m "Initial commit"
git push origin HEAD

OR

git clone ${sshUrl}
cd ${repo}
echo "# ${repo}" >> README.md
git add README.md
git commit -m "Initial commit"
git push origin HEAD
`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const latestCommit = entries.length > 0 ? entries[0] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-4">
        {latestCommit?.last_commit_message && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-md mb-4">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-xs text-white shrink-0">
              {latestCommit.last_commit_author?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[var(--color-text-primary)] font-medium truncate">
                {latestCommit.last_commit_author}
              </span>
              <span className="text-[var(--color-text-muted)] mx-2">&middot;</span>
              <span className="text-[var(--color-text-secondary)] truncate">
                {latestCommit.last_commit_message}
              </span>
            </div>
            <span className="text-[var(--color-text-muted)] text-sm shrink-0">
              {formatRelativeTime(latestCommit.last_commit_date!)}
            </span>
          </div>
        )}
        <RepoFileTree
          owner={username}
          name={repo}
          currentRef={ref}
          path={path}
          entries={entries}
        />
        {readmeContent && (
          <div className="border border-base rounded-md overflow-hidden bg-panel">
            <div className="px-4 py-3 border-b border-base flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono bg-base px-2 py-1 rounded text-muted">
                  {ref}
                </span>
                <span className="text-muted">/</span>
                <span className="font-medium text-base">{readmePath}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${username}/${repo}/blob/${encodeURIComponent(ref)}/${encodeURIComponent(readmePath)}`}
                  className="text-xs px-2 py-1 rounded btn"
                >
                  Open
                </Link>
              </div>
            </div>
            <div className="p-4">
              <MarkdownRenderer content={readmeContent} />
            </div>
          </div>
        )}
      </div>
        <div className="space-y-4">
          {(repoDescription || licenseData) && (
            <div className="border border-base rounded-md overflow-hidden bg-panel">
              <div className="px-4 py-3 border-b border-base">
                <h3 className="font-medium text-base">About</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {repoDescription && (
                  <p className="text-muted">{repoDescription}</p>
                )}
                {licenseData && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">📄</span>
                    <span className="font-medium">{licenseData.license} License</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="border border-base rounded-md overflow-hidden bg-panel">
            <div className="px-4 py-3 border-b border-base">
              <h3 className="font-medium text-base">Project information</h3>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {stats && renderLanguageBar(stats)}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted">⎯</span>
                  <span className="font-medium">
                    {getCommitsCount(stats)} Commits
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">⚭</span>
                  <span className="font-medium">
                    {getBranchesCount(stats)} Branches
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">🏷</span>
                  <span className="font-medium">{getTagsCount(stats)} Tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">🗃️</span>
                  <span className="font-medium">{getRepoSize(stats)}</span>
                </div>
                <Link
                  href={`/${username}/${repo}/contributors`}
                  className="flex items-center gap-2 hover:text-accent"
                >
                  <span className="text-muted">👥</span>
                  <span className="font-medium">
                    {contributorsCount} Contributors
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div className="border border-base rounded-md overflow-hidden bg-panel">
            <div className="px-4 py-3 border-b border-base">
              <h3 className="font-medium text-base">Quick links</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <Link
                href={`/${username}/${repo}/blob/${encodeURIComponent(ref)}/README.md`}
                className="flex items-center gap-2 text-muted hover:text-base transition-colors"
              >
                <span>📁</span>
                <span>README</span>
              </Link>
              {licenseData && (
                <Link
                  href={`/${username}/${repo}/blob/${encodeURIComponent(ref)}/${licenseData.filename}`}
                  className="flex items-center gap-2 text-muted hover:text-base transition-colors"
                >
                  <span>📄</span>
                  <span>LICENSE</span>
                </Link>
              )}
              <Link
                href={`/${username}/${repo}/blob/${encodeURIComponent(ref)}/CONTRIBUTING.md`}
                className="flex items-center gap-2 text-muted hover:text-base transition-colors"
              >
                <span>📝</span>
                <span>CONTRIBUTING</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
}

function getCommitsCount(stats: RepoStats | null): number {
  if (!stats) return 0;
  return stats.total_commits ?? 0;
}

function getBranchesCount(stats: RepoStats | null): number {
  if (!stats) return 0;
  return stats.branch_count;
}

function getTagsCount(stats: RepoStats | null): number {
  if (!stats) return 0;
  return stats.tag_count;
}

function getRepoSize(stats: RepoStats | null): string {
  if (!stats) return "0B";
  let size = stats.disk_usage;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
}

function renderLanguageBar(stats: RepoStats) {
  const usage = stats.language_usage_perc || {};
  const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (entries.length === 0 || total === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded bg-base overflow-hidden flex">
        {entries.map(([lang, pct], i) => (
          <div
            key={lang}
            style={{ width: `${pct}%`, backgroundColor: languageColor(lang, i) }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {entries.map(([lang, pct], i) => (
          <div key={lang} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded"
              style={{ backgroundColor: languageColor(lang, i) }}
            />
            <span className="text-muted">
              {lang}: {pct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function languageColor(lang: string, i: number): string {
  const palette: Record<string, string> = {
    "JavaScript": "#f1e05a",
    "TypeScript": "#3178c6",
    "Go": "#00ADD8",
    "Python": "#3572A5",
    "Java": "#b07219",
    "C": "#555555",
    "C++": "#f34b7d",
    "C/C++": "#6e4c13",
    "Ruby": "#701516",
    "PHP": "#4F5D95",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "JSON": "#292929",
    "YAML": "#cb171e",
    "Markdown": "#083fa1",
    "Rust": "#dea584",
    "Shell": "#89e051",
    "Dockerfile": "#384d54",
    "Kotlin": "#A97BFF",
    "Swift": "#F05138",
    "Dart": "#00B4AB",
    "Lua": "#000080",
    "SQL": "#e38c00",
    "XML": "#0060ac",
  };
  return palette[lang] ?? hslFromIndex(i);
}

function hslFromIndex(i: number): string {
  const hue = (i * 47) % 360;
  return `hsl(${hue}deg 60% 45%)`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
