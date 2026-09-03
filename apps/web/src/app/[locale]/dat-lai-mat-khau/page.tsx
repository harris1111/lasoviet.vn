import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { PasswordResetForm } from "../../../features/auth/password-reset-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PasswordResetPageProps = {
  searchParams: Promise<{
    error?: string;
    token?: string;
  }>;
};

export default async function PasswordResetPage({
  searchParams,
}: PasswordResetPageProps) {
  const locale = (await getLocale()) as "en" | "vi";
  const params = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <p className="eyebrow">Lá Số Việt</p>
        <h1>{locale === "vi" ? "Chọn mật khẩu mới" : "Choose a new password"}</h1>
        <PasswordResetForm invalidToken={params.error === "INVALID_TOKEN"} token={params.token} />
      </div>
    </main>
  );
}
