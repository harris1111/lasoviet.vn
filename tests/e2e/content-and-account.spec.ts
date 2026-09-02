import { expect, test } from "@playwright/test";

async function useVietnamese(page: import("@playwright/test").Page) {
  await page.context().addCookies([{
    name: "NEXT_LOCALE",
    value: "vi",
    domain: "127.0.0.1",
    path: "/",
  }]);
}

test("renders reviewed public content and honest private shells", async ({ page }) => {
  await useVietnamese(page);

  await page.goto("/la-so-tu-vi");
  await expect(page.getByRole("heading", { name: "Lập lá số Tử Vi" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Lập lá số miễn phí" })).toHaveAttribute(
    "href",
    "/tao-la-so/tu-vi",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://lasoviet.vn/la-so-tu-vi",
  );

  await page.goto("/luan-giai-tu-vi/tong-quan-ban-menh");
  await expect(page.getByRole("heading", { name: "Bản mệnh & tiềm năng" })).toBeVisible();
  await expect(page.getByText("79.000 ₫")).toBeVisible();
  await expect(page.getByText("Tình duyên & hôn nhân")).toHaveCount(0);

  await page.goto("/kien-thuc/tu-vi");
  await expect(page.getByRole("heading", { name: "Kiến thức Tử Vi" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Lá số Tử Vi là gì?" })).toBeVisible();

  await page.goto("/kien-thuc/tu-vi/la-so-tu-vi-la-gi");
  await expect(page.getByRole("heading", { name: "Lá số Tử Vi là gì?" })).toBeVisible();

  await page.goto("/tai-khoan");
  await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
  await expect(page.getByText("Đăng nhập để tiếp tục")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow/,
  );

  await page.goto("/bao-cao/not-persisted");
  await expect(page.getByRole("heading", { name: "Báo cáo chưa khả dụng" })).toBeVisible();
  await expect(page.getByText("Không có báo cáo đã lưu cho đường dẫn này.")).toBeVisible();
});
