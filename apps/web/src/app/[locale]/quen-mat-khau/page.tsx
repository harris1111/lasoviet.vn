import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { PasswordResetRequestPanel } from "../../../features/auth/password-reset-request-panel";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PasswordResetRequestPage() {
  const locale = (await getLocale()) as "en" | "vi";
  const resetPasswordURL = locale === "en" ? "/en/dat-lai-mat-khau" : "/dat-lai-mat-khau";

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <p className="eyebrow">Lá Số Việt</p>
        <h1>{locale === "vi" ? "Đặt lại mật khẩu" : "Reset your password"}</h1>
        <PasswordResetRequestPanel resetPasswordURL={resetPasswordURL} />
      </div>
    </main>
  );
}
