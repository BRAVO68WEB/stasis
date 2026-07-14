"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileEntry } from "@/lib/types";
import { getIconSrc } from "@/lib/icons";
import { getFileCommit } from "@/lib/api";

interface FileRowProps {
  entry: FileEntry;
  owner: string;
  repo: string;
  ref: string;
  href: string;
}

function FileRow({ entry, owner, repo, ref, href }: FileRowProps) {
  const [commit, setCommit] = useState<{
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchCommit = async () => {
      try {
        const entryPath = entry.path || entry.name;
        const data = await getFileCommit(owner, repo, ref, entryPath);
        if (!cancelled) {
          setCommit(data);
        }
      } catch {
        // Silent fail - commit info is optional
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCommit();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, ref, entry.path, entry.name]);

  return (
    <tr className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-bg-base)] transition-colors">
      <td className="px-4 py-2 w-12 align-middle">
        <div className="flex items-center justify-center">
          <img src={getIconSrc(entry)} alt="" className="w-5 h-5 block" />
        </div>
      </td>
      <td className="px-4 py-2">
        <Link
          href={href}
          className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline block"
        >
          {entry.name}
        </Link>
      </td>
      <td className="px-4 py-2 max-w-xs truncate text-[var(--color-text-secondary)]">
        {loading ? (
          <span className="inline-block w-24 h-4 bg-[var(--color-bg-hover)] rounded animate-pulse" />
        ) : commit ? (
          <span title={commit.message}>{commit.message}</span>
        ) : (
          ""
        )}
      </td>
      <td className="px-4 py-2 text-[var(--color-text-muted)] text-xs">
        {loading ? (
          <span className="inline-block w-16 h-4 bg-[var(--color-bg-hover)] rounded animate-pulse" />
        ) : commit ? (
          commit.author
        ) : (
          ""
        )}
      </td>
      <td className="px-4 py-2 text-right text-[var(--color-text-muted)] text-xs whitespace-nowrap">
        {loading ? (
          <span className="inline-block w-12 h-4 bg-[var(--color-bg-hover)] rounded animate-pulse ml-auto" />
        ) : commit ? (
          formatRelativeTime(commit.date)
        ) : (
          ""
        )}
      </td>
    </tr>
  );
}

export function RepoFileTree({
  owner,
  name,
  currentRef,
  path,
  entries,
}: {
  owner: string;
  name: string;
  currentRef: string;
  path: string;
  entries: FileEntry[];
}) {
  const list = Array.isArray(entries) ? entries : [];
  const sorted = [...list].sort((a, b) => {
    if (a.type === "tree" && b.type === "blob") return -1;
    if (a.type === "blob" && b.type === "tree") return 1;
    return a.name.localeCompare(b.name);
  });

  const parentPath = path.split("/").slice(0, -1).join("/");
  const isRoot = path === "";

  // Helper to encode path segments properly
  const encodeSegments = (p: string) =>
    p
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  const encodedParent = encodeSegments(parentPath);
  const baseTree = `/${owner}/${name}/tree/${encodeURIComponent(currentRef)}`;

  return (
    <div className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-bg-panel)]">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono bg-[var(--color-bg-base)] px-2 py-1 rounded text-[var(--color-text-muted)]">
            {currentRef}
          </span>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="font-medium text-[var(--color-text-primary)]">{path || ""}</span>
        </div>
      </div>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)] text-xs">
            <th className="px-4 py-2 w-12"></th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Message</th>
            <th className="px-4 py-2">Author</th>
            <th className="px-4 py-2 text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {!isRoot && (
            <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-base)] transition-colors">
              <td className="px-4 py-2" colSpan={5}>
                <Link
                  href={
                    encodedParent
                      ? `${baseTree}/${encodedParent}`
                      : `${baseTree}`
                  }
                  className="text-[var(--color-accent)] font-bold block w-full"
                >
                  ..
                </Link>
              </td>
            </tr>
          )}
          {sorted.map((entry) => {
            const entryPath =
              entry.path || (path ? `${path}/${entry.name}` : entry.name);
            const encodedEntryPath = encodeSegments(entryPath);
            const href =
              entry.type === "tree"
                ? `${baseTree}/${encodedEntryPath}`
                : `/${owner}/${name}/blob/${encodeURIComponent(currentRef)}/${encodedEntryPath}`;

            return (
              <FileRow
                key={entry.path || entry.name}
                entry={entry}
                owner={owner}
                repo={name}
                ref={currentRef}
                href={href}
              />
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                Empty directory
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
