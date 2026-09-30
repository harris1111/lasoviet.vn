import type { ReactNode } from "react";

/** FD-094 tool marks, LSV editorial glyphs, and MIT-licensed Phosphor utility glyphs. */
const paths = {
  "annual-cycle": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 6v10l7 4M8 8l2 2M24 8l-2 2"/><circle cx="23" cy="20" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "archive": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h22v19H5zM5 13h22M5 19h22M13 10h6M13 16h6M13 22h6"/><circle cx="23" cy="22" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "bat-tu": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h18M7 13h18M7 19h18M7 25h18M11 5v22M21 5v22"/><circle cx="16" cy="13" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "birth-details": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5.5h12l5 5v16H9zM21 5.5v5h5M12 16h11M12 20h8"/><circle cx="11.5" cy="10" r="1.6" fill="var(--accent-seal)" stroke="none"/></g>,
  "birth-hour": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 9v7l4 2.6M16 4v-2M16 30v-2M4 16H2M30 16h-2"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "boi-tinh-yeu": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12.3" cy="16" r="7"/><circle cx="19.7" cy="16" r="7"/></g><circle cx="16" cy="10.1" r="1.9" fill="var(--accent-seal)"/></g>,
  "calendar-conversion": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="17" rx="2"/><path d="M8 4v5M16 4v5M4 12h16M23 12h5v15H12v-3M19 17l3 3 3-3"/><circle cx="9" cy="17" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "career-path": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 26V7h9M9 23h10M15 7l4 5-4 5M19 23l5-5-5-5"/><circle cx="25" cy="18" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "chart-palaces": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="24" height="24" rx="1"/><path d="M10 4v24M22 4v24M16 4v6M16 22v6M4 10h24M4 22h24M4 16h6M22 16h6"/><circle cx="7" cy="7" r="1.6" fill="var(--accent-seal)" stroke="none"/></g>,
  "chiem-tinh": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 6v20M6 16h20M9 9l14 14M23 9L9 23"/><circle cx="22.8" cy="9.2" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "con-so-may-man": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="13.5" r="9"/><circle cx="16" cy="13.5" r="3"/><line x1="16" y1="22.5" x2="16" y2="25.5"/></g><rect x="14.5" y="25.3" width="3" height="4.2" rx="1.2" fill="var(--accent-seal)"/></g>,
  "decision": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 26V18c0-5 5-7 11-7h3M16 11l-4-4M16 11l-4 4M14 24c5 0 10-2 13-7M24 17h3v3"/><circle cx="27" cy="17" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "download-report": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h18v17H7zM16 11v16M11 22l5 5 5-5M6 29h20"/><circle cx="22" cy="9" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "effect-connection": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="21" r="3"/><circle cx="25" cy="8" r="3"/><path d="M10 19l12-9M12 8h5M14.5 5.5v5"/><circle cx="16" cy="14.5" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "effect-focus": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12V4h8M20 4h8v8M4 20v8h8M20 28h8v-8"/><circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "effect-loading": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10" stroke-dasharray="3 4"/><path d="M16 6v4"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "effect-progress": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 25h24M6 20l6-6 5 3 9-11"/><circle cx="26" cy="6" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "effect-reveal": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 23l9-11 5 4 8-10M5 27h22M7 18l6-7"/><circle cx="27" cy="6" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "evidence-link": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="11" r="3"/><circle cx="24" cy="11" r="3"/><circle cx="16" cy="24" r="3"/><path d="M11 11h10M9.5 13.5l5 8M22.5 13.5l-5 8"/><circle cx="16" cy="11" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "giai-ma-giac-mo": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 17.5q10.5 8 21 0"/><line x1="9" y1="20.6" x2="7.8" y2="23"/><line x1="16" y1="22" x2="16" y2="24.8"/><line x1="23" y1="20.6" x2="24.2" y2="23"/><path d="M22.5 5.8a4 4 0 1 0 3.3 5.9a3.1 3.1 0 1 1 -3.3 -5.9z"/></g><circle cx="11" cy="9.5" r="1.7" fill="var(--accent-seal)"/></g>,
  "gieo-que": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="8" x2="24" y2="8"/><line x1="8" y1="11.6" x2="14.3" y2="11.6"/><line x1="17.7" y1="11.6" x2="24" y2="11.6"/><line x1="8" y1="15.2" x2="24" y2="15.2"/><line x1="8" y1="18.8" x2="24" y2="18.8" stroke="var(--accent-seal)"/><line x1="8" y1="22.4" x2="14.3" y2="22.4"/><line x1="17.7" y1="22.4" x2="24" y2="22.4"/><line x1="8" y1="26" x2="24" y2="26"/></g></g>,
  "gift-la": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 14h22v13H5zM3 10h26v4H3zM16 10v17M16 10c-8 0-9-7-4-7 3 0 4 4 4 7zm0 0c8 0 9-7 4-7-3 0-4 4-4 7z"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "hat-xi-may-mat": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17q11 -11 22 0q-11 11 -22 0z"/><circle cx="16" cy="17" r="4.2"/><line x1="10" y1="6" x2="11" y2="8.6"/><line x1="16" y1="4.6" x2="16" y2="7.4"/><line x1="22" y1="6" x2="21" y2="8.6"/></g><circle cx="16" cy="17" r="1.8" fill="var(--accent-seal)"/></g>,
  "kinh-dich": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7h16M8 11h6M18 11h6M8 15h16M8 19h16M8 23h6M18 23h6M8 27h16"/><circle cx="16" cy="19" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "la-balance": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h8M3 26h11"/><circle cx="16" cy="16" r="13"/><g transform="translate(8 8) scale(.16)">
  
  <g fill="none" stroke="#C9A44D" strokeWidth="5.2" strokeLinecap="butt">
    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>
    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>
    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>
  </g>
  <g fill="#C9A44D" stroke="none">
    <path d="M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z"/>
    <path d="M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z"/>
    <path d="M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z"/>
    <path d="M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z"/>
    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>
    <path d="M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z"/>
  </g>
  <path fill="var(--accent-seal)" stroke="none" d="M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"/>
</g></g>,
  "la-bonus": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="13"/><g transform="translate(8 8) scale(.16)">
  
  <g fill="none" stroke="#C9A44D" strokeWidth="5.2" strokeLinecap="butt">
    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>
    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>
    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>
  </g>
  <g fill="#C9A44D" stroke="none">
    <path d="M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z"/>
    <path d="M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z"/>
    <path d="M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z"/>
    <path d="M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z"/>
    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>
    <path d="M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z"/>
  </g>
  <path fill="var(--accent-seal)" stroke="none" d="M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"/>
</g><path d="M2 7h6M5 4v6"/></g>,
  "la-currency": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="13"/><g transform="translate(8 8) scale(.16)">
  
  <g fill="none" stroke="#C9A44D" strokeWidth="5.2" strokeLinecap="butt">
    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>
    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>
    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>
  </g>
  <g fill="#C9A44D" stroke="none">
    <path d="M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z"/>
    <path d="M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z"/>
    <path d="M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z"/>
    <path d="M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z"/>
    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>
    <path d="M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z"/>
  </g>
  <path fill="var(--accent-seal)" stroke="none" d="M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"/>
</g></g>,
  "la-spend": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="13"/><g transform="translate(8 8) scale(.16)">
  
  <g fill="none" stroke="#C9A44D" strokeWidth="5.2" strokeLinecap="butt">
    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>
    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>
    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>
  </g>
  <g fill="#C9A44D" stroke="none">
    <path d="M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z"/>
    <path d="M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z"/>
    <path d="M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z"/>
    <path d="M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z"/>
    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>
    <path d="M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z"/>
  </g>
  <path fill="var(--accent-seal)" stroke="none" d="M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"/>
</g><path d="M23 26h8M27 22l4 4-4 4"/></g>,
  "la-topup": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="13"/><g transform="translate(8 8) scale(.16)">
  
  <g fill="none" stroke="#C9A44D" strokeWidth="5.2" strokeLinecap="butt">
    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>
    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>
    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>
  </g>
  <g fill="#C9A44D" stroke="none">
    <path d="M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z"/>
    <path d="M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z"/>
    <path d="M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z"/>
    <path d="M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z"/>
    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>
    <path d="M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z"/>
  </g>
  <path fill="var(--accent-seal)" stroke="none" d="M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"/>
</g><path d="M28 5v7M24.5 8.5h7"/></g>,
  "lich-am-ngay-tot": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="7.5" width="20" height="18.5" rx="2.5"/><line x1="11" y1="5" x2="11" y2="9.5"/><line x1="21" y1="5" x2="21" y2="9.5"/><line x1="6" y1="12.5" x2="26" y2="12.5"/><path d="M21.2 15.6a4.4 4.4 0 1 0 1.3 6.9a3.5 3.5 0 1 1 -1.3 -6.9z"/></g><rect x="9" y="16.5" width="4.4" height="4.4" rx=".6" fill="var(--accent-seal)"/></g>,
  "membership": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11l4 16h14l4-16-7 5-4-10-4 10zM9 22h14"/><circle cx="16" cy="5" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "menh-ngu-hanh": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="16.0,7.0 25.51,13.91 21.88,25.09 10.12,25.09 6.49,13.91"/><circle cx="25.51" cy="13.91" r="2.3"/><circle cx="21.88" cy="25.09" r="2.3"/><circle cx="10.12" cy="25.09" r="2.3"/><circle cx="6.49" cy="13.91" r="2.3"/></g><circle cx="16.0" cy="7.0" r="2.6" fill="var(--accent-seal)"/></g>,
  "method": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M12 20l2-6 6-2-2 6z"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "payment-pending": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="11"/><path d="M16 8v8l5 3"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "payment-qr": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h8v8H4zM20 4h8v8h-8zM4 20h8v8H4zM20 20h4M28 20v4M20 28h8"/><circle cx="8" cy="8" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "payment-reconcile": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5h20v22H6zM10 10h12M10 15h8M10 20h12"/><circle cx="23" cy="21" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "payment-verified": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="11"/><path d="M10 16l4 4 8-9"/><circle cx="25.5" cy="8" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "privacy": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4l10 4v8c0 6-4 9.5-10 12c-6-2.5-10-6-10-12V8zM12 16h8M16 12v8"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "purchase-confirm": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5h20v21H6zM10 11h12M10 16h8M10 21l3 3 6-7"/><circle cx="23" cy="21" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-clarity": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="7"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l4 4M22 22l4 4"/><circle cx="16" cy="16" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-curious": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="9"/><path d="M12 13a4 4 0 1 1 5 4v2"/><circle cx="17" cy="23" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-delight": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24"/><circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-reassured": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8zM11 16l4 4 7-8"/><circle cx="16" cy="5.5" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-reflective": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="14" r="9"/><path d="M8 25h16M12 29h8M11 11l10 6"/><circle cx="16" cy="14" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "reaction-unsure": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 23l10-16 10 16zM16 14v4"/><circle cx="16" cy="21" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "reading-depth": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h17v16H6zM9 5h17v16M6 12h17M10 16h9"/><circle cx="22" cy="23" r="1.9" fill="var(--accent-seal)" stroke="none"/></g>,
  "reading-folio": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h14l5 5v17H7zM21 5v5h5M11 14h11M11 18h11M11 22h8"/><circle cx="23.5" cy="23.5" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "related-palaces": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="9" r="3"/><circle cx="25" cy="9" r="3"/><circle cx="16" cy="25" r="3"/><path d="M10 9h12M8.6 11.6l5.8 10.8M23.4 11.6l-5.8 10.8"/><circle cx="16" cy="14" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "relationship": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="16" r="7"/><circle cx="20" cy="16" r="7"/><circle cx="16" cy="10.5" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "report": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h15l4 4v18H7zM22 5v4h4M11 13h11M11 17h11M11 21h7"/><circle cx="22" cy="21" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "resume-reading": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7c4-2 8-2 11 0 3-2 7-2 11 0v18c-4-2-8-2-11 0-3-2-7-2-11 0zM16 7v18M10 13h3M19 13h4"/><circle cx="22" cy="20" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "rut-bai": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6.5" y="8.5" width="12" height="17" rx="2" transform="rotate(-12 12.5 17)"/><rect x="13.5" y="6.5" width="12" height="17" rx="2"/><path d="M19.5 10.8l3 4.2l-3 4.2l-3 -4.2z"/></g><circle cx="19.5" cy="15" r="1.3" fill="var(--accent-seal)"/></g>,
  "save-chart": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h18v22l-9-5-9 5zM11 11h10M11 15h7"/><circle cx="21.5" cy="18" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "self-reflection": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="12" r="8"/><path d="M16 20v8M10 28h12"/><circle cx="16" cy="12" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "share-card": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="20" height="20" rx="2"/><path d="M9 14h10M9 19h7M21 11l7-7M23 4h5v5"/><circle cx="20" cy="23" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "sim-phong-thuy": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="10" y="4" width="12" height="24" rx="2.6"/><line x1="13.4" y1="11" x2="18.6" y2="11"/><line x1="13.4" y1="14.6" x2="15.2" y2="14.6"/><line x1="16.8" y1="14.6" x2="18.6" y2="14.6"/><line x1="13.4" y1="18.2" x2="18.6" y2="18.2"/></g><circle cx="16" cy="24.2" r="1.4" fill="var(--accent-seal)"/></g>,
  "source-evidence": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8c4-2 8-2 11 0c3-2 7-2 11 0v17c-4-2-8-2-11 0c-3-2-7-2-11 0zM16 8v17M9 12h4M19 12h4M9 16h4"/><circle cx="21" cy="18.5" r="1.7" fill="var(--accent-seal)" stroke="none"/></g>,
  "state-empty": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9h22v18H5zM9 13h14M9 18h8M9 23h5"/><circle cx="23" cy="22" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "state-error": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="11"/><path d="M12 12l8 8M20 12l-8 8"/><circle cx="25" cy="8" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "state-success": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="11"/><path d="M10 16l4 4 8-9"/><circle cx="25.5" cy="7.5" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "state-uncertain": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 9v6M16 19v3M8 26l-3 3"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "state-warning": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4l13 23H3zM16 12v7"/><circle cx="16" cy="23" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "support": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17v-3a10 10 0 0 1 20 0v3M6 17v7h5v-7zM21 17v7h5v-7zM21 26c-1 2-3 3-7 3"/><circle cx="14" cy="29" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "than-so": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="18" height="18" rx="1.5"/><path d="M13 7v18M19 7v18M7 13h18M7 19h18"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "than-so-hoc": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="18" height="18" rx="2"/><line x1="13" y1="7" x2="13" y2="25"/><line x1="19" y1="7" x2="19" y2="25"/><line x1="7" y1="13" x2="25" y2="13"/><line x1="7" y1="19" x2="25" y2="19"/><circle cx="10" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="22" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="22" r=".9" fill="currentColor" stroke="none"/><circle cx="22" cy="22" r=".9" fill="currentColor" stroke="none"/></g><rect x="14.2" y="14.2" width="3.6" height="3.6" rx=".5" fill="var(--accent-seal)"/></g>,
  "topic-select": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h22v22H5zM10 11h12M10 16h12M10 21h7"/><circle cx="23" cy="21" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "transaction-history": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a11 11 0 1 1-1 11M6 4v7h7M16 9v7l5 3"/><circle cx="16" cy="16" r="1.8" fill="var(--accent-seal)" stroke="none"/></g>,
  "tu-vi": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="24" height="24" rx="1"/><path d="M10 4v24M22 4v24M16 4v6M16 22v6M4 10h24M4 22h24M4 16h6M22 16h6"/><circle cx="16" cy="16" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "tu-vi-hom-nay": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="10.5"/><line x1="16.0" y1="5.5" x2="16.0" y2="3.0"/><line x1="21.25" y1="6.91" x2="22.5" y2="4.74"/><line x1="25.09" y1="10.75" x2="27.26" y2="9.5"/><line x1="26.5" y1="16.0" x2="29.0" y2="16.0"/><line x1="25.09" y1="21.25" x2="27.26" y2="22.5"/><line x1="21.25" y1="25.09" x2="22.5" y2="27.26"/><line x1="16.0" y1="26.5" x2="16.0" y2="29.0"/><line x1="10.75" y1="25.09" x2="9.5" y2="27.26"/><line x1="6.91" y1="21.25" x2="4.74" y2="22.5"/><line x1="5.5" y1="16.0" x2="3.0" y2="16.0"/><line x1="6.91" y1="10.75" x2="4.74" y2="9.5"/><line x1="10.75" y1="6.91" x2="9.5" y2="4.74"/><circle cx="16" cy="16" r="3.6"/></g><circle cx="4.4" cy="22.7" r="2" fill="var(--accent-seal)"/></g>,
  "unlock-reading": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="14" width="16" height="13" rx="2"/><path d="M12 14V9a5 5 0 0 1 9.6-2"/><circle cx="16" cy="20.5" r="2" fill="var(--accent-seal)" stroke="none"/></g>,
  "xin-xam": <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14.5h14l-1.3 12a1.8 1.8 0 0 1 -1.8 1.5h-7.8a1.8 1.8 0 0 1 -1.8 -1.5z"/><line x1="12" y1="14.5" x2="10.8" y2="6"/><line x1="19" y1="14.5" x2="20" y2="5.5"/><line x1="21.8" y1="14.5" x2="24" y2="8"/><line x1="10" y1="20" x2="22.4" y2="20"/></g><line x1="15.6" y1="14.5" x2="15.6" y2="3.6" stroke="var(--accent-seal)" strokeWidth="1.9" strokeLinecap="round"/></g>,
  "ui-arrow": <g fill="currentColor" stroke="none"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></g>,
  "ui-back": <g fill="currentColor" stroke="none"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/></g>,
  "ui-bell": <g fill="currentColor" stroke="none"><path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/></g>,
  "ui-book": <g fill="currentColor" stroke="none"><path d="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64ZM160,88h40a8,8,0,0,1,0,16H160a8,8,0,0,1,0-16Zm48,40a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,128Zm0,32a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,160Z"/></g>,
  "ui-bookmark": <g fill="currentColor" stroke="none"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></g>,
  "ui-calendar": <g fill="currentColor" stroke="none"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"/></g>,
  "ui-check": <g fill="currentColor" stroke="none"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></g>,
  "ui-chevron": <g fill="currentColor" stroke="none"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></g>,
  "ui-clock": <g fill="currentColor" stroke="none"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/></g>,
  "ui-close": <g fill="currentColor" stroke="none"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></g>,
  "ui-copy": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></g></g>,
  "ui-download": <g fill="currentColor" stroke="none"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"/></g>,
  "ui-edit": <g fill="currentColor" stroke="none"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/></g>,
  "ui-external": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4h7v7M20 4l-9 9M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></g></g>,
  "ui-eye": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></g></g>,
  "ui-eye-off": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M9 6.5A11 11 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3 3.4M6 8.1A17 17 0 0 0 2.5 12s3.4 6 9.5 6c1.1 0 2.1-.2 3-.5"/><path d="M10 10a2.8 2.8 0 0 0 4 4"/></g></g>,
  "ui-filter": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></g></g>,
  "ui-history": <g fill="currentColor" stroke="none"><path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z"/></g>,
  "ui-home": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9H3zM9 20v-6h6v6"/></g></g>,
  "ui-info": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.5h.01"/></g></g>,
  "ui-lock": <g fill="currentColor" stroke="none"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"/></g>,
  "ui-logout": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H5v16h5M13 8l4 4-4 4M17 12H8"/></g></g>,
  "ui-mail": <g fill="currentColor" stroke="none"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></g>,
  "ui-menu": <g fill="currentColor" stroke="none"><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/></g>,
  "ui-pin": <g fill="currentColor" stroke="none"><path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/></g>,
  "ui-retry": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 8a8 8 0 1 0 1 7M19 4v5h-5"/></g></g>,
  "ui-search": <g fill="currentColor" stroke="none"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></g>,
  "ui-settings": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></g></g>,
  "ui-share": <g fill="currentColor" stroke="none"><path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/></g>,
  "ui-theme": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z"/></g></g>,
  "ui-trash": <g fill="currentColor" stroke="none"><g transform="scale(10.66667)" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></g></g>,
  "ui-user": <g fill="currentColor" stroke="none"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/></g>,
} satisfies Record<string, ReactNode>;

export type LsvIconName = keyof typeof paths;

export function LsvIcon({ name, size = 24, title, className }: { name: LsvIconName; size?: number; title?: string; className?: string }) {
  const isUtility = name.startsWith("ui-");
  return (
    <svg viewBox={isUtility ? "0 0 256 256" : "0 0 32 32"} width={size} height={size} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} focusable="false">
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
