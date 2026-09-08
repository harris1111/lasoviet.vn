import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { AuthPanel } from "../../../features/auth/auth-panel";
import { resolveAuthCallbackUrl } from "../../../features/auth/auth-callback-resolver";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type SignInPageProps = {
  searchParams?: Promise<{
    callbackURL?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps = {}) {
  const locale = (await getLocale()) as "en" | "vi";
  const resolvedParams = searchParams ? await searchParams : undefined;
  const callbackURL = resolveAuthCallbackUrl(resolvedParams?.callbackURL, locale);
  const forgotPasswordURL = locale === "en" ? "/en/quen-mat-khau" : "/quen-mat-khau";

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <p className="eyebrow">Lá Số Việt</p>
        <h1>{locale === "vi" ? "Đăng nhập để lưu lá số" : "Sign in to save your chart"}</h1>
        <AuthPanel callbackURL={callbackURL} forgotPasswordURL={forgotPasswordURL} />
      </div>
    </main>
  );
}
