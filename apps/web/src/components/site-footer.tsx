import { customerContactConfig } from "@lasoviet/config/customer-contact";
import Image from "next/image";
import Link from "next/link";

type SiteFooterProps = {
  locale: "en" | "vi";
};

type FooterGroup = {
  title: string;
  links: ReadonlyArray<readonly [label: string, href: string]>;
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

function footerGroups(vi: boolean): FooterGroup[] {
  return [
    {
      title: vi ? "Tử Vi" : "Zi Wei",
      links: [
        [vi ? "Lập lá số Tử Vi" : "Build a Zi Wei chart", "/tao-la-so/tu-vi"],
        [vi ? "Bản luận giải mẫu" : "Sample reading", "/bao-cao-mau/tu-vi"],
        [vi ? "Nạp Lá" : "Top up Lá", "/nap-la"],
        [vi ? "Tử Vi Đẩu Số" : "About Zi Wei", "/tu-vi"],
        [vi ? "Phương pháp" : "Method", "/phuong-phap"],
      ],
    },
    {
      title: vi ? "Bộ môn & công cụ" : "Disciplines & tools",
      links: [
        ["Bát Tự", "/bat-tu"],
        [vi ? "Chiêm Tinh" : "Astrology", "/chiem-tinh"],
        [vi ? "Kinh Dịch" : "I Ching", "/kinh-dich"],
        [vi ? "Thần Số Học" : "Numerology", "/than-so-hoc"],
        [vi ? "Công cụ miễn phí" : "Free tools", "/cong-cu-mien-phi"],
      ],
    },
    {
      title: vi ? "Kiến thức" : "Knowledge",
      links: [
        [vi ? "Thư viện kiến thức" : "Knowledge library", "/kien-thuc"],
        [vi ? "Lá số Tử Vi là gì" : "What is a Zi Wei chart", "/kien-thuc/tu-vi/la-so-tu-vi-la-gi"],
        [vi ? "Cách lập lá số" : "How a chart is built", "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi"],
        [vi ? "Cách đọc lá số" : "How to read a chart", "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi"],
        [vi ? "AI và căn cứ" : "AI and evidence", "/phuong-phap/ai-va-can-cu"],
      ],
    },
    {
      title: vi ? "Hỗ trợ & pháp lý" : "Support & legal",
      links: [
        [vi ? "Về Lá Số Việt" : "About Lá Số Việt", "/ve-la-so-viet"],
        [vi ? "Câu hỏi thường gặp" : "FAQ", "/cau-hoi-thuong-gap"],
        [vi ? "Liên hệ" : "Contact", "/lien-he"],
        [vi ? "Điều khoản" : "Terms", "/dieu-khoan"],
        [vi ? "Quyền riêng tư" : "Privacy", "/chinh-sach-bao-mat"],
        [vi ? "Chính sách thanh toán" : "Payment policy", "/dieu-khoan#thanh-toan"],
      ],
    },
  ];
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const vi = locale === "vi";

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand-logo-link">
            <Image
              alt="Lá Số Việt"
              className="brand-logo"
              height={26}
              src="/brand/lasoviet-logo-ngang-vang-son.svg"
              width={148}
            />
            <Image
              alt=""
              aria-hidden="true"
              className="brand-logo-light"
              height={26}
              src="/brand/lasoviet-logo-ngang-dao-muc.svg"
              width={148}
            />
          </div>
          <p>
            {vi
              ? "Lập lá số Tử Vi và luận giải bằng tiếng Việt dễ hiểu."
              : "Build your Zi Wei chart and read it in plain language."}
          </p>
          {customerContactConfig.email.visible && (
            <a
              className="footer-support-email"
              href={`mailto:${customerContactConfig.email.value}`}
            >
              {customerContactConfig.email.value}
            </a>
          )}
        </div>
        {footerGroups(vi).map((group) => (
          <nav aria-label={group.title} className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={route(locale, href)}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container copyright">
        © 2026 Lá Số Việt. {vi ? "Nội dung mang tính tham khảo và tự chiêm nghiệm." : "Content is for reference and personal reflection."}
      </div>
    </footer>
  );
}
