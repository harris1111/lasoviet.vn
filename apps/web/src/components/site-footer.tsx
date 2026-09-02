import Link from "next/link";

type SiteFooterProps = {
  locale: "en" | "vi";
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const vi = locale === "vi";
  const sections = [
    [vi ? "Sản phẩm" : "Product", [[vi ? "Lập lá số Tử Vi" : "Build a chart", "/tao-la-so/tu-vi"], [vi ? "Luận giải Tử Vi" : "Interpretations", "/luan-giai-tu-vi/tong-quan-ban-menh"]]],
    [vi ? "Kiến thức" : "Knowledge", [[vi ? "Lá số Tử Vi là gì?" : "What is a chart?", "/kien-thuc/tu-vi/la-so-tu-vi-la-gi"], [vi ? "Cách lập lá số" : "How charts are created", "/kien-thuc/tu-vi"]]],
    [vi ? "Công ty & pháp lý" : "Company & legal", [[vi ? "Phương pháp & niềm tin" : "Method & trust", "/phuong-phap"], [vi ? "Quyền riêng tư" : "Privacy", "/tai-khoan"]]],
  ] as const;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="seal" aria-hidden="true"><span /></span><span>Lá Số Việt</span></div>
          <p>{vi ? "Lá Số Việt - Thư viện tri thức Việt đương đại - một bàn đọc riêng tư dành cho từng người." : "A contemporary Vietnamese knowledge library and a private reading desk for each person."}</p>
        </div>
        {sections.map(([title, links]) => (
          <section key={title}>
            <h2>{title}</h2>
            {links.map(([label, href]) => <Link href={route(locale, href)} key={href}>{label}</Link>)}
          </section>
        ))}
      </div>
      <div className="container copyright">© 2026 Lá Số Việt. {vi ? "Nội dung mang tính tham khảo và tự chiêm nghiệm." : "Content is for reference and personal reflection."}</div>
    </footer>
  );
}
