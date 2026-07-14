import Link from "next/link";
import { getRepository, listBranches, listTags, getTree } from "@/lib/api";
import BranchSelector from "@/components/BranchSelector";
import CloneCard from "@/components/CloneCard";
import RepoNav from "@/components/RepoNav";
import FileSearch from "@/components/FileSearch";
import { env } from "@/lib/env";

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string; repo: string }>;
}) {
  const { username, repo } = await params;
  const httpUrl = `${env.STASIS_SERVER_HOSTED_URL}/${username}/${repo}.git`;
  const sshUrl = `ssh://git@${env.STASIS_SSH_HOST_NAME}/${username}/${repo}.git`;

  let repoData: {
    is_private?: boolean;
    description?: string;
  } = {};
  let branches: Array<{ name: string; hash: string; is_head: boolean }> = [];
  let branchCount = 0;
  let tagCount = 0;
  let treeEntries: Array<{ name: string; path: string; type: string }> = [];

  try {
    const repoResponse = await getRepository(username, repo);
    repoData = {
      is_private: repoResponse.is_private,
      description: repoResponse.description,
    };
  } catch {
    repoData = {};
  }

  try {
    const branchResponse = await listBranches(username, repo);
    branches = branchResponse.branches;
    branchCount = branchResponse.total;
  } catch {
    branches = [];
  }

  try {
    const tagResponse = await listTags(username, repo);
    tagCount = tagResponse.total;
  } catch {
    tagCount = 0;
  }

  const defaultBranch = branches.find((b) => b.is_head)?.name || branches[0]?.name;
  if (defaultBranch) {
    try {
      const treeResponse = await getTree(username, repo, defaultBranch);
      treeEntries = treeResponse.entries.map((e) => ({
        name: e.name,
        path: e.path,
        type: e.type,
      }));
    } catch {
      treeEntries = [];
    }
  }

  const visibility = repoData.is_private ? "private" : "public";

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xl mb-2">
          <span className="text-accent">
            <Link
              href={`/${username}`}
              className="hover:underline cursor-pointer"
            >
              {username}
            </Link>
          </span>
          <span className="text-muted">/</span>
          <Link
            href={`/${username}/${repo}`}
            className="font-bold text-accent hover:underline"
          >
            {repo}
          </Link>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-base text-muted uppercase font-medium">
            {visibility}
          </span>
        </div>
        <p className="text-muted">{repoData.description || ""}</p>
      </div>

      <div className="border-b border-base mb-6 flex justify-between items-center">
        <RepoNav
          username={username}
          repo={repo}
          branchCount={branchCount}
          tagCount={tagCount}
        />
        <div className="flex items-center gap-2 mb-2">
          <BranchSelector
            branches={branches.map((b) => ({
              name: b.name,
              is_head: b.is_head,
            }))}
          />
          <CloneCard httpUrl={httpUrl} sshUrl={sshUrl} />
        </div>
      </div>

      {children}

      <FileSearch
        owner={username}
        repo={repo}
        currentRef={defaultBranch || "main"}
        files={treeEntries}
      />
    </div>
  );
}
