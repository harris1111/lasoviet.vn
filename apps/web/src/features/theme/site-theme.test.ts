import { describe, expect, it, vi } from 'vitest';
import { installSiteTheme } from './site-theme';

function browser(saved: string | null = null, blocked = false, hero?: Record<'dark' | 'light', { desktop: {src: string; srcSet?: string}; mobile?: {src: string; srcSet?: string} }>, pathname = '/en/') {
  const store = new Map(saved ? [['lasoviet:theme', saved]] : []);
  let ready = true;
  const os = Object.assign(new EventTarget(), { matches: true });
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  const images: unknown[] = [];
  const templates: unknown[] = [];
  let preload: Record<string, unknown> | null = null;
  const doc = Object.assign(new EventTarget(), {
    documentElement: root, readyState: 'loading',
    head: { appendChild(value: Record<string, unknown>) { preload = value; } },
    createElement: () => ({ setAttribute() {} }),
    querySelector: (selector: string): unknown => selector === 'link[data-theme-preload]' ? preload : selector === '[data-light-ready]' && ready ? {} : null,
    querySelectorAll: (selector: string) => selector.startsWith('img') ? images : templates,
  });
  const win = Object.assign(new EventTarget(), {
    document: doc, location: { pathname }, matchMedia: () => os,
    localStorage: { getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { if (blocked) throw Error('blocked'); store.set(key, value); } },
    MutationObserver: class { observe() {} }, CustomEvent,
  });
  const controller = installSiteTheme(win as unknown as Window, ['/'], { dark: '#080706', light: '#f7f1e5' }, hero);
  return { get preload() { return preload; }, win, root, os, store, controller, images, templates, capability(value: boolean) { ready = value; controller.refreshCapability(); } };
}

describe('site theme ownership', () => {
  it('forces unready pages dark without losing a saved light preference', () => {
    const b = browser('light');
    b.capability(false);
    expect(b.controller.getSnapshot()).toMatchObject({ effective: 'dark', preference: 'light', source: 'saved' });
    expect(b.store.get('lasoviet:theme')).toBe('light');
    b.capability(true);
    expect(b.root.dataset.theme).toBe('light');
  });
  it('retains a session choice when storage fails, despite OS updates', () => {
    const b = browser(null, true);
    b.controller.choose('dark'); b.os.matches = true; b.os.dispatchEvent(new Event('change'));
    expect(b.controller.getSnapshot()).toMatchObject({ effective: 'dark', source: 'session' });
  });
  it('follows OS after a cross-tab deletion, without writing storage', () => {
    const b = browser('dark');
    b.win.dispatchEvent(Object.assign(new Event('storage'), { key: 'lasoviet:theme', newValue: null }));
    expect(b.controller.getSnapshot()).toMatchObject({ effective: 'light', source: 'system' });
    b.os.matches = false; b.os.dispatchEvent(new Event('change'));
    expect(b.root.dataset.theme).toBe('dark');
  });
  it('keeps stable snapshots and notifies only when fields change', () => {
    const b = browser('light'); const listener = vi.fn(); b.controller.subscribe(listener);
    const snapshot = b.controller.getSnapshot(); b.controller.refreshCapability();
    expect(b.controller.getSnapshot()).toBe(snapshot); expect(listener).not.toHaveBeenCalled();
    b.controller.choose('dark'); expect(listener).toHaveBeenCalledOnce();
    expect(b.root.style.colorScheme).toBe('dark');
  });
  it('reveals a pending image when the source changes without changing effective theme', () => {
    const b = browser();
    const img = { dataset: {} as Record<string, string>, style: { visibility: '' }, complete: false, src: '', srcset: '', onload: () => {},
      getAttribute: () => JSON.stringify({ desktop: { src: '/art.webp' } }), hasAttribute: () => false, removeAttribute() {}, closest: () => null };
    b.images.push(img); b.controller.refreshCapability();
    expect(img.style.visibility).toBe('hidden');
    b.win.dispatchEvent(Object.assign(new Event('storage'), { key: 'lasoviet:theme', newValue: 'light' }));
    img.onload(); expect(img.style.visibility).toBe('');
  });
});


it('starts the responsive preload with its srcset already configured', () => {
  const b = browser('light');
  const requests: string[] = [];
  const link = { imageSrcset: '', imageSizes: '', fetchPriority: '', set href(value: string) { requests.push(this.imageSrcset || value); } };
  const original = b.win.document.querySelector;
  b.win.document.querySelector = (selector: string) => selector === 'link[data-theme-preload]' ? link : original(selector);
  b.images.push({ dataset: {}, style: {}, complete: false, src: '', srcset: '',
    getAttribute: () => JSON.stringify({ desktop: { src: '/hero-1536.webp', srcSet: '/hero-640.webp 640w, /hero-1536.webp 1536w' } }),
    hasAttribute: () => true, removeAttribute() {}, closest: () => null });
  b.controller.refreshCapability();
  expect(requests).toEqual(['/hero-640.webp 640w, /hero-1536.webp 1536w']);
});


it('preloads only the effective homepage hero before any body slot exists', () => {
  const hero = { dark: { desktop: { src: '/dark.webp' } }, light: { desktop: { src: '/light.webp' } } };
  expect(browser('light', false, hero).preload?.href).toBe('/light.webp');
  expect(browser('dark', false, hero).preload?.href).toBe('/dark.webp');
  expect(browser('light', false, hero, '/en/tu-vi').preload).toBeNull();
});


it('defers distant CSS artwork until its owner enters the preload margin', () => {
  const b = browser('light');
  const template = { isConnected: true, dataset: { themeStyleLazy: '', themeStyleReady: undefined as string | undefined }, getAttribute: () => '.art { background: url(/light.webp); }' };
  b.templates.push(template);
  b.controller.refreshCapability();
  expect(b.preload).toBeNull();
  template.dataset.themeStyleReady = '';
  b.controller.refreshCapability();
  expect(b.preload?.textContent).toContain('/light.webp');
});

it('does not request another homepage hero after client navigation away', () => {
  const hero = { dark: { desktop: { src: '/dark.webp' } }, light: { desktop: { src: '/light.webp' } } };
  const b = browser('light', false, hero);
  b.win.location.pathname = '/en/tu-vi';
  b.controller.choose('dark');
  expect(b.preload?.href).toBe('/light.webp');
});
