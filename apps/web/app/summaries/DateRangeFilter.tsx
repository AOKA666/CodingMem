"use client";

import { useState } from "react";
import { minimumDashboardStart } from "@/lib/dashboardRange";

type DateRangeFilterProps = {
  startDate: string;
  endDate: string;
  today: string;
};

export function DateRangeFilter({ startDate, endDate, today }: DateRangeFilterProps) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const minimumStart = minimumDashboardStart(end);

  function updateEnd(nextEnd: string) {
    setEnd(nextEnd);
    const nextMinimum = minimumDashboardStart(nextEnd);
    if (start < nextMinimum || start > nextEnd) setStart(nextMinimum);
  }

  return (
    <form className="date-filter" action="/summaries">
      <span className="date-filter-icon">D</span>
      <label>
        <span>开始</span>
        <input
          name="start"
          type="date"
          value={start}
          min={minimumStart}
          max={end}
          onChange={(event) => setStart(event.target.value)}
          aria-label="开始日期"
        />
      </label>
      <span className="date-range-separator">至</span>
      <label>
        <span>结束 · 最多31天</span>
        <input
          name="end"
          type="date"
          value={end}
          max={today}
          onChange={(event) => updateEnd(event.target.value)}
          aria-label="结束日期"
        />
      </label>
      <button className="button" type="submit">筛选</button>
    </form>
  );
}
