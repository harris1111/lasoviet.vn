import Image from "next/image";
import Link from "next/link";

export type KnowledgeCardVariant = "standard" | "featured" | "compact";

export type KnowledgeCardProps = {
  href: string;
  image: string;
  title: string;
  summary: string;
  category?: string;
  date?: string;
  byline?: string;
  variant?: KnowledgeCardVariant;
  priority?: boolean;
  itemNumber?: number;
  locale?: "vi" | "en";
};

export function KnowledgeCard({
  href,
  image,
  title,
  summary,
  category,
  date,
  byline = "Lá Số Việt biên tập",
  variant = "standard",
  priority = false,
  itemNumber,
  locale = "vi",
}: KnowledgeCardProps) {
  if (variant === "compact") {
    return (
      <article className="knowledge-compact-item">
        <Link href={href} className="knowledge-compact-link">
          {itemNumber !== undefined && (
            <span className="knowledge-compact-num" aria-hidden="true">
              {String(itemNumber).padStart(2, "0")}
            </span>
          )}
          <div className="knowledge-compact-content">
            {category && <span className="knowledge-card-tag">{category}</span>}
            <h4 className="knowledge-compact-title">{title}</h4>
            <p className="knowledge-compact-copy">{summary}</p>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="knowledge-featured-card">
        <Link href={href} className="knowledge-featured-link">
          <figure className="knowledge-featured-figure">
            <Image
              src={image}
              alt={title}
              width={768}
              height={432}
              priority={priority}
              className="knowledge-featured-img"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
            />
          </figure>
          <div className="knowledge-featured-body">
            <div className="knowledge-featured-tags">
              {category && <span className="knowledge-card-tag">{category}</span>}
              <span className="knowledge-card-badge">
                {locale === "vi" ? "Bài nổi bật" : "Featured"}
              </span>
            </div>
            <h3 className="knowledge-featured-title">{title}</h3>
            <p className="knowledge-featured-copy">{summary}</p>
            <div className="knowledge-card-meta">
              <span className="knowledge-card-byline">{byline}</span>
              {date && <time className="knowledge-card-date">{date}</time>}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // Standard 3-column card
  return (
    <article className="knowledge-standard-card">
      <Link href={href} className="knowledge-card-link">
        <figure className="knowledge-card-figure">
          <Image
            src={image}
            alt={title}
            width={480}
            height={270}
            priority={priority}
            className="knowledge-card-img"
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 380px"
          />
        </figure>
        <div className="knowledge-card-body">
          {category && <span className="knowledge-card-tag">{category}</span>}
          <h3 className="knowledge-card-title">{title}</h3>
          <p className="knowledge-card-copy">{summary}</p>
          <div className="knowledge-card-meta">
            <span className="knowledge-card-byline">{byline}</span>
            {date && <time className="knowledge-card-date">{date}</time>}
          </div>
        </div>
      </Link>
    </article>
  );
}
