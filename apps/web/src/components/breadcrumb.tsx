import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: readonly BreadcrumbItem[];
  locale: "vi" | "en";
};

export function Breadcrumb({ items, locale }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label={locale === "vi" ? "Đường dẫn liên kết" : "Breadcrumb"}
      className="knowledge-breadcrumb"
    >
      <ol className="knowledge-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="knowledge-breadcrumb-item">
              {item.href && !isLast ? (
                <Link href={item.href} className="knowledge-breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="knowledge-breadcrumb-current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="knowledge-breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
