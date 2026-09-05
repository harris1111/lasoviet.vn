export function localizedPath(locale: "en" | "vi", path: string): string {
  return locale === "en" ? `/en${path}` : path;
}

export function imagePath(name: string): string {
  return `/images/lasoviet/${name}`;
}
