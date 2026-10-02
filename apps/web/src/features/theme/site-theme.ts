export type Theme = 'dark' | 'light';
export type ThemeSnapshot = Readonly<{ preference: Theme; effective: Theme; source: 'saved' | 'session' | 'system'; ready: boolean; revision: number }>;
export type ThemeController = { getSnapshot(): ThemeSnapshot; subscribe(listener: () => void): () => void; choose(theme: Theme): void; refreshCapability(): void };
declare global { interface Window { __lsvTheme?: ThemeController } }

/** Self-contained so the exact tested implementation can also run before paint. */
export function installSiteTheme(win: Window, readyPaths: string[], colors: Record<Theme, string>): ThemeController {
  if (win.__lsvTheme) return win.__lsvTheme;
  const doc = win.document;
  const root = doc.documentElement;
  const key = 'lasoviet:theme';
  const listeners = new Set<() => void>();
  const styles = new Map<Element, HTMLStyleElement>();
  const os = win.matchMedia?.('(prefers-color-scheme: light)');
  const valid = (value: unknown): value is Theme => value === 'light' || value === 'dark';
  let saved: Theme | undefined;
  let session: Theme | undefined;
  try { const value = win.localStorage.getItem(key); if (valid(value)) saved = value; } catch { /* Private browsing may block storage. */ }
  const path = win.location.pathname.replace(/^\/(vi|en)(?=\/|$)/, '').replace(/\/$/, '') || '/';
  let ready = readyPaths.some(pattern => new RegExp('^' + pattern.replace(/\{[^}]+\}|\[[^\]]+\]/g, '[^/]+') + '$').test(path));
  let snapshot: ThemeSnapshot;

  function activateImages() {
    for (const [host, style] of styles) {
      if (!host.isConnected) { style.remove(); styles.delete(host); }
    }
    for (const host of doc.querySelectorAll<HTMLElement>('template[data-theme-style]')) {
      let style = styles.get(host);
      if (!style) { style = doc.createElement('style'); doc.head.appendChild(style); styles.set(host, style); }
      const css = host.getAttribute('data-style-' + snapshot.effective) ?? '';
      if (style.textContent !== css) style.textContent = css;
    }
    for (const img of doc.querySelectorAll<HTMLImageElement>('img[data-theme-image]')) {
      const theme = snapshot.effective;
      if (img.dataset.activeTheme === theme) continue;
      const data = img.getAttribute('data-image-' + theme);
      img.style.visibility = 'hidden';
      img.removeAttribute('src'); img.removeAttribute('srcset');
      const picture = img.closest('picture');
      const source = picture?.querySelector('source');
      source?.removeAttribute('srcset');
      img.dataset.activeTheme = theme;
      if (!data) continue;
      const assets = JSON.parse(data) as { desktop: { src: string; srcSet?: string }; mobile?: { src: string; srcSet?: string } };
      const mobile = assets.mobile;
      if (img.hasAttribute('data-preload')) {
        let link = doc.querySelector<HTMLLinkElement>('link[data-theme-preload]');
        if (!link) { link = doc.createElement('link'); link.rel = 'preload'; link.as = 'image'; link.setAttribute('data-theme-preload', ''); doc.head.appendChild(link); }
        const chosen = mobile && win.matchMedia('(max-width: 879px)').matches ? mobile : assets.desktop;
        link.href = chosen.src; link.imageSrcset = chosen.srcSet ?? ''; link.imageSizes = '100vw'; link.fetchPriority = 'high';
      }
      if (source && mobile) source.setAttribute('srcset', mobile.srcSet ?? mobile.src);
      if (assets.desktop.srcSet) img.srcset = assets.desktop.srcSet;
      const generation = String(Number(img.dataset.imageGeneration ?? 0) + 1);
      img.dataset.imageGeneration = generation;
      img.onload = () => { if (img.dataset.imageGeneration === generation && img.dataset.activeTheme === theme && snapshot.effective === theme) img.style.visibility = ''; };
      img.src = assets.desktop.src;
      if (img.complete && img.naturalWidth) img.style.visibility = '';
    }
  }
  function publish() {
    const preference = saved ?? session ?? (os?.matches ? 'light' : 'dark');
    const source = saved ? 'saved' : session ? 'session' : 'system';
    const effective = ready ? preference : 'dark';
    const changed = !snapshot || snapshot.preference !== preference || snapshot.source !== source || snapshot.ready !== ready || snapshot.effective !== effective;
    if (changed) snapshot = { preference, source, effective, ready, revision: (snapshot?.revision ?? -1) + 1 };
    root.dataset.theme = effective;
    root.style.colorScheme = effective;
    doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', colors[effective]);
    activateImages();
    if (changed) {
      listeners.forEach(listener => listener());
      win.dispatchEvent(new CustomEvent('lasoviet:theme-change', { detail: snapshot }));
    }
  }
  const controller: ThemeController = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    choose(theme) {
      session = theme; saved = undefined;
      try { win.localStorage.setItem(key, theme); saved = theme; session = undefined; } catch { /* Keep the explicit session choice. */ }
      publish();
    },
    refreshCapability() { ready = Boolean(doc.querySelector('[data-light-ready]')); publish(); },
  };
  win.__lsvTheme = controller;
  publish();
  os?.addEventListener('change', publish);
  win.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    saved = valid(event.newValue) ? event.newValue : undefined; session = undefined; publish();
  });
  new (win as Window & typeof globalThis).MutationObserver(() => {
    if (doc.readyState === 'loading' && !doc.querySelector('[data-light-ready]')) { activateImages(); return; }
    controller.refreshCapability();
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-light-ready'] });
  doc.addEventListener('DOMContentLoaded', controller.refreshCapability, { once: true });
  return controller;
}

export const SERVER_THEME: ThemeSnapshot = { preference: 'dark', effective: 'dark', source: 'system', ready: false, revision: 0 };
export function getSiteTheme() { return typeof window === 'undefined' ? SERVER_THEME : window.__lsvTheme?.getSnapshot() ?? SERVER_THEME; }
export function subscribeSiteTheme(listener: () => void) { return window.__lsvTheme?.subscribe(listener) ?? (() => undefined); }
