import { customerContactConfig } from "@lasoviet/config";
import Image from "next/image";
import Link from "next/link";

type SiteFooterProps = {
  locale: "en" | "vi";
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const vi = locale === "vi";
  const policyLinks = [
    [vi ? "Điều khoản" : "Terms", "/dieu-khoan"],
    [vi ? "Quyền riêng tư" : "Privacy", "/chinh-sach-bao-mat"],
    [vi ? "Chính sách thanh toán" : "Payment policy", "/dieu-khoan#thanh-toan"],
  ] as const;

  return (
    <footer className="site-footer">
      <div className="container footer-simple-content">
        <div className="brand-logo-link">
          <Image
            alt="Lá Số Việt"
            className="brand-logo"
            height={26}
            src="/brand/lasoviet-logo-ngang-vang-son.svg"
            width={148}
          />
        </div>
        <nav
          aria-label={vi ? "Chính sách và hỗ trợ" : "Policies and support"}
          className="footer-policy-links"
        >
          {policyLinks.map(([label, href]) => (
            <Link href={route(locale, href)} key={href}>
              {label}
            </Link>
          ))}
          {customerContactConfig.email.visible && (
            <a
              className="footer-support-email"
              href={`mailto:${customerContactConfig.email.value}`}
            >
              {customerContactConfig.email.value}
            </a>
          )}
        </nav>
      </div>
      <div className="container copyright">
        © 2026 Lá Số Việt. {vi ? "Nội dung mang tính tham khảo và tự chiêm nghiệm." : "Content is for reference and personal reflection."}
      </div>
    </footer>
  );
}
