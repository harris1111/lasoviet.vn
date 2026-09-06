export function isExplicitVietnamesePath(pathname: string): boolean {
  return pathname === "/vi" || pathname.startsWith("/vi/");
}

export function isUnprefixedCanonicalReportPath(pathname: string): boolean {
  return pathname === "/bao-cao" || pathname.startsWith("/bao-cao/");
}
