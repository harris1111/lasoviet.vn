import { HomepageV3Story } from "../homepage-v3/homepage-v3-static-sections";

// No local plate image here (there used to be one, L03) — the painted
// WebGL world behind this section is already showing matching dusk/night
// scenery at this scroll position. Stacking a second, differently-lit photo
// on top of it read as two competing sunsets in one frame (2026-10-01 CX
// review). L03 is still used by the hero's own crossfade.
export function TroiNamStory() {
  return (
    <div className="hv3 tn-story">
      <HomepageV3Story />
    </div>
  );
}
