import { HomepageV3Testimonials } from "../homepage-v3/homepage-v3-testimonials-section";
import { troiNamAsset, type TroiNamAsset } from "./troi-nam-assets";

// Reader IDs remain stable when slots rotate or filters reorder the cards.
const AVATARS: Readonly<Record<string, TroiNamAsset>> = {
  "01": troiNamAsset("C01"),
  "02": troiNamAsset("C02"),
  "03": troiNamAsset("C03"),
  "04": troiNamAsset("C04"),
  "05": troiNamAsset("C00"),
  "06": troiNamAsset("C05"),
  "07": troiNamAsset("C06"),
  "08": troiNamAsset("C07"),
  "09": troiNamAsset("C08"),
  "10": troiNamAsset("C09"),
  "11": troiNamAsset("C10"),
  "12": troiNamAsset("C11"),
  "13": troiNamAsset("C12"),
  "14": troiNamAsset("C13"),
  "15": troiNamAsset("C14"),
};

export function TroiNamTestimonials() {
  return (
    <div className="hv3 tn-testimonials">
      <HomepageV3Testimonials avatars={AVATARS} presentation="carousel" />
    </div>
  );
}
