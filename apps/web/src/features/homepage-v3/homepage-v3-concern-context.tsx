"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { readBirthProfileDraft } from "../birth-profile/birth-profile-draft";
import { HOMEPAGE_V3_INTERESTS, type HomepageV3Interest } from "./homepage-v3-birth-profile";
import type { NEEDS } from "./homepage-v3-data";

export type HomepageV3ConcernContextValue = {
  topConcern: HomepageV3Interest | null;
  setTopConcern(value: HomepageV3Interest): void;
};

const HomepageV3ConcernContext = createContext<HomepageV3ConcernContextValue | null>(null);

/**
 * Page-scoped "which palace is the visitor here for" state, shared by the needs cards and
 * the hero form. Optional by design: components read it via `useHomepageV3Concern()`, which
 * returns null outside a provider, so the shared `/` homepage (no provider mounted) keeps its
 * prior behavior untouched (2026-10-01 audit, F2 — selecting a need on Trời Nam never reached
 * the birth draft because nothing carried it from the needs section to the form).
 */
export function HomepageV3ConcernProvider({ children }: { children: ReactNode }) {
  const [topConcern, setTopConcernState] = useState<HomepageV3Interest | null>(null);
  // An explicit click must win over a slightly-later restore-from-draft effect, even though
  // in practice the restore effect below resolves essentially immediately on mount.
  const explicitRef = useRef(false);

  useEffect(() => {
    const draft = readBirthProfileDraft();
    const restored = draft?.readingContext?.topConcern;
    if (restored && (HOMEPAGE_V3_INTERESTS as readonly string[]).includes(restored) && !explicitRef.current) {
      setTopConcernState(restored as HomepageV3Interest);
    }
  }, []);

  function setTopConcern(value: HomepageV3Interest) {
    explicitRef.current = true;
    setTopConcernState(value);
  }

  return (
    <HomepageV3ConcernContext.Provider value={{ topConcern, setTopConcern }}>
      {children}
    </HomepageV3ConcernContext.Provider>
  );
}

/** Null outside a provider — callers must treat that the same as "no concern chosen". */
export function useHomepageV3Concern(): HomepageV3ConcernContextValue | null {
  return useContext(HomepageV3ConcernContext);
}

type NeedId = (typeof NEEDS)[number]["id"];

/** Pinned need -> wizard concern mapping (spec "Experience decisions" #3). `decision` stays
 * outside the Tử Vi concern system entirely — it links straight to /kinh-dich. */
export function concernForNeed(id: NeedId): HomepageV3Interest | null {
  switch (id) {
    case "self":
      return "self_understanding";
    case "work":
      return "career";
    case "love":
      return "love";
    case "decision":
      return null;
    default:
      return null;
  }
}
