"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

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

export function AnalyticsCollector(): null {
  const pathname = usePathname();
  const lastTrackedPathnameRef = useRef<string | null>(null);

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
