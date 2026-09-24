import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GoodDaysPreview } from "./good-days-preview";
import { ZodiacPreview } from "./zodiac-preview";
import { LunarCalendarPreview } from "./lunar-calendar-preview";
import { DreamSymbolPreview } from "./dream-symbol-preview";
import { TarotPreview } from "./tarot-preview";
import { FengShuiPreview } from "./feng-shui-preview";
import { GatedToolPreview } from "./gated-tool-preview";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Free tools cross-sell banner integration (UI-09 / Task #27)", () => {
  it("renders cross-sell banner in GoodDaysPreview linking to ?from=xem-ngay", () => {
    const html = renderToStaticMarkup(<GoodDaysPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="xem-ngay"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=xem-ngay"');
  });

  it("renders cross-sell banner in ZodiacPreview linking to ?from=12-con-giap", () => {
    const html = renderToStaticMarkup(<ZodiacPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="12-con-giap"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=12-con-giap"');
  });

  it("renders cross-sell banner in LunarCalendarPreview linking to ?from=lich-am", () => {
    const html = renderToStaticMarkup(<LunarCalendarPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="lich-am"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=lich-am"');
  });

  it("renders cross-sell banner in DreamSymbolPreview linking to ?from=giai-mong", () => {
    const html = renderToStaticMarkup(<DreamSymbolPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="giai-mong"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=giai-mong"');
  });

  it("renders cross-sell banner in TarotPreview linking to ?from=tarot", () => {
    const html = renderToStaticMarkup(<TarotPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="tarot"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=tarot"');
  });

  it("renders cross-sell banner in FengShuiPreview linking to ?from=phong-thuy", () => {
    const html = renderToStaticMarkup(<FengShuiPreview locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="phong-thuy"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=phong-thuy"');
  });

  it("renders cross-sell banner in GatedToolPreview (palmistry) linking to ?from=xem-chi-tay", () => {
    const html = renderToStaticMarkup(<GatedToolPreview kind="xem-chi-tay" locale="vi" />);
    expect(html).toContain('data-testid="free-tool-cross-sell-banner"');
    expect(html).toContain('data-from="xem-chi-tay"');
    expect(html).toContain('href="/tao-la-so/tu-vi?from=xem-chi-tay"');
  });
});
