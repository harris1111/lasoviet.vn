import { Icon } from "../icon";
import { UiCard } from "./ui-card";

type SupportCardProps = {
  description: string;
  email: string;
  title: string;
};

export function SupportCard({
  description,
  email,
  title,
}: SupportCardProps) {
  return (
    <UiCard>
      <div className="ui-support-card">
        <div>
          <h2 className="ui-support-card__title">{title}</h2>
          <p className="ui-support-card__description">{description}</p>
        </div>
        <a className="ui-button ui-button--secondary" href={`mailto:${email}`}>
          Gửi email hỗ trợ
          <Icon name="arrow-right" />
        </a>
      </div>
    </UiCard>
  );
}
