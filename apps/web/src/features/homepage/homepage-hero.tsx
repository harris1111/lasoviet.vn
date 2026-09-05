"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import {
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
  isCanonicalBranchId,
  parseAndValidateDateParts,
  saveHomepageBirthPrefill,
} from "../birth-profile/homepage-birth-prefill";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageHeroProps = {
  locale: "en" | "vi";
};

export function HomepageHero({ locale }: HomepageHeroProps) {
  const t = useTranslations("common");
  const tProfile = useTranslations("profile");
  const router = useRouter();

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseAndValidateDateParts(day, month, year);
    if (!parsed.valid) {
      setError(tProfile("heroForm.invalidDate"));
      return;
    }

    const timePayload =
      branch !== "" && isCanonicalBranchId(branch)
        ? ({ precision: "branch_only" as const, branch } as const)
        : ({ precision: "unknown" as const } as const);

    const saved = saveHomepageBirthPrefill({
      date: parsed.isoDate,
      time: timePayload,
    });

    if (!saved) {
      setError(tProfile("heroForm.storageError"));
      return;
    }

    router.push(localizedPath(locale, "/tao-la-so/tu-vi"));
  }

  return (
    <div className="hero-inner">
      <ArtifactImage
        alt=""
        className="hero-image"
        desktop={imagePath("menh-thu-khai-quang-hero-lasoviet-desktop.webp")}
        mobile={imagePath("menh-thu-khai-quang-hero-lasoviet-mobile.webp")}
      />
      <div className="container hero-content">
        <p className="eyebrow">{t("home.hero.eyebrow")}</p>
        <h1>
          {t("app.taglinePrefix")}
          <br />
          <span className="gold-text">{t("app.taglineHighlight")}</span>
        </h1>
        <p className="hero-lead">{t("home.hero.lead")}</p>
        <p className="hero-copy">{t("home.hero.copy")}</p>

        <form
          className="birth-cta"
          id="hero-form"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="hero-form-inputs">
            <label>
              <span>{t("home.form.day")}</span>
              <input
                aria-label={t("home.form.day")}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => {
                  setDay(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="12"
                type="text"
                value={day}
              />
            </label>
            <label>
              <span>{t("home.form.month")}</span>
              <input
                aria-label={t("home.form.month")}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => {
                  setMonth(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="04"
                type="text"
                value={month}
              />
            </label>
            <label>
              <span>{t("home.form.year")}</span>
              <input
                aria-label={t("home.form.year")}
                className="year"
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => {
                  setYear(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="1994"
                type="text"
                value={year}
              />
            </label>
            <label className="hero-form-time">
              <span>{t("home.form.hour")}</span>
              <select
                aria-label={t("home.form.hour")}
                onChange={(event) => setBranch(event.target.value)}
                value={branch}
              >
                <option value="">{t("home.form.unknownHour")}</option>
                {CANONICAL_BRANCH_IDS.map((id) => (
                  <option key={id} value={id}>
                    {getBranchOptionLabel(id, locale)}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">
              {t("home.hero.ctaPrimary")}
            </button>
            <Link className="button button-secondary" href="#luan-giai">
              {t("home.hero.ctaSecondary")}
            </Link>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="hero-form-meta">
            <p className="birth-note">{t("home.hero.microcopy")}</p>
          </div>
        </form>
      </div>
    </div>
  );
}
