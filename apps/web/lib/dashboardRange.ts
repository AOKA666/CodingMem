const MAX_RANGE_DAYS = 31;

type DashboardRangeInput = {
  start?: string;
  end?: string;
  date?: string;
};

export function normalizeDashboardRange(input: DashboardRangeInput, today: string) {
  const safeToday = isIsoDate(today) ? today : new Date().toISOString().slice(0, 10);
  const requestedEnd = isIsoDate(input.end) ? input.end : safeToday;
  const endDate = requestedEnd > safeToday ? safeToday : requestedEnd;
  const earliestStart = minimumDashboardStart(endDate);
  const defaultStart = shiftIsoDate(endDate, -29);
  const requestedStart = isIsoDate(input.start) && input.start <= endDate ? input.start : defaultStart;
  const startDate = requestedStart < earliestStart ? earliestStart : requestedStart;

  return { startDate, endDate };
}

export function minimumDashboardStart(endDate: string) {
  return shiftIsoDate(endDate, -(MAX_RANGE_DAYS - 1));
}

export function rangeToIsoTimestamps(startDate: string, endDate: string) {
  return {
    start: `${startDate}T00:00:00.000Z`,
    end: `${shiftIsoDate(endDate, 1)}T00:00:00.000Z`
  };
}

function shiftIsoDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}
