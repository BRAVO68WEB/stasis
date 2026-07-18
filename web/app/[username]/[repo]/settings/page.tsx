"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getRepository,
  updateRepository,
  deleteRepository,
  getRepositoryStats,
} from "@/lib/api";
import { RepoResponse, RepoStats } from "@/lib/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function RepositorySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const repo = params.repo as string;

  const [repoData, setRepoData] = useState<RepoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    is_private: false,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [repoResponse] = await Promise.all([
          getRepository(username, repo),
        ]);

        setRepoData(repoResponse);
        setFormData({
          description: repoResponse.description || "",
          is_private: repoResponse.is_private,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load repository",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username, repo]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updated = await updateRepository(username, repo, {
        description: formData.description || undefined,
        is_private: formData.is_private,
      });

      setRepoData(updated);
      setSuccess("Repository settings updated successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update repository",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== repo) {
      setError("Please type the repository name to confirm deletion");
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await deleteRepository(username, repo);
      router.push(`/${username}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete repository",
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading settings...</div>
      </div>
    );
  }

  if (!repoData) {
    return (
      <div className="p-6 text-sm border border-base rounded-md bg-panel">
        Repository not found or you don&apos;t have permission to access
        settings.
        <div className="mt-2">
          <Link
            href={`/${username}/${repo}`}
            className="text-accent hover:underline"
          >
            Back to repository
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <Alert type="error">{error}</Alert>}

      {success && <Alert type="success">{success}</Alert>}

      {/* General Settings Form */}
      <form onSubmit={handleSave} className="border border-base rounded-md">
        <div className="px-4 py-3 border-b border-base bg-panel">
          <h3 className="font-medium text-base">General</h3>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-base"
            >
              Repository name
            </label>
            <input
              id="name"
              type="text"
              disabled
              value={repoData.name}
              className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-base text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">
              Repository names cannot be changed.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-base"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-base rounded-md shadow-sm bg-panel text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              placeholder="A short description of your repository"
              maxLength={500}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="is_private"
              name="is_private"
              type="checkbox"
              checked={formData.is_private}
              onChange={handleChange}
              className="mt-1 h-4 w-4 text-accent border-base rounded focus:ring-accent"
            />
            <div>
              <label
                htmlFor="is_private"
                className="block text-sm font-medium text-base cursor-pointer"
              >
                Private repository
              </label>
              <p className="text-xs text-muted mt-1">
                Only you and collaborators you explicitly add will be able to
                see this repository.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-base bg-panel">
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-[var(--color-error)] rounded-md">
        <div className="px-4 py-3 border-b border-[var(--color-error)] bg-[var(--color-error-muted)]">
          <h3 className="font-medium text-[var(--color-error)]">
            Danger Zone
          </h3>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-base">Delete this repository</h4>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Once you delete a repository, there is no going back. Please be
                certain.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete this repository
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmName("");
        }}
        title="Are you absolutely sure?"
      >
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          This action <strong>cannot</strong> be undone. This will
          permanently delete the{" "}
          <strong>
            {username}/{repo}
          </strong>{" "}
          repository, including all branches, tags, and commits.
        </p>

        <div className="mb-4">
          <label
            htmlFor="confirmName"
            className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
          >
            Please type <strong>{repo}</strong> to confirm.
          </label>
          <input
            id="confirmName"
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            className="block w-full px-3 py-2 border border-[var(--color-border)] rounded-md shadow-sm bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:border-transparent"
            placeholder={repo}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmName("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            disabled={deleteConfirmName !== repo}
          >
            {deleting
              ? "Deleting..."
              : "I understand, delete this repository"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
