import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../birth-profile/homepage-birth-prefill", () => ({ clearBirthCache: () => {} }));
import { AnonymousDataDeletionControl } from "./anonymous-data-deletion-control";

const labels = {
  title: "Quyền riêng tư", description: "Xóa dữ liệu lá số ẩn danh", begin: "Xóa dữ liệu lá số",
  confirmation: "Thao tác này xóa ngay.", cancel: "Giữ lại", confirm: "Xác nhận xóa", pending: "Đang xóa", error: "Lỗi",
};

describe("anonymous data deletion control (U8)", () => {
  it("starts as a single small link line with no heading, no confirm button and no danger button", () => {
    const html = renderToStaticMarkup(<AnonymousDataDeletionControl action={async () => ({ ok: true } as never)} labels={labels} />);
    expect(html).toContain("anonymous-deletion-link");
    expect(html).toContain("Xóa dữ liệu lá số ẩn danh");
    expect(html).not.toContain("<h2");
    expect(html).not.toContain("button-danger");
    expect(html).not.toContain("Thao tác này xóa ngay.");
  });
});
