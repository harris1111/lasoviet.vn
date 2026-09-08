"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { BirthDateFields } from "../birth-profile/birth-date-fields";
import {
  clearBirthCache,
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
  isCanonicalBranchId,
  parseAndValidateDateParts,
  readBirthCache,
  saveHomepageBirthPrefill,
  type ReusableBirthTime,
} from "../birth-profile/homepage-birth-prefill";
import { splitIsoDateToParts } from "../birth-profile/birth-wizard-state";
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
  const [timeMode, setTimeMode] = useState<"branch_only" | "exact_minute" | "unknown">("branch_only");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [branch, setBranch] = useState("");
  const [hasReusedCache, setHasReusedCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const cached = readBirthCache();
    if (cached) {
      queueMicrotask(() => {
        if (!active) return;
        const parts = splitIsoDateToParts(cached.date);
        setDay(parts.day);
        setMonth(parts.month);
        setYear(parts.year);
        if (cached.time.precision === "exact_minute") {
          setTimeMode("exact_minute");
          setHour(cached.time.hour);
          setMinute(cached.time.minute);
        } else if (cached.time.precision === "branch_only") {
          setTimeMode("branch_only");
          setBranch(cached.time.branch);
        } else if (cached.time.precision === "unknown") {
          setTimeMode("unknown");
        }
        setHasReusedCache(true);
      });
    }
    return () => {
      active = false;
    };
  }, []);

  function handleClearCache() {
    clearBirthCache();
    setDay("");
    setMonth("");
    setYear("");
    setHour("");
    setMinute("");
    setBranch("");
    setTimeMode("branch_only");
    setHasReusedCache(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseAndValidateDateParts(day, month, year);
    if (!parsed.valid) {
      setError(tProfile("heroForm.invalidDate"));
      return;
    }

    let timePayload: ReusableBirthTime;
    if (timeMode === "exact_minute") {
      const hTrim = hour.trim();
      const mTrim = minute.trim();
      if (!/^\d{1,2}$/.test(hTrim) || !/^\d{1,2}$/.test(mTrim)) {
        setError(locale === "en" ? "Please enter valid hour and minute." : "Vui lòng nhập giờ và phút hợp lệ.");
        return;
      }
      const h = Number.parseInt(hTrim, 10);
      const m = Number.parseInt(mTrim, 10);
      if (h < 0 || h > 23 || m < 0 || m > 59) {
        setError(locale === "en" ? "Hour must be 0-23 and minute 0-59." : "Giờ từ 00-23 và phút từ 00-59.");
        return;
      }
      timePayload = {
        precision: "exact_minute",
        hour: hTrim.padStart(2, "0"),
        minute: mTrim.padStart(2, "0"),
      };
    } else if (timeMode === "branch_only") {
      timePayload =
        branch !== "" && isCanonicalBranchId(branch)
          ? { precision: "branch_only", branch }
          : { precision: "unknown" };
    } else {
      timePayload = { precision: "unknown" };
    }

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
          {t("app.taglinePrefix")}{" "}
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
          {hasReusedCache ? (
            <div className="hero-cache-notice">
              <span>{locale === "en" ? "Prefilled from saved birth details." : "Đã điền từ thông tin sinh đã lưu."}</span>
              <button
                className="hero-cache-clear"
                onClick={handleClearCache}
                type="button"
              >
                {locale === "en" ? "Clear saved info" : "Xóa thông tin đã lưu"}
              </button>
            </div>
          ) : null}

          <div className="hero-form-inputs">
            <BirthDateFields
              calendarButtonLabel={locale === "en" ? "Select date from calendar" : "Chọn ngày từ lịch"}
              className="hero-birth-date-wrap"
              day={day}
              dayLabel={t("home.form.day")}
              dayPlaceholder="12"
              locale={locale}
              month={month}
              monthLabel={t("home.form.month")}
              monthPlaceholder="04"
              onDayChange={(val) => {
                setDay(val);
                if (error) setError(null);
              }}
              onMonthChange={(val) => {
                setMonth(val);
                if (error) setError(null);
              }}
              onYearChange={(val) => {
                setYear(val);
                if (error) setError(null);
              }}
              year={year}
              yearLabel={t("home.form.year")}
              yearPlaceholder="1994"
            />

            <div className="hero-time-section">
              <div aria-label={t("home.form.hour")} className="hero-time-modes" role="group">
                <button
                  aria-pressed={timeMode === "branch_only"}
                  className={`hero-mode-btn${timeMode === "branch_only" ? " is-active" : ""}`}
                  onClick={() => setTimeMode("branch_only")}
                  type="button"
                >
                  {locale === "en" ? "12 Branches" : "12 Địa Chi"}
                </button>
                <button
                  aria-pressed={timeMode === "exact_minute"}
                  className={`hero-mode-btn${timeMode === "exact_minute" ? " is-active" : ""}`}
                  onClick={() => setTimeMode("exact_minute")}
                  type="button"
                >
                  {locale === "en" ? "Exact time" : "Giờ & phút"}
                </button>
                <button
                  aria-pressed={timeMode === "unknown"}
                  className={`hero-mode-btn${timeMode === "unknown" ? " is-active" : ""}`}
                  onClick={() => setTimeMode("unknown")}
                  type="button"
                >
                  {t("home.form.unknownHour")}
                </button>
              </div>

              {timeMode === "branch_only" ? (
                <label className="hero-form-time">
                  <span className="sr-only">{t("home.form.hour")}</span>
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
              ) : null}

              {timeMode === "exact_minute" ? (
                <div className="hero-exact-time">
                  <label className="hero-exact-input-wrap">
                    <span className="sr-only">{locale === "en" ? "Hour" : "Giờ"}</span>
                    <input
                      aria-label={locale === "en" ? "Hour" : "Giờ"}
                      className="hero-time-input"
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(e) => {
                        setHour(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="09"
                      type="text"
                      value={hour}
                    />
                  </label>
                  <span aria-hidden="true" className="hero-time-colon">:</span>
                  <label className="hero-exact-input-wrap">
                    <span className="sr-only">{locale === "en" ? "Minute" : "Phút"}</span>
                    <input
                      aria-label={locale === "en" ? "Minute" : "Phút"}
                      className="hero-time-input"
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(e) => {
                        setMinute(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="30"
                      type="text"
                      value={minute}
                    />
                  </label>
                </div>
              ) : null}

              {timeMode === "unknown" ? (
                <div className="hero-unknown-indicator">
                  <span>{locale === "en" ? "Birth time unknown" : "Chưa rõ giờ sinh"}</span>
                </div>
              ) : null}
            </div>

            <button className="button" type="submit">
              {t("home.hero.ctaPrimary")}
            </button>
            <Link className="button button-secondary" href={localizedPath(locale, "/bao-cao-mau/tu-vi")}>
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
            <span className="hero-meta-route">{t("home.hero.metaRoute")}</span>
            <span className="hero-meta-detail">{t("home.hero.metaDetail")}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
