import { getLocale } from "next-intl/server";

import { AuthPanel } from "../../../features/auth/auth-panel";

export default async function SignInPage() {
  const locale = (await getLocale()) as "en" | "vi";
  const callbackURL = locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <p className="eyebrow">Lá Số Việt</p>
        <h1>{locale === "vi" ? "Đăng nhập để lưu lá số" : "Sign in to save your chart"}</h1>
        <AuthPanel callbackURL={callbackURL} />
      </div>
    </main>
  );
}
