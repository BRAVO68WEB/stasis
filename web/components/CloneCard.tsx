'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';

export default function CloneCard({ httpUrl, sshUrl }: { httpUrl: string; sshUrl: string }) {
  const [method, setMethod] = useState<'http' | 'ssh'>('http');
  const [copied, setCopied] = useState(false);

  const url = method === 'http' ? httpUrl : sshUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trigger = (
    <Button variant="primary" size="sm">
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
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
      Clone
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
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </Button>
  );

  return (
    <Dropdown trigger={trigger} align="right">
      <div className="w-80 p-[var(--space-4)]">
        <div className="flex items-center justify-between mb-[var(--space-3)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Clone this repository</h3>
        </div>

        <div className="flex border-b border-[var(--color-border)] mb-[var(--space-3)]">
          <button
            onClick={() => setMethod('http')}
            className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium border-b-2 transition-colors ${
              method === 'http'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            HTTP
          </button>
          <button
            onClick={() => setMethod('ssh')}
            className={`px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium border-b-2 transition-colors ${
              method === 'ssh'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            SSH
          </button>
        </div>

        <div className="flex">
          <input
            type="text"
            readOnly
            value={url}
            aria-label="Repository URL"
            className="flex-1 p-[var(--space-2)] border border-[var(--color-border)] rounded-l-[var(--radius-md)] bg-[var(--color-bg-base)] text-sm font-mono text-[var(--color-text-muted)] focus:outline-none"
          />
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            className="px-[var(--space-3)] py-[var(--space-2)] bg-[var(--color-bg-base)] border border-l-0 border-[var(--color-border)] rounded-r-[var(--radius-md)] hover:opacity-80 text-[var(--color-text-primary)] transition-colors"
          >
            {copied ? (
              <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
