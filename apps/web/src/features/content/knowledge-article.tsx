import type { PublicContentV1 } from "@lasoviet/contracts";

export function KnowledgeArticle({
  content,
  locale,
}: {
  content: PublicContentV1;
  locale: "en" | "vi";
}) {
  return (
    <main className="content-page">
      <article className="content-article container">
        <p className="eyebrow">{locale === "vi" ? "Kiến thức Tử Vi" : "Tu Vi knowledge"}</p>
        <h1>{content.title}</h1>
        <p className="content-summary">{content.summary}</p>
        <section>
          <h2>{locale === "vi" ? "Phạm vi bài viết" : "What this article covers"}</h2>
          <p>
            {locale === "vi"
              ? "Nội dung được biên tập để làm rõ thuật ngữ, dữ liệu và giới hạn diễn giải. Đây không phải là kết luận tuyệt đối về một cá nhân."
              : "This reviewed material clarifies terms, data, and interpretation limits. It is not an absolute conclusion about an individual."}
          </p>
        </section>
        <footer>
          <p>{locale === "vi" ? "Nguồn tham chiếu đã xem xét:" : "Reviewed references:"}</p>
          <ul>{content.sourceReferences.map((reference) => <li key={reference}>{reference}</li>)}</ul>
        </footer>
      </article>
    </main>
  );
}
