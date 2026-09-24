import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessengerBubble } from "./messenger-bubble";

describe("MessengerBubble component (FD-095 / FD-099 / Task #37)", () => {
  it("ships hidden by default when customerContactConfig.social is not visible", () => {
    const html = renderToStaticMarkup(<MessengerBubble />);
    expect(html).toBe("");
  });

  it("does not render when href is empty or whitespace only", () => {
    const html = renderToStaticMarkup(<MessengerBubble href="   " visible={true} />);
    expect(html).toBe("");
  });

  it("does not render when visible is false even if href is present", () => {
    const html = renderToStaticMarkup(
      <MessengerBubble href="https://m.me/lasoviet" visible={false} />,
    );
    expect(html).toBe("");
  });

  it("renders floating bubble with correct markup and Vietnamese copy", () => {
    const html = renderToStaticMarkup(
      <MessengerBubble href="https://m.me/lasoviet" locale="vi" visible={true} />,
    );

    expect(html).toContain('class="msgr-bubble"');
    expect(html).toContain('href="https://m.me/lasoviet"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Nhắn Lá Số Việt qua Messenger"');
    expect(html).toContain('<span class="label">Nhắn Lá Số Việt</span>');
    expect(html).toContain('messenger-logo-meta-ho-tro-khach-hang-lasoviet.webp');
    expect(html).toContain('width="56"');
    expect(html).toContain('height="56"');
  });

  it("renders floating bubble with correct English copy for en locale", () => {
    const html = renderToStaticMarkup(
      <MessengerBubble href="https://m.me/lasoviet" locale="en" visible={true} />,
    );

    expect(html).toContain('class="msgr-bubble"');
    expect(html).toContain('aria-label="Message Lá Số Việt on Messenger"');
    expect(html).toContain('<span class="label">Message Lá Số Việt</span>');
  });
});
