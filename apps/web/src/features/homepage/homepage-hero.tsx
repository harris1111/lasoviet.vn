"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { BirthDetailsFields } from "../birth-profile/birth-details-fields";
import type { BirthTimeState } from "../birth-profile/birth-profile-input";
import { validateWizardDate } from "../birth-profile/birth-wizard-state";
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
import {
  bindDraftPagehideFlush,
  clearBirthProfileDraft,
  createDraftAutosaveController,
  isMeaningfulHomepageDraft,
  readBirthProfileDraft,
  saveHomepageDraft,
  type DraftAutosaveController,
  type HomepageDraftInput,
} from "../birth-profile/birth-profile-draft";
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
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [hasReusedCache, setHasReusedCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHydratedRef = useRef(false);
  const autosaveRef = useRef<DraftAutosaveController<HomepageDraftInput> | null>(
    null,
  );
  if (autosaveRef.current === null) {
    autosaveRef.current = createDraftAutosaveController({
      save: saveHomepageDraft,
      clear: clearBirthProfileDraft,
      isMeaningful: isMeaningfulHomepageDraft,
    });
  }

  useEffect(() => {
    let active = true;
    const draft = readBirthProfileDraft();
    if (
      draft &&
      (draft.day ||
        draft.month ||
        draft.year ||
        draft.timeState.precision === "unknown" ||
        draft.timeState.precision === "branch_only" ||
        (draft.timeState.precision === "exact_minute" &&
          Boolean(draft.timeState.hour || draft.timeState.minute)))
    ) {
      queueMicrotask(() => {
        if (!active) return;
        setDay(draft.day);
        setMonth(draft.month);
        setYear(draft.year);
        if (draft.calendarType) {
          setCalendarType(draft.calendarType);
        }
        if (draft.timeState.precision === "exact_minute") {
          setTimeMode("exact_minute");
          setHour(draft.timeState.hour);
          setMinute(draft.timeState.minute);
        } else if (draft.timeState.precision === "branch_only") {
          setTimeMode("branch_only");
          setBranch(draft.timeState.branch);
        } else {
          setTimeMode("unknown");
        }
        setHasReusedCache(true);
        isHydratedRef.current = true;
      });
      return () => {
        active = false;
      };
    }

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
        isHydratedRef.current = true;
      });
    } else {
      isHydratedRef.current = true;
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    autosaveRef.current?.schedule({
      day,
      month,
      year,
      timeMode,
      hour,
      minute,
      branch,
    });
  }, [day, month, year, timeMode, hour, minute, branch]);

  useEffect(() => {
    const controller = autosaveRef.current;
    if (!controller) return;
    const unbindPagehide = bindDraftPagehideFlush(controller, window);
    return () => {
      unbindPagehide();
      controller.dispose();
    };
  }, []);

  function handleClearCache() {
    autosaveRef.current?.cancelAndClear();
    clearBirthCache();
    setDay("");
    setMonth("");
    setYear("");
    setHour("");
    setMinute("");
    setBranch("");
    setTimeMode("branch_only");
    setCalendarType("solar");
    setHasReusedCache(false);
  }


  const timeState: BirthTimeState =
    timeMode === "exact_minute"
      ? { precision: "exact_minute", hour, minute }
      : timeMode === "branch_only" && isCanonicalBranchId(branch)
        ? { precision: "branch_only", branch }
        : timeMode === "unknown"
          ? { precision: "unknown" }
          : { precision: "branch_only", branch: "zi" };

  function handleTimeStateChange(newTimeState: BirthTimeState) {
    if (newTimeState.precision === "exact_minute") {
      setTimeMode("exact_minute");
      setHour(newTimeState.hour);
      setMinute(newTimeState.minute);
    } else if (newTimeState.precision === "branch_only") {
      setTimeMode("branch_only");
      setBranch(newTimeState.branch);
    } else {
      setTimeMode("unknown");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = validateWizardDate(day, month, year, undefined, calendarType);
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
            <BirthDetailsFields
              calendarLabel={tProfile("birth.calendarType")}
              calendarType={calendarType}
              day={day}
              dayLabel={t("home.form.day")}
              locale={locale}
              lunarLabel={tProfile("birth.lunar")}
              month={month}
              monthLabel={t("home.form.month")}
              onCalendarTypeChange={setCalendarType}
              onDayChange={(val) => {
                setDay(val);
                if (error) setError(null);
              }}
              onMonthChange={(val) => {
                setMonth(val);
                if (error) setError(null);
              }}
              onTimeStateChange={handleTimeStateChange}
              onYearChange={(val) => {
                setYear(val);
                if (error) setError(null);
              }}
              solarLabel={tProfile("birth.solar")}
              timeLabels={{
                hour: tProfile("birth.hour"),
                minute: tProfile("birth.minute"),
                title: t("home.form.hour"),
                unknown: tProfile("birth.unknown"),
                unknownHelp: tProfile("birth.unknownHelp"),
                exactMode: tProfile("birth.exactMode"),
                branchMode: tProfile("birth.branchMode"),
                branch: tProfile("birth.branch"),
                branchHelp: tProfile("birth.branchHelp"),
              }}
              timeState={timeState}
              variant="hero"
              year={year}
              yearLabel={t("home.form.year")}
            />

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
