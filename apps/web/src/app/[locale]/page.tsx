import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { ArtifactImage } from "../../components/artifact-image";
import { Icon } from "../../components/icon";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

const image = (name: string) => `/images/lasoviet/${name}`;
const path = (locale: "en" | "vi", value: string) =>
  locale === "en" ? `/en${value}` : value;

export default async function Page() {
  const t = await getTranslations("common");
  const locale = (await getLocale()) as "en" | "vi";
  const commitmentKeys = ["free", "evidence", "private", "once"] as const;
  const processKeys = ["one", "two", "three"] as const;
  const processImages = [
    "lich-phap-can-chi-quy-doi-du-lieu-sinh-homepage.webp",
    "an-dinh-la-so-tu-vi-12-cung-homepage.webp",
    "chon-chu-de-luan-giai-sau-ho-so-tang-thu-homepage.webp",
  ];
  const knowledge = [
    ["chart", "cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp", "/kien-thuc/tu-vi/la-so-tu-vi-la-gi"],
    ["create", "quy-trinh-lap-la-so-tu-vi-tu-lich-phap-homepage.webp", "/kien-thuc/tu-vi"],
    ["read", "cach-doc-moi-lien-he-giua-cac-cung-la-so-tu-vi-homepage.webp", "/kien-thuc/tu-vi"],
  ] as const;

  return (
    <div className="home">
      <SiteHeader locale={locale} />
      <main>
        <section className="hero">
          <ArtifactImage alt="" className="hero-image" desktop={image("menh-thu-khai-quang-hero-lasoviet-desktop.webp")} mobile={image("menh-thu-khai-quang-hero-lasoviet-mobile.webp")} />
          <div className="container hero-content">
            <p className="eyebrow">{t("home.hero.eyebrow")}</p>
            <h1>{t("app.taglinePrefix")}<br /><span className="gold-text">{t("app.taglineHighlight")}</span></h1>
            <p className="hero-lead">{t("home.hero.lead")}</p>
            <p className="hero-copy">{t("home.hero.copy")}</p>
            <form action={path(locale, "/tao-la-so/tu-vi")} className="birth-cta" method="get">
              {(["day", "month", "year"] as const).map((name) => (
                <label key={name}>{t(`home.form.${name}`)}<input aria-label={t(`home.form.${name}`)} className={name === "year" ? "year" : undefined} inputMode="numeric" maxLength={name === "year" ? 4 : 2} name={name} placeholder={name === "year" ? "1994" : name === "day" ? "12" : "04"} /></label>
              ))}
              <label>{t("home.form.hour")}<select aria-label={t("home.form.hour")} name="hour"><option>{t("home.form.unknownHour")}</option><option>Ty (23-01)</option><option>Ngo (11-13)</option></select></label>
              <button className="button" type="submit">{t("home.form.submit")}</button>
              <Link className="button button-secondary" href="#luan-giai">{t("home.form.sample")}</Link>
              <p className="birth-note">{t("home.form.note")}</p>
            </form>
          </div>
        </section>

        <section><div className="container commitments">
          {commitmentKeys.map((key, index) => <article className="commitment" key={key}><div className="commitment-top"><Icon name={key === "free" ? "check" : key === "evidence" ? "trien" : key === "private" ? "shield-lock" : "refresh-off"} /><span>{String(index + 1).padStart(2, "0")}</span></div><h3>{t(`home.commitments.${key}.title`)}</h3><p>{t(`home.commitments.${key}.copy`)}</p></article>)}
        </div></section>

        <section className="section"><div className="container section-heading"><p className="eyebrow">{t("home.free.eyebrow")}</p><h2>{t("home.free.title")}</h2><p>{t("home.free.copy")}</p></div>
          <div className="container free-preview"><ArtifactImage alt={t("home.free.imageAlt")} className="free-image" desktop={image("la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp")} /><div className="insights">
            {[1, 2, 3].map((number) => <article className="insight" key={number}><p className="eyebrow">{t("home.free.note")} {String(number).padStart(2, "0")}</p><h3>{t(`home.free.insight${number}.title`)}</h3><p>{t(`home.free.insight${number}.copy`)}</p><button className="text-link" type="button"><span className="seal" aria-hidden="true"><span /></span>{t("home.evidence.action")}</button></article>)}
          </div></div>
        </section>

        <section className="section section-deep" id="phuong-phap"><div className="container"><p className="eyebrow">{t("home.process.eyebrow")}</p><div className="process">
          {processKeys.map((key, index) => <article className="process-item" key={key}><div className="process-number">{String(index + 1).padStart(2, "0")}</div><div><h3>{t(`home.process.${key}.title`)}</h3><p>{t(`home.process.${key}.copy`)}</p>{index === 0 ? <div className="process-meta"><span><Icon name="calendar-day" />{t("home.process.meta.calendar")}</span><span><Icon name="clock" />{t("home.process.meta.clock")}</span><span><Icon name="map-pin" />{t("home.process.meta.place")}</span></div> : null}</div><figure className="process-figure"><ArtifactImage alt={t(`home.process.${key}.title`)} desktop={image(processImages[index]!)} /><figcaption>{t(`home.process.caption${index + 1}`)}</figcaption></figure></article>)}
        </div></div></section>

        <section className="section"><div className="container evidence"><div className="section-intro"><p className="eyebrow">{t("home.evidence.eyebrow")}</p><h2>{t("home.evidence.title")}</h2><p>{t("home.evidence.copy")}</p></div><article className="evidence-card"><h3>{t("home.evidence.claim")}</h3><details><summary>{t("home.evidence.action")}</summary><dl className="evidence-list"><dt>{t("home.evidence.source")}</dt><dd>{t("home.evidence.sourceCopy")}</dd><dt>{t("home.evidence.confidence")}</dt><dd>{t("home.evidence.confidenceCopy")}</dd><dt>{t("home.evidence.observe")}</dt><dd>{t("home.evidence.observeCopy")}</dd></dl></details></article></div></section>

        <section className="section image-section" id="luan-giai"><ArtifactImage alt="" className="hero-image" desktop={image("tang-thu-chu-de-luan-giai-sau-background-homepage.webp")} /><div className="container section-overlay"><div className="section-heading"><p className="eyebrow">{t("home.topics.eyebrow")}</p><h2>{t("home.topics.title")}</h2></div><div className="topics">{(["identity", "relationships", "work", "year"] as const).map((key, index) => <article className="topic" key={key}><span className="topic-number">{["I", "II", "III", "IV"][index]}</span><h3>{t(`home.topics.${key}.title`)}</h3><span className="topic-price">{key === "year" ? "99.000 ₫" : "79.000 ₫"}</span><span className="topic-once">{t("home.topics.once")}</span><p>{t(`home.topics.${key}.copy`)} <Link href={path(locale, "/luan-giai-tu-vi/tong-quan-ban-menh")}>{t("home.topics.sample")}</Link></p></article>)}</div></div></section>

        <section className="section"><div className="container"><p className="eyebrow">{t("home.trust.eyebrow")}</p><h2>{t("home.trust.title")}</h2>{(["method", "ai", "privacy"] as const).map((key) => <article className="trust-row" key={key}><h3>{t(`home.trust.${key}.label`)}</h3><p>{t(`home.trust.${key}.copy`)}</p></article>)}</div></section>

        <section className="section section-deep" id="kien-thuc"><div className="container"><p className="eyebrow">{t("home.knowledge.eyebrow")}</p><h2>{t("home.knowledge.title")}</h2><div className="knowledge-grid">{knowledge.map(([key, asset, href]) => <Link href={path(locale, href)} key={key}><ArtifactImage alt={t(`home.knowledge.${key}.title`)} desktop={image(asset)} /><h3>{t(`home.knowledge.${key}.title`)}</h3><p>{t(`home.knowledge.${key}.copy`)}</p></Link>)}</div></div></section>

        <section className="section"><div className="container faq"><div><p className="eyebrow">{t("home.faq.eyebrow")}</p></div><div className="faq-list">{(["ai", "time", "payment", "privacy"] as const).map((key) => <details key={key}><summary>{t(`home.faq.${key}.question`)}</summary><p>{t(`home.faq.${key}.answer`)}</p></details>)}</div></div></section>

        <section className="cta"><ArtifactImage alt="" className="cta-image" desktop={image("nguong-mo-menh-thu-cta-background-lasoviet-desktop.webp")} mobile={image("nguong-mo-menh-thu-cta-background-lasoviet-mobile.webp")} /><div className="container cta-content"><h2>{t("home.cta.title")}</h2><p>{t("home.cta.copy")}</p><div className="cta-actions"><Link className="button" href={path(locale, "/tao-la-so/tu-vi")}>{t("home.form.submit")}</Link><Link className="button button-secondary" href="#luan-giai">{t("home.form.sample")}</Link></div></div></section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
