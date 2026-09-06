import Image from "next/image";
import Link from "next/link";

import { Icon } from "../../components/icon";

export type BirthWizardHeaderProps = {
  locale: "en" | "vi";
  step: number;
  backLabel: string;
  exitLabel: string;
  helpLabel: string;
  stepLabel: string;
  exitDisabled?: boolean;
  onBack(): void;
  onExit(): void;
};

export function BirthWizardHeader({
  locale,
  step,
  backLabel,
  exitLabel,
  helpLabel,
  stepLabel,
  exitDisabled = false,
  onBack,
  onExit,
}: BirthWizardHeaderProps) {
  const homeHref = locale === "en" ? "/en" : "/";
  const helpHref = locale === "en" ? "/en#faq" : "/#faq";

  return (
    <header className="wizard-header">
      <button
        aria-label={backLabel}
        className="wizard-mobile-back"
        disabled={step <= 1 || exitDisabled}
        onClick={onBack}
        type="button"
      >
        <Icon name="chevron-right" />
      </button>

      <span className="wizard-mobile-step-label">{stepLabel}</span>

      <Link className="wizard-logo" href={homeHref}>
        <Image
          alt="Lá Số Việt"
          height={42}
          src="/brand/lasoviet-logo-ngang-vang-son.svg"
          width={168}
        />
      </Link>

      <div className="wizard-header-actions">
        <Link aria-label={helpLabel} href={helpHref}>
          <Icon name="help-circle" />
        </Link>
        <button
          aria-label={exitLabel}
          disabled={exitDisabled}
          onClick={onExit}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>
    </header>
  );
}

export type BirthWizardProgressProps = {
  step: number;
  ariaLabel: string;
  labels: [string, string, string];
  mobileText: string;
};

export function BirthWizardProgress({
  step,
  ariaLabel,
  labels,
  mobileText,
}: BirthWizardProgressProps) {
  const fillWidthPercent = `${(step / 3) * 100}%`;

  return (
    <>
      <ol aria-label={ariaLabel} className="wizard-steps">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isCurrent = step === stepNumber;
          const isComplete = step > stepNumber;
          const stepClass = isCurrent
            ? "current"
            : isComplete
              ? "complete"
              : undefined;
          const stepCode = `0${stepNumber}`;

          return (
            <li className={stepClass} key={label}>
              <span className="wizard-step-circle">
                {isComplete ? <Icon name="check" /> : stepCode}
              </span>
              <span className="wizard-step-label">{label}</span>
              {index < labels.length - 1 ? (
                <span aria-hidden="true" className="wizard-step-connector" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="wizard-mobile-progress">
        <span className="wizard-mobile-progress-text">{mobileText}</span>
        <div className="wizard-mobile-progress-track">
          <div
            className="wizard-mobile-progress-fill"
            style={{ width: fillWidthPercent }}
          />
        </div>
      </div>
    </>
  );
}

export type BirthWizardContextRailProps = {
  step: number;
  eyebrow: string;
  body: string;
  caption: string;
};

export function BirthWizardContextRail({
  step,
  eyebrow,
  body,
  caption,
}: BirthWizardContextRailProps) {
  return (
    <aside className="wizard-context-rail">
      <p className="eyebrow">{eyebrow}</p>
      <p className="wizard-rail-body">{body}</p>

      {step === 2 ? (
        <figure className="wizard-rail-figure">
          <Image
            alt=""
            className="wizard-rail-image"
            height={480}
            src="/images/lasoviet/the-dang-ky-noi-sinh-orthogonal-index-cards.webp"
            width={720}
          />
          <figcaption>{caption}</figcaption>
        </figure>
      ) : null}
    </aside>
  );
}