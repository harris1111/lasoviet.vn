import Link from "next/link";

export function AccountDashboard({ locale }: { locale: "en" | "vi" }) {
  const vi = locale === "vi";
  const signInPath = vi ? "/dang-nhap" : "/en/dang-nhap";

  return (
    <main className="content-page">
      <section className="content-hero container">
        <p className="eyebrow">{vi ? "Không gian riêng tư" : "Private space"}</p>
        <h1>{vi ? "Tài khoản" : "Account"}</h1>
        <p>
          {vi
            ? "Đăng nhập để tiếp tục với dữ liệu và lá số riêng tư của bạn."
            : "Sign in to continue with your private data and charts."}
        </p>
        <Link className="button" href={signInPath}>{vi ? "Đăng nhập" : "Sign in"}</Link>
      </section>
    </main>
  );
}
