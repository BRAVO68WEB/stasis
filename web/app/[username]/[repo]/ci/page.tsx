"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  listCIJobs,
  triggerCIJob,
  getCIStatusColor,
  getCIStatusBgColor,
  formatCIDuration,
} from "@/lib/api";
import { CIJob, CIJobListResponse, TriggerCIJobResponse } from "@/lib/types";

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case "failed":
    case "error":
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    case "running":
      return (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      );
    case "pending":
    case "queued":
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6l4 2"
          />
        </svg>
      );
    case "cancelled":
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 9h6v6H9z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      );
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CIJobsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repo = params.repo as string;

  const [jobs, setJobs] = useState<CIJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 20;

  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggerSuccess, setTriggerSuccess] = useState<TriggerCIJobResponse | null>(null);
  const [formData, setFormData] = useState({
    refType: "branch" as "branch" | "tag",
    refName: "",
    commitSha: "",
  });

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        setError(null);
        const response: CIJobListResponse = await listCIJobs(
          username,
          repo,
          limit,
          page * limit,
        );
        setJobs(response.jobs);
        setTotal(response.total);
      } catch (err) {
        console.error("Failed to fetch CI jobs:", err);
        setError(err instanceof Error ? err.message : "Failed to load CI jobs");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [username, repo, page]);

  // Refresh running jobs periodically
  useEffect(() => {
    const hasRunningJobs = jobs.some(
      (job) =>
        job.status === "running" ||
        job.status === "pending" ||
        job.status === "queued",
    );

    if (!hasRunningJobs) return;

    const interval = setInterval(async () => {
      try {
        const response = await listCIJobs(username, repo, limit, page * limit);
        setJobs(response.jobs);
        setTotal(response.total);
      } catch (err) {
        console.error("Failed to refresh jobs:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, username, repo, page]);

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerError(null);
    setTriggerSuccess(null);

    if (!formData.refName.trim()) {
      setTriggerError("Branch or tag name is required");
      return;
    }

    setTriggering(true);
    try {
      const result = await triggerCIJob(username, repo, {
        ref_type: formData.refType,
        ref_name: formData.refName.trim(),
        commit_sha: formData.commitSha.trim() || "HEAD",
      });
      setTriggerSuccess(result);
      setFormData({ refType: "branch", refName: "", commitSha: "" });
      setShowTriggerForm(false);
      const response = await listCIJobs(username, repo, limit, page * limit);
      setJobs(response.jobs);
      setTotal(response.total);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : "Failed to trigger job");
    } finally {
      setTriggering(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <p className="font-medium">Error loading CI jobs</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">CI Jobs</h2>
          <button
            onClick={() => {
              setShowTriggerForm(!showTriggerForm);
              setTriggerError(null);
              setTriggerSuccess(null);
            }}
            className="btn btn-primary"
          >
            Trigger Job
          </button>
        </div>

        {showTriggerForm && (
          <form onSubmit={handleTrigger} className="mb-6 p-4 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-md">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Trigger CI Job</h3>
            {triggerError && (
              <div className="mb-3 alert alert-error text-sm">
                {triggerError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Ref Type
                </label>
                <select
                  value={formData.refType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      refType: e.target.value as "branch" | "tag",
                    }))
                  }
                  className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                >
                  <option value="branch">Branch</option>
                  <option value="tag">Tag</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  {formData.refType === "branch" ? "Branch Name" : "Tag Name"}
                </label>
                <input
                  type="text"
                  value={formData.refName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, refName: e.target.value }))
                  }
                  placeholder={formData.refType === "branch" ? "main" : "v1.0.0"}
                  className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Commit SHA <span className="text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.commitSha}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, commitSha: e.target.value }))
                  }
                  placeholder="HEAD"
                  className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={triggering}
                className="btn btn-primary"
              >
                {triggering ? "Triggering..." : "Trigger"}
              </button>
              <button
                type="button"
                onClick={() => setShowTriggerForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="text-center py-20">
          <svg
            className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-[var(--color-text-primary)]">No CI jobs yet</h3>
          <p className="mt-2 text-[var(--color-text-muted)]">
            CI jobs will appear here when you push to this repository.
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Make sure you have a{" "}
            <code className="bg-[var(--color-bg-panel)] px-1 rounded">.stasis-ci.yaml</code> file in
            your repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">CI Jobs</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-muted)]">{total} total jobs</span>
          <button
            onClick={() => {
              setShowTriggerForm(!showTriggerForm);
              setTriggerError(null);
              setTriggerSuccess(null);
            }}
            className="btn btn-primary"
          >
            Trigger Job
          </button>
        </div>
      </div>

      {triggerSuccess && (
        <div className="mb-4 alert alert-success text-sm">
          Job triggered successfully — ID: <code className="bg-[var(--color-bg-panel)] px-1 rounded">{triggerSuccess.job_id}</code>
        </div>
      )}

      {showTriggerForm && (
        <form onSubmit={handleTrigger} className="mb-6 p-4 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-md">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Trigger CI Job</h3>
          {triggerError && (
            <div className="mb-3 alert alert-error text-sm">
              {triggerError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Ref Type
              </label>
              <select
                value={formData.refType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    refType: e.target.value as "branch" | "tag",
                  }))
                }
                className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
              >
                <option value="branch">Branch</option>
                <option value="tag">Tag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                {formData.refType === "branch" ? "Branch Name" : "Tag Name"}
              </label>
              <input
                type="text"
                value={formData.refName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, refName: e.target.value }))
                }
                placeholder={formData.refType === "branch" ? "main" : "v1.0.0"}
                className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Commit SHA <span className="text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.commitSha}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, commitSha: e.target.value }))
                }
                placeholder="HEAD"
                className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={triggering}
              className="btn btn-primary"
            >
              {triggering ? "Triggering..." : "Trigger"}
            </button>
            <button
              type="button"
              onClick={() => setShowTriggerForm(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-panel)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Commit
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Branch / Tag
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Trigger
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Duration
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                Started
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-panel)]/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/${username}/${repo}/ci/${job.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getCIStatusBgColor(
                        job.status,
                      )} ${getCIStatusColor(job.status)}`}
                    >
                      <StatusIcon status={job.status} />
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-sm font-mono text-[var(--color-accent)]">
                    {job.commit_sha.substring(0, 7)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-sm">
                    {job.ref_type === "tag" ? (
                      <svg
                        className="w-4 h-4 text-[var(--color-text-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-[var(--color-text-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    )}
                    <span className="text-[var(--color-text-primary)]">{job.ref_name}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {job.trigger_type} by{" "}
                    <span className="text-[var(--color-text-primary)]">{job.trigger_actor}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {formatCIDuration(job.duration_seconds)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {job.started_at
                      ? formatRelativeTime(job.started_at)
                      : job.created_at
                        ? formatRelativeTime(job.created_at)
                        : "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
