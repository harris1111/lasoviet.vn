export function isExplicitVietnamesePath(pathname: string): boolean {
  return pathname === "/vi" || pathname.startsWith("/vi/");
}
