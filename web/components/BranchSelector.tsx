'use client';

import { useRouter, useParams, usePathname } from 'next/navigation';
import { Branch } from '../lib/types';

export default function BranchSelector({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const rawRef = params.ref ? decodeURIComponent(params.ref as string) : '';
  
  // If no ref in URL (repo root page), find the default branch
  const defaultBranch = branches.find(b => b.is_head)?.name || branches[0]?.name || 'main';
  const currentRef = rawRef || defaultBranch;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRef = e.target.value;
    const parts = pathname.split('/');
    const action = parts[3] || 'tree';
    
    // For branches with / in the name, use query params for commits
    // because Next.js route params can't handle / in [ref]
    if (newRef.includes('/') && (action === 'commits' || action === 'compare')) {
      router.push(`/${params.username}/${params.repo}/${action}?ref=${encodeURIComponent(newRef)}`);
      return;
    }
    
    // ['', username, repo, action, ref, ...path]
    if (parts.length >= 5) {
      parts[4] = encodeURIComponent(newRef);
      router.push(parts.join('/'));
    } else {
      // Root repo page - navigate to tree view
      router.push(`/${params.username}/${params.repo}/tree/${encodeURIComponent(newRef)}`);
    }
  };

  return (
    <div className="relative inline-block text-left max-w-[300px]">
      <select 
        value={currentRef}
        onChange={handleChange}
        className="block appearance-none w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] px-3 py-1.5 pr-8 rounded text-sm text-[var(--color-text-primary)] truncate"
        title={currentRef}
      >
        {branches.map((b) => (
          <option key={b.name} value={b.name} className="bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]">
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
