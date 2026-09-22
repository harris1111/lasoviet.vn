import { customerContactConfig } from "@lasoviet/config/customer-contact";
import { Icon } from "../icon";
import { UiCard } from "./ui-card";

export type SupportCardProps = {
  actionLabel?: string;
  description: string;
  email?: string;
  href?: string;
  subject?: string;
  title: string;
  visible?: boolean;
};

export function SupportCard({
  actionLabel = "Gửi email hỗ trợ",
  description,
  email = customerContactConfig.email.value,
  href,
  subject,
  title,
  visible = customerContactConfig.email.visible,
}: SupportCardProps) {
  if (!visible) {
    return null;
  }

  const mailtoHref =
    href ??
    (subject
      ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
      : `mailto:${email}`);

  return (
    <UiCard>
      <div className="ui-support-card">
        <div>
          <h2 className="ui-support-card__title">{title}</h2>
          <p className="ui-support-card__description">{description}</p>
        </div>
        <a className="ui-button ui-button--secondary" href={mailtoHref}>
          {actionLabel}
          <Icon name="arrow-right" />
        </a>
      </div>
    </UiCard>
  );
}
