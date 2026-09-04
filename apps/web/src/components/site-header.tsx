import Image from "next/image";
import Link from "next/link";

import { Icon } from "./icon";

type SiteHeaderProps = {
  locale: "en" | "vi";
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const isVietnamese = locale === "vi";
  const links = [
    [isVietnamese ? "Lập lá số Tử Vi" : "Zi Wei Chart", "/tao-la-so/tu-vi"],
    [isVietnamese ? "Các hệ quy chiếu" : "Frameworks", "#he-quy-chieu"],
    [isVietnamese ? "Thư viện tri thức" : "Knowledge", "#kien-thuc"],
    [isVietnamese ? "Về phương pháp" : "Method", "#phuong-phap"],
  ] as const;

  return (
    <>
      <div className="marquee" aria-label={isVietnamese ? "Cam kết dịch vụ" : "Service commitments"}>
        <div className="marquee-track">
          <span>{isVietnamese ? "Lập lá số Tử Vi miễn phí - không cần tài khoản" : "Free chart creation - no account required"}</span>
          <span>{isVietnamese ? "Căn cứ có thể mở cạnh nhận định" : "Evidence can be opened beside insights"}</span>
          <span>{isVietnamese ? "Lá số của bạn riêng tư theo mặc định" : "Your chart is private by default"}</span>
          <span>{isVietnamese ? "Thanh toán một lần - không tự động gia hạn" : "One-time payment - no automatic renewal"}</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand-logo-link" href={route(locale, "/")}>
            <Image
              alt="Lá Số Việt"
              className="brand-logo"
              height={28}
              priority
              src="/brand/lasoviet-logo-ngang-vang-son.svg"
              width={160}
            />
          </Link>
          <nav className="desktop-nav" aria-label={isVietnamese ? "Điều hướng chính" : "Primary navigation"}>
            {links.map(([label, href]) => <Link href={route(locale, href)} key={href}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <a className="locale-link" href={isVietnamese ? "/en" : "/"}>{isVietnamese ? "English" : "Tiếng Việt"}</a>
            <Link className="button button-small" href={route(locale, "/tao-la-so/tu-vi")}>
              {isVietnamese ? "Lập lá số miễn phí" : "Build your chart"}
            </Link>
            <details className="mobile-menu">
              <summary aria-label={isVietnamese ? "Mở điều hướng" : "Open navigation"}><Icon name="menu" /></summary>
              <nav id="mobile-navigation" aria-label={isVietnamese ? "Điều hướng chính" : "Primary navigation"}>
                {links.map(([label, href]) => (
                  <Link href={route(locale, href)} key={href}>{label}<Icon name="chevron-right" /></Link>
                ))}
                <Link className="button" href={route(locale, "/tao-la-so/tu-vi")}>
                  {isVietnamese ? "Lập lá số miễn phí" : "Build your chart"}
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
