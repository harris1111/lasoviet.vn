import { HomepageV3Faq } from "../homepage-v3/homepage-v3-faq";

export function TroiNamFaq({ locale }: { locale: "en" | "vi" }) {
  return <div className="hv3 tn-faq"><HomepageV3Faq locale={locale} /></div>;
}
