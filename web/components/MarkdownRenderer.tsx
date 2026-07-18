"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code
                  className="bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--color-accent)]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`${className} block bg-[var(--color-bg-base)] p-4 rounded-md overflow-x-auto text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ children, ...props }) {
            return (
              <a
                className="text-[var(--color-accent)] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ children, ...props }) {
            return (
              <h1
                className="text-2xl font-bold mb-4 pb-2 border-b border-[var(--color-border)]"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2
                className="text-xl font-semibold mb-3 pb-2 border-b border-[var(--color-border)]"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-lg font-semibold mb-2" {...props}>
                {children}
              </h3>
            );
          },
          img({ ...props }) {
            return <img className="max-w-full rounded-md" {...props} />;
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto">
                <table className="border-collapse w-full" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                className="border border-[var(--color-border)] px-3 py-2 bg-[var(--color-bg-base)] text-left font-semibold"
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td
                className="border border-[var(--color-border)] px-3 py-2"
                {...props}
              >
                {children}
              </td>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-[var(--color-accent)] pl-4 text-[var(--color-text-secondary)] italic"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          hr({ ...props }) {
            return (
              <hr className="border-[var(--color-border)] my-6" {...props} />
            );
          },
          ul({ children, ...props }) {
            return (
              <ul className="list-disc pl-6 mb-4" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal pl-6 mb-4" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }) {
            return (
              <li className="mb-1" {...props}>
                {children}
              </li>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
