"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";
import { evaluateReturnVisit, type ReturnVisitData } from "./return-visit-tracker";

export async function sendLandingEvent(
  pathname: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await sendBrowserAnalyticsEvent(
    "landing",
    {
      landing_page: pathname,
    },
    { fetchImpl },
  );
}

export async function sendReturnVisitEvent(
  data: ReturnVisitData,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await sendBrowserAnalyticsEvent(
    "return_visit",
    {
      days_since_last_visit: data.days_since_last_visit,
      return_count: data.return_count,
    },
    { fetchImpl },
  );
}

export function AnalyticsCollector(): null {
  const pathname = usePathname();
  const lastTrackedPathnameRef = useRef<string | null>(null);
  const returnVisitCheckedRef = useRef<boolean>(false);

  useEffect(() => {
    if (returnVisitCheckedRef.current) {
      return;
    }
    returnVisitCheckedRef.current = true;

    try {
      const local = typeof window !== "undefined" ? window.localStorage : undefined;
      const session = typeof window !== "undefined" ? window.sessionStorage : undefined;
      const returnData = evaluateReturnVisit(local, session);
      if (returnData) {
        void sendReturnVisitEvent(returnData);
      }
    } catch {
      // Analytics must never throw
    }
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // Prevent duplicate emission for the same pathname from React Strict Mode within the mounted instance
    if (lastTrackedPathnameRef.current === pathname) {
      return;
    }

    lastTrackedPathnameRef.current = pathname;
    void sendLandingEvent(pathname);
  }, [pathname]);

  return null;
}
