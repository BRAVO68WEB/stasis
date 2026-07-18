"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateUsername,
  updateProfile,
  getUserProfile,
  getUserInfo,
  setUserInfo,
  isAuthenticated,
  getLinkedEmails,
  updateLinkedEmails,
  getSocialLinks,
  updateSocialLinks,
} from "@/lib/api";
import type { SocialLink } from "@/lib/types";
import { getSocialPlatform, isMastodonUsername, mastodonToUrl } from "@/lib/social-icons";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function GeneralSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [linkedEmails, setLinkedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/auth/login");
      return;
    }

    const user = getUserInfo();
    if (user) {
      setUsername(user.username);
      setOriginalUsername(user.username);
      getUserProfile(user.username)
        .then((profile) => {
          setDisplayName(profile.display_name || "");
          setBio(profile.bio || "");
          setCompany(profile.company || "");
          setLocation(profile.location || "");
          setWebsite(profile.website || "");
          setAvatarUrl(profile.avatar_url || "");
        })
        .catch(() => {});
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated()) {
      getLinkedEmails()
        .then((res) => setLinkedEmails(res.emails))
        .catch(() => {});
      getSocialLinks()
        .then((res) => setSocialLinks(res.links))
        .catch(() => {});
    }
  }, []);

  const handleAddEmail = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (linkedEmails.includes(newEmail)) {
      setError("Email already linked");
      return;
    }
    try {
      const updated = [...linkedEmails, newEmail];
      await updateLinkedEmails(updated);
      setLinkedEmails(updated);
      setNewEmail("");
      setSuccess("Email added successfully");
    } catch {
      setError("Failed to add email");
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      const updated = linkedEmails.filter((e) => e !== email);
      await updateLinkedEmails(updated);
      setLinkedEmails(updated);
      setSuccess("Email removed successfully");
    } catch {
      setError("Failed to remove email");
    }
  };

  const handleAddSocialLink = async () => {
    if (!newLinkUrl) {
      setError("Please enter a URL or Mastodon username");
      return;
    }
    const isMastodon = isMastodonUsername(newLinkUrl);
    if (!isMastodon) {
      try {
        new URL(newLinkUrl);
      } catch {
        setError("Please enter a valid URL or Mastodon username (@user@instance)");
        return;
      }
    }
    if (socialLinks.length >= 4) {
      setError("Maximum 4 social links allowed");
      return;
    }
    const storedValue = isMastodon ? newLinkUrl : newLinkUrl;
    const name = newLinkName.trim() || getSocialPlatform(newLinkUrl).name;
    const updated = [...socialLinks, { url: storedValue, name }];
    try {
      await updateSocialLinks(updated);
      setSocialLinks(updated);
      setNewLinkUrl("");
      setNewLinkName("");
      setSuccess("Social link added successfully");
    } catch {
      setError("Failed to add social link");
    }
  };

  const handleRemoveSocialLink = async (url: string) => {
    try {
      const updated = socialLinks.filter((l) => l.url !== url);
      await updateSocialLinks(updated);
      setSocialLinks(updated);
      setSuccess("Social link removed successfully");
    } catch {
      setError("Failed to remove social link");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (website && !/^https?:\/\/.+/.test(website)) {
        throw new Error("Website must be a valid URL starting with http:// or https://");
      }

      // Only update username if it changed
      if (username !== originalUsername) {
        const usernameResponse = await updateUsername(username);
        setUserInfo(usernameResponse.user);
      }

      await updateProfile({
        display_name: displayName || undefined,
        bio: bio || undefined,
        company: company || undefined,
        location: location || undefined,
        website: website || undefined,
        avatar_url: avatarUrl || undefined,
      });

      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            General Settings
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage your account details.
          </p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {success && <Alert type="success">{success}</Alert>}

      <form
        onSubmit={handleSubmit}
        className="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]"
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Profile
          </h3>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="username"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Your unique username on the platform.
            </p>
          </div>

          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Display Name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="Your display name"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-y"
              placeholder="A short bio about yourself"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)] text-right">
              {bio.length}/500
            </p>
          </div>

          <div>
            <label
              htmlFor="company"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="Your company"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="Your location"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="https://example.com"
              maxLength={255}
            />
          </div>

          <div>
            <label
              htmlFor="avatar_url"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Avatar URL
            </label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="https://example.com/avatar.png"
              maxLength={500}
            />
          </div>
        </div>

        <div className="px-4 py-3 bg-[var(--color-bg-base)]/50 border-t border-[var(--color-border)] flex justify-end">
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Linked Commit Emails
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Link email addresses used in git commits to your profile. When a
            commit author email matches, your profile will be linked.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {linkedEmails.length > 0 && (
            <div className="space-y-2">
              {linkedEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-base)] rounded-[var(--radius-md)]"
                >
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {email}
                  </span>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="text-[var(--color-error)] hover:opacity-80 text-sm"
                    aria-label={`Remove ${email}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="git@example.com"
              className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              maxLength={255}
            />
            <Button
              variant="secondary"
              onClick={handleAddEmail}
              disabled={!newEmail}
            >
              Add Email
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-panel)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            Social Links
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Add links to your social profiles. Maximum 4 links.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {socialLinks.length > 0 && (
            <div className="space-y-2">
              {socialLinks.map((link) => {
                const platform = getSocialPlatform(link.url);
                return (
                  <div
                    key={link.url}
                    className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-base)] rounded-[var(--radius-md)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0" style={{ color: platform.color }}>
                        {platform.icon}
                      </span>
                      <span className="text-sm text-[var(--color-text-primary)] truncate">
                        {link.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveSocialLink(link.url)}
                      className="text-[var(--color-error)] hover:opacity-80 text-sm shrink-0 ml-2"
                      aria-label={`Remove ${link.name}`}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://github.com/username or @user@instance"
                className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                maxLength={500}
              />
              <input
                type="text"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                placeholder="Display name (auto-detected)"
                className="w-48 px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                maxLength={100}
              />
              <Button
                variant="secondary"
                onClick={handleAddSocialLink}
                disabled={!newLinkUrl || socialLinks.length >= 4}
              >
                Add Link
              </Button>
            </div>
            {socialLinks.length >= 4 && (
              <p className="text-xs text-[var(--color-warning)]">
                Maximum of 4 social links reached.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
