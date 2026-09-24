import { customerContactConfig } from "@lasoviet/config/customer-contact";
import Image from "next/image";

export type MessengerBubbleProps = {
  href?: string;
  locale?: "vi" | "en";
  visible?: boolean;
};

export function MessengerBubble({
  href = customerContactConfig.social.value,
  locale = "vi",
  visible = customerContactConfig.social.visible,
}: MessengerBubbleProps) {
  const trimmedHref = href.trim();
  if (!visible || !trimmedHref) {
    return null;
  }

  const isEn = locale === "en";
  const ariaLabel = isEn
    ? "Message Lá Số Việt on Messenger"
    : "Nhắn Lá Số Việt qua Messenger";
  const label = isEn ? "Message Lá Số Việt" : "Nhắn Lá Số Việt";

  return (
    <a
      aria-label={ariaLabel}
      className="msgr-bubble"
      data-testid="messenger-bubble"
      href={trimmedHref}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="label">{label}</span>
      <Image
        alt=""
        height={56}
        src="/uploads/messenger-logo-meta-ho-tro-khach-hang-lasoviet.webp"
        width={56}
      />
    </a>
  );
}
