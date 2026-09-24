"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { HOMEPAGE_V3_THEME_KEY } from "./homepage-v3-data";

type Theme = "dark" | "light";

/** Scopes the light/dark tokens to the homepage and owns the theme toggle. Dark stays the default. */
export function HomepageV3Shell({ children }: { children: ReactNode }) {
  const t = useTranslations("homepage-v3.theme");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HOMEPAGE_V3_THEME_KEY);
      if (stored === "light" || stored === "dark") queueMicrotask(() => setTheme(stored));
    } catch {
      // Storage can be blocked; the default theme still works.
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      window.localStorage.setItem(HOMEPAGE_V3_THEME_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }

  const label = theme === "light" ? t("toDark") : t("toLight");
  return (
    <div className="hv3" data-theme={theme}>
      {children}
      <button type="button" className="hv3-theme-toggle" onClick={toggle} aria-label={label} title={label}>
        <span aria-hidden="true" className={theme === "light" ? "hv3-moon" : "hv3-sun"} />
      </button>
    </div>
  );
}
