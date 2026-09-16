"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type UiTab = {
  content: ReactNode;
  id: string;
  label: string;
};

type SegmentedTabsProps = {
  defaultTabId: string;
  tabs: UiTab[];
};

export function SegmentedTabs({ defaultTabId, tabs }: SegmentedTabsProps) {
  const [selectedId, setSelectedId] = useState(defaultTabId);
  const baseId = useId();
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === selectedId));
  const selectedTab = tabs[selectedIndex];

  if (selectedTab === undefined) return null;

  function selectAt(index: number) {
    const tab = tabs[index];
    if (tab !== undefined) setSelectedId(tab.id);
  }

  return (
    <div>
      <div aria-label="Lựa chọn nội dung" className="ui-segmented-tabs" role="tablist">
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedTab.id;

          return (
            <button
              aria-controls={`${baseId}-${tab.id}-panel`}
              aria-selected={selected}
              className="ui-segmented-tabs__tab"
              id={`${baseId}-${tab.id}-tab`}
              key={tab.id}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  selectAt((index + 1) % tabs.length);
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  selectAt((index - 1 + tabs.length) % tabs.length);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  selectAt(0);
                }
                if (event.key === "End") {
                  event.preventDefault();
                  selectAt(tabs.length - 1);
                }
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${baseId}-${selectedTab.id}-tab`}
        className="ui-tab-panel"
        id={`${baseId}-${selectedTab.id}-panel`}
        role="tabpanel"
      >
        {selectedTab.content}
      </div>
    </div>
  );
}
