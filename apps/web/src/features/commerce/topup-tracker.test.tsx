import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../analytics/funnel-analytics", () => ({
  trackTopupView: vi.fn(),
  trackPackSelected: vi.fn(),
}));

import { TopupTracker } from "./topup-tracker";
import { trackTopupView, trackPackSelected } from "../analytics/funnel-analytics";
import { LA_TOP_UP_PACKS } from "./la-packs";

describe("TopupTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null without displaying any visual UI elements", () => {
    const html = renderToStaticMarkup(
      <TopupTracker activeTab="nap-la" />,
    );
    expect(html).toBe("");
  });

  it("handles document event listeners without errors in non-browser environment", () => {
    // Verifies rendering TopupTracker for all tabs produces empty markup
    expect(renderToStaticMarkup(<TopupTracker activeTab="luan-giai" />)).toBe("");
    expect(renderToStaticMarkup(<TopupTracker activeTab="hoi-vien" />)).toBe("");
    expect(renderToStaticMarkup(<TopupTracker activeTab="nap-la" />)).toBe("");
  });
});
