'use client';
import { useSyncExternalStore } from 'react';
import { getSiteTheme, SERVER_THEME, subscribeSiteTheme } from './site-theme';
export function useSiteTheme() { return useSyncExternalStore(subscribeSiteTheme, getSiteTheme, () => SERVER_THEME); }
