import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountDeletionForm,
  CancelDeletionButton,
  ProfileDeleteButton,
  SignOutButton,
} from "./account-actions";

const action = vi.fn().mockResolvedValue({ ok: true });

describe("account-actions client controls", () => {
  it("renders SignOutButton with localized label", () => {
    const htmlVi = renderToStaticMarkup(
      <SignOutButton action={action} label="Đăng xuất" />,
    );
    expect(htmlVi).toContain("Đăng xuất");
    expect(htmlVi).toContain("account-signout-button");

    const htmlEn = renderToStaticMarkup(
      <SignOutButton action={action} label="Sign out" />,
    );
    expect(htmlEn).toContain("Sign out");
  });

  it("renders ProfileDeleteButton initial state with localized label", () => {
    const htmlVi = renderToStaticMarkup(
      <ProfileDeleteButton
        action={action}
        locale="vi"
        label="Xoá hồ sơ"
      />,
    );
    expect(htmlVi).toContain("Xoá hồ sơ");
    expect(htmlVi).toContain("account-btn account-btn-danger");
  });

  it("renders AccountDeletionForm initial trigger button", () => {
    const htmlVi = renderToStaticMarkup(
      <AccountDeletionForm
        action={action}
        locale="vi"
        buttonLabel="Yêu cầu xoá dữ liệu"
      />,
    );
    expect(htmlVi).toContain("Yêu cầu xoá dữ liệu");
    expect(htmlVi).toContain("account-btn account-btn-danger");
  });

  it("renders CancelDeletionButton initial state", () => {
    const htmlVi = renderToStaticMarkup(
      <CancelDeletionButton
        action={action}
        locale="vi"
        label="Huỷ yêu cầu xoá dữ liệu"
      />,
    );
    expect(htmlVi).toContain("Huỷ yêu cầu xoá dữ liệu");
  });
});
