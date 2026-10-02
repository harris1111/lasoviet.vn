'use client';
import { useLayoutEffect, useRef } from 'react';
import { troiNamAsset, type TroiNamAsset } from './troi-nam-assets';

type PictureAssets = { desktop: TroiNamAsset; mobile?: TroiNamAsset };
/** No src-bearing inactive artwork in SSR; the pre-paint owner activates slots. */
export function TroiNamThemePicture({ desktop, mobile, className, imageClassName, alt = '', priority = false, darkOnly = false, lightOnly = false, lazy = false }: {
  desktop: string; mobile?: string; className?: string; imageClassName?: string;
  alt?: string; priority?: boolean; darkOnly?: boolean; lightOnly?: boolean; lazy?: boolean;
}) {
  const dark: PictureAssets = { desktop: troiNamAsset(desktop), mobile: mobile ? troiNamAsset(mobile) : undefined };
  const light: PictureAssets | undefined = darkOnly ? undefined : { desktop: troiNamAsset(desktop, 'light'), mobile: mobile ? troiNamAsset(mobile, 'light') : undefined };
  useLayoutEffect(() => { window.__lsvTheme?.refreshCapability(); }, []);
  return <>
  <picture className={className}>
    {mobile ? <source media="(max-width: 879px)" sizes="100vw" suppressHydrationWarning /> : null}
    <img data-theme-image="" data-image-dark={lightOnly ? undefined : JSON.stringify(dark)} data-image-light={light ? JSON.stringify(light) : undefined}
      data-preload={priority ? '' : undefined} className={imageClassName} sizes="100vw"
      width={dark.desktop.width} height={dark.desktop.height} alt={alt} aria-hidden={alt ? undefined : true}
      loading={lazy ? 'lazy' : 'eager'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} suppressHydrationWarning />
  </picture>
  {lightOnly ? null : <noscript><picture className={className}>
    {dark.mobile ? <source media="(max-width: 879px)" srcSet={dark.mobile.srcSet ?? dark.mobile.src} sizes="100vw" /> : null}
    <img src={dark.desktop.src} srcSet={dark.desktop.srcSet} sizes="100vw" className={imageClassName} alt={alt} />
  </picture></noscript>}
  </>;
}

export function TroiNamThemeStyle({ dark, light, lazy = false }: { dark: string; light: string; lazy?: boolean }) {
  const ref = useRef<HTMLTemplateElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const activate = () => { host.dataset.themeStyleReady = ''; window.__lsvTheme?.refreshCapability(); };
    if (!lazy || typeof IntersectionObserver === 'undefined') { activate(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { activate(); observer.disconnect(); }
    }, { rootMargin: '600px' });
    observer.observe(host.parentElement ?? host);
    return () => observer.disconnect();
  }, [lazy]);
  return <template ref={ref} data-theme-style="" data-theme-style-lazy={lazy ? '' : undefined} data-style-dark={dark} data-style-light={light} suppressHydrationWarning />;
}
