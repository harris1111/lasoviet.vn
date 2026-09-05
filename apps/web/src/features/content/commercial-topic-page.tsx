import { productCatalog } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import Link from "next/link";

function localizedPath(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

function price(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount).replaceAll(".", ".") + " ₫";
}

export function CommercialTopicPage({
  content,
  locale,
  route,
}: {
  content: PublicContentV1;
  locale: "en" | "vi";
  route: RouteDefinitionV1;
}) {
  const offer = route.sku === undefined ? undefined : productCatalog.findSelectableOffer(route.sku);

  if (offer === undefined) {
    return (
      <main className="content-page">
        <section className="content-hero container">
          <p className="eyebrow">{locale === "vi" ? "Luận giải Tử Vi" : "Tu Vi interpretation"}</p>
          <h1>{content.title}</h1>
          <p>{content.summary}</p>
          <Link className="button" href={localizedPath(locale, "/tao-la-so/tu-vi")}>
            {locale === "vi" ? "Lập lá số miễn phí" : "Build your chart"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <section className="content-hero container">
        <p className="eyebrow">{locale === "vi" ? "Luận giải chuyên sâu" : "In-depth interpretation"}</p>
        <h1>{offer.name}</h1>
        <p>{content.summary}</p>
      </section>
      <section className="content-section container">
        <article className="commercial-offer">
          <p className="eyebrow">{offer.sku}</p>
          <h2>{price(offer.price)}</h2>
          <p>{locale === "vi" ? "Thanh toán một lần. Bắt đầu bằng lá số của bạn." : "One-time payment. Start with your own chart."}</p>
          <Link className="button" href={localizedPath(locale, "/tao-la-so/tu-vi")}>
            {locale === "vi" ? "Lập lá số để tiếp tục" : "Build a chart to continue"}
          </Link>
        </article>
      </section>
    </main>
  );
}
