import { getHeroLogoStage, type HeroLogoInput, type HeroLogoStage } from "./hero-logo-progress";

/**
 * Decorative, brand-exact logomark inside the existing central 2×2 Tử Vi cell.
 * Keep the real chart geometry and engine-driven details in the parent component.
 */
export function HeroCenterLogo(props: HeroLogoInput) {
  const stage: HeroLogoStage = getHeroLogoStage(props);
  return (
    <span className="lsv-hero-center-logo" data-logo-stage={stage} aria-hidden="true">
      <svg className="lsv-hero-center-logo__svg" viewBox="0 0 100 100" focusable="false">
        <g className="lsv-hero-center-logo__ghost" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="butt">
          <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37" />
          <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26" />
          <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25" />
        </g>
        <g className="lsv-hero-center-logo__line" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="butt">
          <path className="lsv-hero-center-logo__ring" pathLength="1" d="M89.27 42.37A40 40 0 1 1 10.73 42.37" />
          <path className="lsv-hero-center-logo__crown" pathLength="1" d="M28.51 16.26A40 40 0 0 1 71.49 16.26" />
          <path className="lsv-hero-center-logo__v" pathLength="1" d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25" />
        </g>
        <g className="lsv-hero-center-logo__details" fill="currentColor">
          <path d="M8.53 41.94C9.03 39.39 9.93 38.28 12.18 36.98C13.15 39.39 13.44 40.25 12.94 42.8Z" />
          <path d="M91.47 41.94C90.97 39.39 90.07 38.28 87.82 36.98C86.85 39.39 86.56 40.25 87.06 42.8Z" />
          <path d="M27.3 14.37C25.11 15.77 24.02 16.98 24.02 19.58C26.62 19.58 27.53 19.56 29.72 18.16Z" />
          <path d="M72.7 14.37C74.89 15.77 75.98 16.98 75.98 19.58C73.38 19.58 72.47 19.56 70.28 18.16Z" />
          <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.95 37.44 23.35 39.51L27.08 36.99C25.68 34.92 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z" />
          <path d="M83.74 24.99C82.79 28.81 79.95 34.62 76.65 39.51L72.92 36.99C76.66 31.44 80.99 26.64 83.74 24.99Z" />
        </g>
        <path className="lsv-hero-center-logo__cinnabar" fill="#CE5B45" d="M18.22 27.89C18.75 31.36 20.52 33.98 23.53 35.77C23 32.3 21.23 29.68 18.22 27.89Z" />
      </svg>
    </span>
  );
}
