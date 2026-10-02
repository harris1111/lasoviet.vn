import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression for the 2026-10-02 P0 bug (docs/qa/2026-10-02-homepage-light-theme-handoff.md
 * §3.1): a visitor with a saved `lasoviet:theme=light` preference got a
 * half-converted page on any route that has no light styling — mismatched
 * primitive/V3/chrome colour layers on unconverted dark markup, with no
 * visible way back to dark from that page. The pre-paint bootstrap script in
 * `layout.tsx` is the only thing that can prevent this (it runs before any
 * CSS paints), so this test extracts the real script text from the actual
 * file and evaluates it — not a reimplementation — against a route matrix
 * covering every route confirmed (by inspection) to render without
 * `data-light-ready` today, plus a sample of routes that do have it.
 *
 * If a route's readiness changes, this test's NOT_READY list and the
 * script's own NOT_READY list must be updated together — see the comment
 * above the script in layout.tsx.
 */

function extractBootstrapScript(): string {
  const source = readFileSync(join(__dirname, "layout.tsx"), "utf8");
  const match = source.match(/__html:\n\s*"((?:\\.|[^"\\])*)",/);
  if (!match) {
    throw new Error("Could not find the pre-paint theme bootstrap script in layout.tsx");
  }
  // The source is a JS string literal (already escaped for JSX); un-escape it
  // the same way the browser would receive it as script text.
  return JSON.parse(`"${match[1]}"`);
}

type DatasetTarget = { dataset: { theme?: string } };

function runBootstrap(pathname: string, savedTheme: string | null): string | undefined {
  const script = extractBootstrapScript();
  const root: DatasetTarget = { dataset: {} };
  const store = new Map<string, string>();
  if (savedTheme !== null) store.set("lasoviet:theme", savedTheme);

  const fakeDocument = {
    documentElement: root,
    querySelector: () => null, // nothing is parsed into <body> yet when this head script runs
    addEventListener: () => {
      // DOMContentLoaded sync() is a later-tick safety net, not under test here.
    },
  };
  const fakeWindow = {
    matchMedia: () => ({ matches: false }), // no OS preference in this harness
    MutationObserver: class {
      observe() {
        // no-op: route mutations are not under test here
      }
    },
  };
  const fakeLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
  };

   
  const fn = new Function(
    "document",
    "window",
    "location",
    "localStorage",
    "MutationObserver",
    `${script}\nreturn undefined;`,
  );
  fn(fakeDocument, fakeWindow, { pathname }, fakeLocalStorage, fakeWindow.MutationObserver);
  return root.dataset.theme;
}

describe("homepage layout pre-paint theme bootstrap (hotfix, FD-102/FD-110)", () => {
  const notReadyRoutes = ["/", "/vi", "/en", "/vi/", "/en/", "/admin", "/admin/users", "/en/admin", "/dang-nhap", "/vi/dang-nhap", "/quen-mat-khau", "/dat-lai-mat-khau"];

  it.each(notReadyRoutes)("forces dark on not-ready route %s even with a saved light preference", (pathname) => {
    expect(runBootstrap(pathname, "light")).toBe("dark");
  });

  it.each(notReadyRoutes)("stays dark on not-ready route %s with no saved preference", (pathname) => {
    expect(runBootstrap(pathname, null)).toBe("dark");
  });

  const readyRoutes = ["/tu-vi", "/la-so/abc123", "/vi/la-so/abc123", "/tai-khoan", "/nap-la", "/tao-la-so/tu-vi"];

  it.each(readyRoutes)("applies the saved light preference on ready route %s", (pathname) => {
    expect(runBootstrap(pathname, "light")).toBe("light");
  });

  it("does not false-positive-match a route that merely starts with a blocked segment name", () => {
    // /admin-reports must not be caught by the /admin block.
    expect(runBootstrap("/admin-reports", "light")).toBe("light");
  });

  it("never mutates the saved preference while forcing a not-ready route dark", () => {
    const store = new Map<string, string>([["lasoviet:theme", "light"]]);
    const root: DatasetTarget = { dataset: {} };
    const script = extractBootstrapScript();
    const fakeDocument = { documentElement: root, querySelector: () => null, addEventListener: () => {} };
    const fakeWindow = { matchMedia: () => ({ matches: false }), MutationObserver: class { observe() {} } };
    const fakeLocalStorage = { getItem: (key: string) => store.get(key) ?? null };
     
    const fn = new Function("document", "window", "location", "localStorage", "MutationObserver", `${script}\nreturn undefined;`);
    fn(fakeDocument, fakeWindow, { pathname: "/" }, fakeLocalStorage, fakeWindow.MutationObserver);
    expect(root.dataset.theme).toBe("dark");
    expect(store.get("lasoviet:theme")).toBe("light"); // preference survives for the next ready route
  });

  it("no longer preloads the retired V10 hero image", () => {
    const source = readFileSync(join(__dirname, "layout.tsx"), "utf8");
    expect(source).not.toContain("la-so-tu-vi-tranh-son-hero-");
  });
});
