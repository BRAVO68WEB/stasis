"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listBranches, createBranch, deleteBranch } from "@/lib/api";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function BranchesPage() {
  const params = useParams<{ username: string; repo: string }>();
  const username = params.username;
  const repo = params.repo;

  const [branches, setBranches] = useState<
    Array<{ name: string; hash: string; is_head: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create branch form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", commit_hash: "" });

  // Delete confirmation state
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);

  async function fetchBranches() {
    try {
      setLoading(true);
      setError(null);
      const response = await listBranches(username, repo);
      setBranches(response.branches);
    } catch {
      setError("Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranches();
  }, [username, repo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!createForm.name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setCreating(true);
    try {
      await createBranch(username, repo, {
        name: createForm.name.trim(),
        commit_hash: createForm.commit_hash.trim() || "HEAD",
      });
      setSuccess(`Branch "${createForm.name.trim()}" created successfully.`);
      setCreateForm({ name: "", commit_hash: "" });
      setShowCreateForm(false);
      await fetchBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    setDeletingBranch(branchToDelete);
    setError(null);
    setSuccess(null);

    try {
      await deleteBranch(username, repo, branchToDelete);
      setSuccess(`Branch "${branchToDelete}" deleted successfully.`);
      setBranchToDelete(null);
      await fetchBranches();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete branch.",
      );
    } finally {
      setDeletingBranch(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading branches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      {success && <Alert type="success">{success}</Alert>}

      {/* Create Branch */}
      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="border border-base rounded-md bg-panel"
        >
          <div className="px-4 py-3 border-b border-base">
            <h3 className="font-medium text-base">Create new branch</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label
                htmlFor="branch-name"
                className="block text-sm font-medium text-base"
              >
                Branch name <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="branch-name"
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="feature/my-branch"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="commit-hash"
                className="block text-sm font-medium text-base"
              >
                Commit hash{" "}
                <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                id="commit-hash"
                type="text"
                value={createForm.commit_hash}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    commit_hash: e.target.value,
                  }))
                }
                className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Defaults to HEAD"
              />
              <p className="mt-1 text-xs text-muted">
                Leave empty to branch from the current HEAD commit.
              </p>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-base flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm({ name: "", commit_hash: "" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              {creating ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateForm(true)}>
            Create Branch
          </Button>
        </div>
      )}

      {/* Branch List */}
      <div className="border border-base rounded-md overflow-hidden bg-panel">
        <div className="px-4 py-3 border-b border-base">
          <span className="font-semibold text-base">
            Branches ({branches.length})
          </span>
        </div>
        <div className="divide-y divide-[var(--border-base)]">
          {branches.map((b) => (
            <div
              key={b.name}
              className="p-4 flex items-center justify-between hover:bg-base"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-base">{b.name}</span>
                {b.is_head && (
                  <span className="text-xs px-2 py-0.5 rounded border border-base text-muted">
                    default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-muted">
                  {b.hash.substring(0, 7)}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${username}/${repo}/tree/${b.name}`}
                    className="text-xs px-2 py-1 rounded btn"
                  >
                    Browse
                  </Link>
                  <Link
                    href={`/${username}/${repo}/commits/${b.name}`}
                    className="text-xs px-2 py-1 rounded btn"
                  >
                    Commits
                  </Link>
                  {!b.is_head && (
                    <button
                      onClick={() => setBranchToDelete(b.name)}
                      className="text-xs px-2 py-1 rounded text-[var(--color-error)] hover:bg-[var(--color-error-muted)] transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {branches.length === 0 && (
            <div className="p-6 text-center text-muted">
              No branches found in this repository.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        title="Delete Branch?"
      >
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Are you sure you want to delete branch{" "}
          <strong className="font-mono text-[var(--color-text-primary)]">
            &quot;{branchToDelete}&quot;
          </strong>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBranchToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={deletingBranch === branchToDelete}
          >
            {deletingBranch === branchToDelete
              ? "Deleting..."
              : "Delete Branch"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
