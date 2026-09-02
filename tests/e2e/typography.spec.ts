import { expect, test } from "@playwright/test";

const vietnameseSample =
  "Lập lá số. Hiểu vận mệnh. Quyền riêng tư. Luận giải.";

test("loads bundled Vietnamese font faces for UI, display, and mono typography", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");

  const loadedFontRoles = await page.evaluate(async (sample) => {
    await document.fonts.ready;

    const loadedFamilies = Array.from(document.fonts)
      .filter((font) => font.status === "loaded")
      .map((font) => font.family.replaceAll('"', ""));

    return [
      ["body", "body"],
      ["display", "h1"],
      ["mono", ".eyebrow"],
    ].map(([role, selector]) => {
      const family = getComputedStyle(document.querySelector(selector)!).fontFamily;
      const loadedFamily = loadedFamilies.find((candidate) =>
        family.includes(candidate),
      );

      return {
        role,
        family,
        loaded:
          loadedFamily !== undefined &&
          document.fonts.check(`16px "${loadedFamily}"`, sample),
      };
    });
  }, vietnameseSample);

  expect(loadedFontRoles).toEqual([
    expect.objectContaining({ role: "body", loaded: true }),
    expect.objectContaining({ role: "display", loaded: true }),
    expect.objectContaining({ role: "mono", loaded: true }),
  ]);
});
