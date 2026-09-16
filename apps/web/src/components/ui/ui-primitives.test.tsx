import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckMatrix } from "./check-matrix";
import { SupportCard } from "./support-card";
import { UiCard } from "./ui-card";
import { UiFieldShell } from "./ui-field-shell";

describe("static UI primitives", () => {
  it("renders one semantic card shell without nesting another card", () => {
    const html = renderToStaticMarkup(
      <UiCard aria-label="Card sample"><p>Nội dung</p></UiCard>,
    );

    expect(html).toContain("<section");
    expect((html.match(/ui-card/g) ?? []).length).toBe(2);
  });

  it("connects a field label to its control through native label semantics", () => {
    const html = renderToStaticMarkup(
      <UiFieldShell icon="L" label="Họ và tên">
        <input className="ui-field-shell__input" name="name" />
      </UiFieldShell>,
    );

    expect(html).toContain("<label");
    expect(html).toContain('name="name"');
    expect(html).toContain("Họ và tên");
  });

  it("exposes text labels alongside matrix icons", () => {
    const html = renderToStaticMarkup(
      <CheckMatrix
        columns={[{ id: "free", label: "Miễn phí" }]}
        rows={[{ id: "chart", label: "Lá số", cells: { free: true } }]}
      />,
    );

    expect(html).toContain('aria-label="Có"');
    expect(html).toContain("Có");
    expect(html).toContain("Lá số");
  });

  it("renders email-only support with a touch-sized action", () => {
    const html = renderToStaticMarkup(
      <SupportCard
        description="Một dòng hỗ trợ."
        email="support@lasoviet.net"
        title="Cần hỗ trợ?"
      />,
    );

    expect(html).toContain("mailto:support@lasoviet.net");
    expect(html).toContain("Gửi email hỗ trợ");
    expect(html).not.toMatch(/zalo|điện thoại|địa chỉ/i);
    expect(html).toContain("ui-button");
  });
});
