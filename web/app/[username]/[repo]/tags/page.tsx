"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listTags, createTag, deleteTag } from "@/lib/api";
import { TagResponse } from "@/lib/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function TagsPage() {
  const params = useParams();
  const username = params.username as string;
  const repo = params.repo as string;

  const [tags, setTags] = useState<TagResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create tag form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    commit_hash: "HEAD",
    message: "",
  });

  // Delete confirmation state
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [deletingTagName, setDeletingTagName] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, [username, repo]);

  async function fetchTags() {
    try {
      setLoading(true);
      setError(null);
      const response = await listTags(username, repo);
      setTags(response.tags);
    } catch {
      setError("Unable to load tags.");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError("Tag name is required.");
      return;
    }

    if (!formData.commit_hash.trim()) {
      setError("Commit hash is required.");
      return;
    }

    setCreating(true);

    try {
      await createTag(username, repo, {
        name: formData.name.trim(),
        commit_hash: formData.commit_hash.trim(),
        message: formData.message.trim() || undefined,
      });
      setSuccess(`Tag "${formData.name.trim()}" created successfully.`);
      setFormData({ name: "", commit_hash: "HEAD", message: "" });
      setShowCreateForm(false);
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    setDeletingTagName(tagToDelete);
    setError(null);
    setSuccess(null);

    try {
      await deleteTag(username, repo, tagToDelete);
      setSuccess(`Tag "${tagToDelete}" deleted successfully.`);
      setTagToDelete(null);
      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag.");
    } finally {
      setDeletingTagName(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-base">
          Tags ({tags.length})
        </h2>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            Create Tag
          </Button>
        )}
      </div>

      {/* Error / Success feedback */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Create Tag Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateTag}
          className="border border-base rounded-md bg-panel"
        >
          <div className="px-4 py-3 border-b border-base">
            <h3 className="font-medium text-base">Create new tag</h3>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label
                htmlFor="tag-name"
                className="block text-sm font-medium text-base"
              >
                Tag Name <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="tag-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="v1.0.0"
              />
              <p className="mt-1 text-xs text-muted">
                The name of the tag (e.g. v1.0.0, release-2024)
              </p>
            </div>

            <div>
              <label
                htmlFor="commit-hash"
                className="block text-sm font-medium text-base"
              >
                Commit Hash <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="commit-hash"
                type="text"
                required
                value={formData.commit_hash}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    commit_hash: e.target.value,
                  }))
                }
                className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono"
                placeholder="HEAD"
              />
              <p className="mt-1 text-xs text-muted">
                A commit SHA, branch name, or &quot;HEAD&quot;. Defaults to the
                latest commit.
              </p>
            </div>

            <div>
              <label
                htmlFor="tag-message"
                className="block text-sm font-medium text-base"
              >
                Message{" "}
                <span className="text-xs text-muted font-normal">
                  (optional, creates an annotated tag)
                </span>
              </label>
              <textarea
                id="tag-message"
                rows={3}
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-y"
                placeholder="Release notes or tag description..."
              />
              <p className="mt-1 text-xs text-muted">
                Adding a message creates an annotated tag instead of a
                lightweight tag.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-base flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ name: "", commit_hash: "HEAD", message: "" });
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              {creating ? "Creating..." : "Create Tag"}
            </Button>
          </div>
        </form>
      )}

      {/* Tags List */}
      <div className="border border-base rounded-md overflow-hidden bg-panel">
        <div className="divide-y divide-[var(--border-base)]">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="p-4 flex items-center justify-between hover:bg-base"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-base font-semibold">
                    {tag.name}
                  </span>
                  {tag.is_annotated && (
                    <span className="text-xs px-2 py-0.5 rounded border border-base text-muted">
                      annotated
                    </span>
                  )}
                </div>
                {tag.message && (
                  <p className="text-sm text-muted line-clamp-1">
                    {tag.message}
                  </p>
                )}
                {tag.tagger && (
                  <p className="text-xs text-muted">{tag.tagger}</p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="font-mono text-xs text-muted">
                  {tag.hash.substring(0, 7)}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${username}/${repo}/tree/${tag.name}`}
                    className="text-xs px-2 py-1 rounded btn"
                  >
                    Browse
                  </Link>
                  <Link
                    href={`/${username}/${repo}/commit/${tag.hash}`}
                    className="text-xs px-2 py-1 rounded btn"
                  >
                    View Commit
                  </Link>
                  <button
                    onClick={() => setTagToDelete(tag.name)}
                    className="text-xs px-2 py-1 rounded text-[var(--color-error)] hover:bg-[var(--color-error-muted)] transition-colors"
                    title={`Delete tag ${tag.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="p-6 text-center text-muted">
              No tags found in this repository.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        title="Delete Tag?"
      >
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Are you sure you want to delete tag{" "}
          <strong className="text-[var(--color-text-primary)] font-mono">{tagToDelete}</strong>?
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setTagToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteTag}
            loading={deletingTagName === tagToDelete}
          >
            {deletingTagName === tagToDelete
              ? "Deleting..."
              : "Delete Tag"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
