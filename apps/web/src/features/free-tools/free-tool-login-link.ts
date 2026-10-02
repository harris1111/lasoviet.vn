export type FreeToolLoginRoute =
  | "tarot"
  | "zodiac"
  | "dreamSymbols"
  | "fengShui";

const routes: Record<FreeToolLoginRoute, string> = {
  tarot: "/boi-bai",
  zodiac: "/12-con-giap",
  dreamSymbols: "/giai-ma-giac-mo",
  fengShui: "/phong-thuy/huong-nha",
};

export function buildFreeToolLoginHref(
  locale: "vi" | "en",
  route: FreeToolLoginRoute,
): string {
  const path = routes[route];
  const localizedPath = locale === "en" ? `/en${path}` : path;
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(localizedPath)}`;
}
