"use client";

import { DayActivity } from "@/lib/types";

interface ActivityLogProps {
  days: DayActivity[];
}

export default function ActivityLog({ days }: ActivityLogProps) {
  const recentActivity = days
    .filter((d) => d.count > 0)
    .slice(-30)
    .reverse();

  if (recentActivity.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-panel)] p-4">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-4">
          Recent Activity
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm">
          No recent commits.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-panel)] p-4">
      <h3 className="font-medium text-[var(--color-text-primary)] mb-4">
        Recent Activity
      </h3>
      <div className="space-y-2">
        {recentActivity.map((day) => (
          <div key={day.date} className="flex items-center gap-3 text-sm">
            <span className="text-[var(--color-text-muted)] w-20">
              {new Date(day.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="flex-1 h-2 bg-[var(--color-bg-base)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full"
                style={{
                  width: `${Math.min((day.count / 20) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-[var(--color-text-primary)] w-12 text-right">
              {day.count} {day.count === 1 ? "commit" : "commits"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
