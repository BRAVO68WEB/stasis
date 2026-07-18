"use client";

import { useState } from "react";
import CommitGraph from "@/components/CommitGraph";
import { DayActivity } from "@/lib/types";

interface CommitGraphWrapperProps {
  initialDays: DayActivity[];
  initialTotal: number;
  initialYear: number;
  owner: string;
  repos: Array<{ owner: string; name: string }>;
}

export default function CommitGraphWrapper({
  initialDays,
  initialTotal,
  initialYear,
  owner,
  repos,
}: CommitGraphWrapperProps) {
  const [days, setDays] = useState(initialDays);
  const [total, setTotal] = useState(initialTotal);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);

  const handleYearChange = async (newYear: number) => {
    setLoading(true);
    setYear(newYear);

    try {
      // Fetch activity for all repos for the new year
      const results = await Promise.all(
        repos.map((repo) =>
          fetch(`/api/v1/repos/${repo.owner}/${repo.name}/activity?year=${newYear}`)
            .then((res) => res.json())
            .catch(() => null)
        )
      );

      // Aggregate activity by date
      const aggregated: Record<string, { count: number; level: number }> = {};
      let totalCount = 0;

      for (const result of results) {
        if (result?.days) {
          for (const day of result.days) {
            if (!aggregated[day.date]) {
              aggregated[day.date] = { count: 0, level: 0 };
            }
            aggregated[day.date].count += day.count;
            totalCount += day.count;
          }
        }
      }

      // Calculate levels
      for (const date in aggregated) {
        const count = aggregated[date].count;
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 5) level = 3;
        if (count > 10) level = 4;
        aggregated[date].level = level;
      }

      // Convert to array sorted by date
      const sortedDays = Object.entries(aggregated)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          count: data.count,
          level: data.level,
        }));

      setDays(sortedDays);
      setTotal(totalCount);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={loading ? "opacity-50 pointer-events-none" : ""}>
      <CommitGraph
        days={days}
        total={total}
        year={year}
        onYearChange={handleYearChange}
      />
    </div>
  );
}
