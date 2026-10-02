import { describe, expect, it, vi } from 'vitest';
import { installSiteTheme } from './site-theme';

function browser(saved: string | null = null, blocked = false) {
  const store = new Map(saved ? [['lasoviet:theme', saved]] : []);
  let ready = true;
  const os = Object.assign(new EventTarget(), { matches: true });
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  const images: unknown[] = [];
  const doc = Object.assign(new EventTarget(), {
    documentElement: root, readyState: 'loading',
    querySelector: (selector: string) => selector === '[data-light-ready]' && ready ? {} : null,
    querySelectorAll: (selector: string) => selector.startsWith('img') ? images : [],
  });
  const win = Object.assign(new EventTarget(), {
    document: doc, location: { pathname: '/en/' }, matchMedia: () => os,
    localStorage: { getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { if (blocked) throw Error('blocked'); store.set(key, value); } },
    MutationObserver: class { observe() {} }, CustomEvent,
  });
  const controller = installSiteTheme(win as unknown as Window, ['/'], { dark: '#080706', light: '#f7f1e5' });
  return { win, root, os, store, controller, images, capability(value: boolean) { ready = value; controller.refreshCapability(); } };
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
