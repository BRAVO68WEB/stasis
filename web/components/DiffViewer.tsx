"use client";

export function DiffViewer({ patch }: { patch: string }) {
  const lines = patch.split("\n");

  const cls = (line: string) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return "bg-[var(--color-success-muted)] text-[var(--color-success)]";
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      return "bg-[var(--color-error-muted)] text-[var(--color-error)]";
    }
    if (line.startsWith("@@")) {
      return "bg-[var(--color-accent-muted)] text-[var(--color-accent)]";
    }
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ")
    ) {
      return "text-[var(--color-text-muted)]";
    }
    return "text-[var(--color-text-primary)]";
  };

  return (
    <div className="overflow-x-auto text-xs font-mono leading-6 bg-[var(--color-bg-panel)] whitespace-pre">
      {lines.map((line, i) => (
        <div key={i} className={`px-4 py-0.5 ${cls(line)}`}>{line}</div>
      ))}
    </div>
  );
}

