"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface FileEntry {
  name: string;
  path: string;
  type: string;
}

interface FileSearchProps {
  owner: string;
  repo: string;
  currentRef: string;
  files: FileEntry[];
}

export default function FileSearch({
  owner,
  repo,
  currentRef,
  files,
}: FileSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(query.toLowerCase()) ||
      file.path.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (path: string) => {
    router.push(
      `/${owner}/${repo}/blob/${encodeURIComponent(currentRef)}/${path}`,
    );
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const file = filteredFiles[selectedIndex];
      if (file) {
        handleSelect(file.path);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Search dialog */}
      <div className="relative w-full max-w-lg bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b border-[var(--color-border)] px-4">
          <svg
            className="w-4 h-4 text-[var(--color-text-muted)] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInInput}
            placeholder="Go to file..."
            className="flex-1 px-3 py-3 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
          />
          <kbd className="text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto">
          {filteredFiles.length > 0 ? (
            filteredFiles.slice(0, 20).map((file, index) => (
              <button
                key={file.path}
                data-index={index}
                onClick={() => handleSelect(file.path)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left ${
                  index === selectedIndex
                    ? "bg-[var(--color-bg-hover)]"
                    : "hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                {file.type === "tree" ? (
                  <svg className="w-4 h-4 text-[var(--color-accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
                <span className="text-[var(--color-text-primary)] truncate">
                  {file.name}
                </span>
                <span className="text-[var(--color-text-muted)] text-sm ml-auto truncate">
                  {file.path}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
