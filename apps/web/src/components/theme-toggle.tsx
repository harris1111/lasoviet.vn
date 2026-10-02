"use client";

import { useSiteTheme } from "../features/theme/use-site-theme";

/** Header light/dark switch (FD-102). CSS shows it only on light-ready pages. */
export function ThemeToggle({ locale }: { locale: "en" | "vi" }) {
  const { effective: theme } = useSiteTheme();
  function toggle() {
    const controller = window.__lsvTheme;
    if (controller) controller.choose(controller.getSnapshot().effective === "light" ? "dark" : "light");
  }

  const vi = locale === "vi";
  const label = theme === "light" ? (vi ? "Chuyển sang giao diện tối" : "Switch to dark theme") : vi ? "Chuyển sang giao diện sáng" : "Switch to light theme";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <span aria-hidden="true" className={theme === "light" ? "theme-icon-moon" : "theme-icon-sun"} />
    </button>
  );
}
