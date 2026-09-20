"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

type NumberedAccordionItem = {
  content: ReactNode;
  id: string;
  title: string;
};

type NumberedAccordionProps = {
  defaultOpenId?: string;
  items: NumberedAccordionItem[];
};

export function NumberedAccordion({
  defaultOpenId,
  items,
}: NumberedAccordionProps) {
  const [openId, setOpenId] = useState(defaultOpenId);
  const baseId = useId();

  return (
    <div className="ui-numbered-accordion">
      {items.map((item, index) => {
        const open = item.id === openId;

        return (
          <div className="ui-numbered-accordion__item" key={item.id}>
            <h3 className="ui-numbered-accordion__heading">
              <button
                aria-controls={`${baseId}-${item.id}-panel`}
                aria-expanded={open}
                className="ui-numbered-accordion__trigger"
                id={`${baseId}-${item.id}-button`}
                onClick={() => setOpenId(open ? undefined : item.id)}
                type="button"
              >
                <span className="ui-numbered-accordion__number">{String(index + 1).padStart(2, "0")}</span>
                <span>{item.title}</span>
                <span aria-hidden="true" className="ui-numbered-accordion__icon">{open ? "×" : "+"}</span>
              </button>
            </h3>
            {open ? (
              <div
                aria-labelledby={`${baseId}-${item.id}-button`}
                className="ui-numbered-accordion__panel"
                id={`${baseId}-${item.id}-panel`}
                role="region"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
