"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listTokens,
  createToken,
  deleteToken,
  isAuthenticated,
} from "@/lib/api";
import { TokenInfo } from "@/lib/types";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";

const AVAILABLE_SCOPES = [
  {
    value: "repo:read",
    label: "Read repositories",
    description: "Access to read public and private repositories",
  },
  {
    value: "repo:write",
    label: "Write repositories",
    description: "Push commits and create branches",
  },
  {
    value: "repo:admin",
    label: "Admin repositories",
    description: "Full admin access to repositories",
  },
];

export default function TokensPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add token form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingToken, setAddingToken] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as string[],
    expiresIn: "90", // days, empty means no expiration
  });

  // Newly created token (shown only once)
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation state
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<TokenInfo | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/register");
      return;
    }
    fetchTokens();
  }, [router]);

  async function fetchTokens() {
    try {
      setLoading(true);
      setError(null);
      const response = await listTokens();
      setTokens(response.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }

  const handleScopeToggle = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError("Token name is required");
      return;
    }

    setAddingToken(true);

    try {
      const expiresIn = formData.expiresIn
        ? parseInt(formData.expiresIn)
        : undefined;

      const response = await createToken({
        name: formData.name.trim(),
        scopes: formData.scopes.length > 0 ? formData.scopes : undefined,
        expires_in: expiresIn,
      });

      setNewToken(response.token);
      setFormData({ name: "", scopes: [], expiresIn: "90" });
      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setAddingToken(false);
    }
  };

  const handleCopyToken = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseNewToken = () => {
    setNewToken(null);
    setShowAddForm(false);
    setSuccess("Token created successfully");
  };

  const handleDeleteToken = async () => {
    if (!tokenToDelete) return;

    setDeletingTokenId(tokenToDelete.id);
    setError(null);
    setSuccess(null);

    try {
      await deleteToken(tokenToDelete.id);
      setSuccess("Token deleted successfully");
      setTokenToDelete(null);
      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete token");
    } finally {
      setDeletingTokenId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-muted)]">
          Loading access tokens...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Personal Access Tokens
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Personal access tokens can be used to authenticate with the API or
            Git over HTTP.
          </p>
        </div>
        {!showAddForm && !newToken && (
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            Generate New Token
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {success && <Alert type="success">{success}</Alert>}

      {/* New Token Display (shown only once after creation) */}
      {newToken && (
        <Alert type="warning">
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Make sure to copy your token now!
            </h3>
            <p className="text-sm">
              This is the only time you will be able to see this token. Store it
              somewhere safe.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 font-mono text-sm break-all">
                {newToken}
              </code>
              <Button
                variant="secondary"
                onClick={handleCopyToken}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleCloseNewToken}
            >
              I&apos;ve copied my token
            </Button>
          </div>
        </Alert>
      )}

      {/* Add Token Form */}
      {showAddForm && !newToken && (
        <form
          onSubmit={handleAddToken}
          className="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]"
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-medium text-[var(--color-text-primary)]">
              Generate new token
            </h3>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[var(--color-text-primary)]"
              >
                Token Name{" "}
                <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                placeholder="My API Token"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                A descriptive name to identify this token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Expiration
              </label>
              <select
                value={formData.expiresIn}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiresIn: e.target.value,
                  }))
                }
                className="block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="">No expiration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Scopes (optional)
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Select the permissions for this token. If no scopes are selected,
                the token will have full access.
              </p>
              <div className="space-y-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex items-start gap-3 p-3 border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-base)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.value)}
                      onChange={() => handleScopeToggle(scope.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {scope.label}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setFormData({ name: "", scopes: [], expiresIn: "90" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={addingToken}>
              {addingToken ? "Generating..." : "Generate Token"}
            </Button>
          </div>
        </form>
      )}

      {/* Tokens List */}
      <div className="border border-[var(--color-border)] rounded-[var(--radius-md)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Your Tokens ({tokens.length})
          </h3>
        </div>

        {tokens.length === 0 ? (
          <div className="p-8 text-center">
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
              className="mx-auto text-[var(--color-text-muted)] mb-4"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-[var(--color-text-muted)]">
              No access tokens created yet.
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Generate a token to access the API or clone repositories over
              HTTP.
            </p>
            {!showAddForm && (
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowAddForm(true)}
              >
                Generate your first token
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {tokens.map((token) => (
              <li
                key={token.id}
                className="p-4 flex items-start justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                      className="text-[var(--color-accent)] shrink-0"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        ry="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {token.name}
                    </span>
                    {token.expires_at && isExpired(token.expires_at) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)]">
                        Expired
                      </span>
                    )}
                  </div>

                  {token.scopes && token.scopes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {token.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                    <span>Created {formatDate(token.created_at)}</span>
                    {token.expires_at && (
                      <span>
                        {isExpired(token.expires_at) ? "Expired" : "Expires"}{" "}
                        {formatDate(token.expires_at)}
                      </span>
                    )}
                    {token.last_used && (
                      <span>Last used {formatDate(token.last_used)}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTokenToDelete(token)}
                  className="ml-4 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                  title="Delete token"
                >
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Using Personal Access Tokens
          </h3>
        </div>
        <div className="p-4 text-sm text-[var(--color-text-muted)] space-y-3">
          <p>
            Personal access tokens can be used instead of passwords for Git over
            HTTP or API access.
          </p>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-1">
              Git clone with token:
            </p>
            <code className="block bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-[var(--color-accent)] font-mono text-xs overflow-x-auto">
              git clone
              https://username:YOUR_TOKEN@example.com/username/repo.git
            </code>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-1">
              API request with token:
            </p>
            <code className="block bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-[var(--color-accent)] font-mono text-xs overflow-x-auto">
              curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot;
              https://example.com/api/v1/repos
            </code>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!tokenToDelete}
        onClose={() => setTokenToDelete(null)}
        title="Delete Access Token?"
      >
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Are you sure you want to delete the token{" "}
          <strong>&quot;{tokenToDelete?.name}&quot;</strong>? Any applications
          using this token will no longer be able to access your account.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setTokenToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deletingTokenId === tokenToDelete?.id}
            onClick={handleDeleteToken}
          >
            {deletingTokenId === tokenToDelete?.id
              ? "Deleting..."
              : "Delete Token"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
