import { describe, expect, it, vi } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let mockLocale = "vi";

vi.mock("next-intl", async () => {
  const viAuth = (await import("../../../messages/vi/auth.json")).default;
  const enAuth = (await import("../../../messages/en/auth.json")).default;

  return {
    useLocale: () => mockLocale,
    useTranslations: () => {
      const getDictionary = () => (mockLocale === "en" ? enAuth : viAuth);

      const t: any = (key: string) => {
        const dict = getDictionary();
        const parts = key.split(".");
        let val: any = dict;
        for (const p of parts) val = val?.[p];
        return typeof val === "string" ? val : key;
      };

      t.rich = (key: string, values?: Record<string, (chunks: React.ReactNode) => React.ReactNode>) => {
        const raw = t(key);
        if (!values) return raw;

        const tagRegex = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = tagRegex.exec(raw)) !== null) {
          if (match.index > lastIndex) {
            parts.push(raw.slice(lastIndex, match.index));
          }
          const tagName = match[1]!;
          const content = match[2]!;
          const renderFn = values[tagName];
          if (renderFn) {
            parts.push(renderFn(content));
          } else {
            parts.push(match[0]);
          }
          lastIndex = tagRegex.lastIndex;
        }
        if (lastIndex < raw.length) {
          parts.push(raw.slice(lastIndex));
        }

        return createElement(React.Fragment, null, ...parts);
      };

      return t;
    },
  };
});

vi.mock("../../auth/auth-client", () => ({
  authClient: {
    signUp: { email: vi.fn() },
    signIn: { email: vi.fn(), social: vi.fn() },
    sendVerificationEmail: vi.fn(),
  },
}));

import { AuthPanel } from "./auth-panel";

describe("AuthPanel continuation notice", () => {
  it("renders exact Vietnamese notice from canonical message JSON, locale-correct links, and zero checkboxes", () => {
    mockLocale = "vi";
    const html = renderToStaticMarkup(
      <AuthPanel
        callbackURL="/tai-khoan"
        forgotPasswordURL="/quen-mat-khau"
      />,
    );

    // Exact VI wording
    expect(html).toContain(
      "Bằng việc tiếp tục, bạn đồng ý với",
    );
    expect(html).toContain('href="/dieu-khoan"');
    expect(html).toContain("Điều khoản");
    expect(html).toContain('href="/chinh-sach-bao-mat"');
    expect(html).toContain("Chính sách bảo mật");

    // Strict check: no checkboxes in auth panel
    expect(html).not.toContain('type="checkbox"');
  });

  it("renders exact English notice from canonical message JSON, locale-correct links, and zero checkboxes", () => {
    mockLocale = "en";
    try {
      const html = renderToStaticMarkup(
        <AuthPanel
          callbackURL="/en/tai-khoan"
          forgotPasswordURL="/en/quen-mat-khau"
        />,
      );

      // Exact EN wording
      expect(html).toContain("By continuing, you agree to the");
      expect(html).toContain('href="/en/dieu-khoan"');
      expect(html).toContain("Terms");
      expect(html).toContain('href="/en/chinh-sach-bao-mat"');
      expect(html).toContain("Privacy Policy");

      expect(html).not.toContain('type="checkbox"');
    } finally {
      mockLocale = "vi";
    }
  });
});
