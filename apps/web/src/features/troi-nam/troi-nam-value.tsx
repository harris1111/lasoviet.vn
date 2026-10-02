import { HomepageV3Value } from "../homepage-v3/homepage-v3-static-sections";

export function TroiNamValue({ locale }: { locale: "en" | "vi" }) {
  return <div className="hv3 tn-value"><HomepageV3Value locale={locale} showPacks={false} /></div>;
}
