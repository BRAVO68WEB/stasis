"use client";

import { DayActivity } from "@/lib/types";

interface CommitGraphProps {
  days: DayActivity[];
  total: number;
  year: number;
  onYearChange?: (year: number) => void;
}

const levelColors: Record<number, string> = {
  0: "bg-[var(--color-bg-base)]",
  1: "bg-emerald-900",
  2: "bg-emerald-700",
  3: "bg-emerald-500",
  4: "bg-emerald-400",
};

export default function CommitGraph({ days, total, year, onYearChange }: CommitGraphProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const weeks: DayActivity[][] = [];
  let currentWeek: DayActivity[] = [];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayOfWeek = new Date(day.date).getDay();

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const months: { name: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        const monthName = new Date(firstDay.date).toLocaleString("default", { month: "short" });
        months.push({ name: monthName, weekIndex: i });
        lastMonth = month;
      }
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-panel)]">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-medium text-[var(--color-text-primary)]">
          {total} contributions in {year}
        </h3>
        {onYearChange && (
          <select
            value={year}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="text-sm bg-[var(--color-bg-base)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex ml-8 mb-1">
          {months.map((m) => (
            <div
              key={m.name + m.weekIndex}
              className="text-xs text-[var(--color-text-muted)]"
              style={{ width: `${(m.weekIndex === months[months.length - 1]?.weekIndex ? weeks.length - m.weekIndex : (months[months.indexOf(m) + 1]?.weekIndex || weeks.length) - m.weekIndex) * 14}px` }}
            >
              {m.name}
            </div>
          ))}
        </div>

        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] mr-1 text-[10px] text-[var(--color-text-muted)]">
            <span className="h-[13px] leading-[13px]" />
            <span className="h-[13px] leading-[13px]">Mon</span>
            <span className="h-[13px] leading-[13px]" />
            <span className="h-[13px] leading-[13px]">Wed</span>
            <span className="h-[13px] leading-[13px]" />
            <span className="h-[13px] leading-[13px]">Fri</span>
            <span className="h-[13px] leading-[13px]" />
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {wi === 0 && week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`pad-${i}`} className="w-[13px] h-[13px]" />
              ))}
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`w-[13px] h-[13px] rounded-sm ${levelColors[day.level as keyof typeof levelColors]} cursor-pointer transition-colors hover:ring-1 hover:ring-[var(--color-text-muted)]`}
                  title={`${day.count} contribution${day.count !== 1 ? 's' : ''} on ${formatDate(day.date)}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-[var(--color-text-muted)]">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`w-[13px] h-[13px] rounded-sm ${levelColors[level]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
