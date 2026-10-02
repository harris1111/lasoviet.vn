import { describe, expect, it } from "vitest";
import { initialReadyPaths } from "../../features/theme/site-theme-bootstrap";

describe("pre-paint capability inventory", () => {
  it("includes homepage and verified private ready owners", () => {
    for (const path of ["/", "/tu-vi", "/nap-la", "/tai-khoan", "/tao-la-so/tu-vi"]) expect(initialReadyPaths).toContain(path);
  });
  it("does not authorize auth, admin, unsubscribe or an unknown route", () => {
    for (const path of ["/admin", "/dang-nhap", "/quen-mat-khau", "/dat-lai-mat-khau", "/thong-bao/huy-dang-ky", "/admin-reports"]) expect(initialReadyPaths).not.toContain(path);
  });
});
