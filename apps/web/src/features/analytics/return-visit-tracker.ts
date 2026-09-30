export type ReturnVisitData = {
  days_since_last_visit: number;
  return_count: number;
};

export const SESSION_ACTIVE_KEY = "lasoviet:session_active" as const;
export const LAST_VISIT_KEY = "lasoviet:last_visit_timestamp" as const;
export const RETURN_COUNT_KEY = "lasoviet:return_count" as const;

export function evaluateReturnVisit(
  localStorage?: Storage,
  sessionStorage?: Storage,
  nowMs: number = Date.now(),
): ReturnVisitData | null {
  if (!localStorage || !sessionStorage) {
    return null;
  }

  try {
    const sessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (sessionActive === "true") {
      return null;
    }
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");

    const lastVisitRaw = localStorage.getItem(LAST_VISIT_KEY);
    const returnCountRaw = localStorage.getItem(RETURN_COUNT_KEY);

    if (!lastVisitRaw) {
      localStorage.setItem(LAST_VISIT_KEY, String(nowMs));
      localStorage.setItem(RETURN_COUNT_KEY, "0");
      return null;
    }

    const lastVisitMs = parseInt(lastVisitRaw, 10);
    const prevCount = parseInt(returnCountRaw || "0", 10);
    const validLastVisit = !Number.isNaN(lastVisitMs) && lastVisitMs > 0 ? lastVisitMs : nowMs;
    const validCount = !Number.isNaN(prevCount) && prevCount >= 0 ? prevCount : 0;

    const diffMs = Math.max(0, nowMs - validLastVisit);
    const daysSinceLastVisit = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const nextReturnCount = validCount + 1;

    localStorage.setItem(LAST_VISIT_KEY, String(nowMs));
    localStorage.setItem(RETURN_COUNT_KEY, String(nextReturnCount));

    return {
      days_since_last_visit: daysSinceLastVisit,
      return_count: nextReturnCount,
    };
  } catch {
    return null;
  }
}
