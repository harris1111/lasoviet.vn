import { routeRegistry } from '@lasoviet/config';
import { installSiteTheme } from './site-theme';

// These owners have no readiness marker. PublicContentPage wraps every rendered
// public template in the marker; private owners were checked individually.
const unavailable = new Set(['admin-overview', 'admin-audit', 'auth-sign-in', 'auth-password-reset-request', 'auth-password-reset-complete', 'notification-unsubscribe', 'redirect', 'api-command', 'private-api']);
export const initialReadyPaths = routeRegistry.filter(route => !unavailable.has(route.template) && route.status !== 'reserved' && route.status !== 'archived').map(route => route.path);
export const SITE_THEME_BOOTSTRAP = `(${installSiteTheme.toString()})(window,${JSON.stringify(initialReadyPaths)},{dark:'#080706',light:'#f7f1e5'});`;
