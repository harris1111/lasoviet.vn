"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "lasoviet:theme";
type Theme = "dark" | "light";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Header light/dark switch (FD-102). CSS shows it only on light-ready pages. */
export function ThemeToggle({ locale }: { locale: "en" | "vi" }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    queueMicrotask(() => setTheme(readTheme()));
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked; the theme still changes for this visit.
    }
  }

  const vi = locale === "vi";
  const label = theme === "light" ? (vi ? "Chuyển sang giao diện tối" : "Switch to dark theme") : vi ? "Chuyển sang giao diện sáng" : "Switch to light theme";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <span aria-hidden="true" className={theme === "light" ? "theme-icon-moon" : "theme-icon-sun"} />
    </button>
  );
}
