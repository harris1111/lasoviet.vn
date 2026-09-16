import type { HTMLAttributes, ReactNode } from "react";

type UiCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  highlighted?: boolean;
};

export function UiCard({
  children,
  className,
  highlighted = false,
  ...props
}: UiCardProps) {
  const classes = [
    "ui-card",
    highlighted ? "ui-card--highlighted" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <section className={classes} {...props}>
      <div className="ui-card__body">{children}</div>
    </section>
  );
}
