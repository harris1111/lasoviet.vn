import { localizedPath } from "../homepage/homepage-utilities";
import { homepageShowcaseContent } from "./homepage-v3-showcase-content";

export function HomepageV3Showcase({ locale }: { locale: "vi" | "en" }) {
  const content = homepageShowcaseContent(locale);
  return (
    <div className="hv3-container hv3-showcase-container">
      <div className="hv3-showcase-copy">
        <p className="hv3-eyebrow">{content.eyebrow}</p>
        <h2 className="hv3-h2">{content.title}</h2>
        <p className="hv3-lead">{content.lead}</p>
        <a className="hv3-link" href={localizedPath(locale, "/bao-cao-mau/tu-vi")}>{content.sample} ↗</a>
      </div>
      <div className="hv3-showcase-art">
        <picture>
          <source media="(max-width: 699px)" srcSet="/images/lasoviet/v11/son-mai-tang-thu-quan-he-cung-homepage-mobile.webp" />
          <img src="/images/lasoviet/v11/son-mai-tang-thu-quan-he-cung-homepage-desktop.webp" alt="" width={1536} height={1024} loading="lazy" decoding="async" />
        </picture>
        {/* Exact brand artwork remains code-native; generated backgrounds contain no seal. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hv3-showcase-brand" src="/brand/lasoviet-logomark-co-nho-vang-son.svg" alt="" width={42} height={42} loading="lazy" />
        <div className="hv3-showcase-diagram" role="img" aria-label={content.diagramLabel}>
          <span className="hv3-showcase-node hv3-showcase-main">{content.diagramCenter}</span>
          {content.diagramRelated.map((label, index) => (
            <span key={label} className={`hv3-showcase-node hv3-showcase-related hv3-showcase-related-${index + 1}`}>{label}</span>
          ))}
          <svg aria-hidden="true" focusable="false" viewBox="0 0 400 300" preserveAspectRatio="none">
            <path d="M200 145 L91 53 M200 145 L309 53 M200 145 L200 256" />
          </svg>
        </div>
      </div>
      <ol className="hv3-showcase-steps">
        {content.proof.map((item) => (
          <li key={item.number}>
            <span className="hv3-showcase-number">{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        ))}
      </ol>
      <details className="hv3-showcase-note">
        <summary>{content.expand}</summary>
        <p>{content.explanation}</p>
      </details>
    </div>
  );
}
