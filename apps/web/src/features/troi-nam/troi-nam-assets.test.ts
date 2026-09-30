import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { TROI_NAM_ASSETS, troiNamAsset } from "./troi-nam-assets";

const PUBLIC_DIR = resolve(__dirname, "../../../public");

describe("troiNamAsset", () => {
  it("points every manifest entry at a file that exists on disk", () => {
    const missing = Object.entries(TROI_NAM_ASSETS)
      .filter(([, asset]) => !existsSync(resolve(PUBLIC_DIR, `.${asset.src}`)))
      .map(([id]) => id);
    expect(missing).toEqual([]);
  });

  it("throws a named error for an unknown id", () => {
    expect(() => troiNamAsset("NOPE")).toThrow(/NOPE/);
  });
});
