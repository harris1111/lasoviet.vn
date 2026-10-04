"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "../../auth/auth-client";
import { CANONICAL_TAB_PALACE_IDS } from "../ziwei/ziwei-tabs-state";
import { ziweiPresentation } from "../ziwei/ziwei-presentation";
import { GuaranteeNoticeContext, type GuaranteeNotice } from "./guarantee-notice-context";

// Keep the approved result outside the reader that loses access after refund.
// Never persist it; a delayed response remains scoped to its initiating actor.
export function GuaranteeNoticeProvider({ children, locale }: { children: ReactNode; locale: "vi" | "en" }) {
  const t = useTranslations("reports.feedback");
  const session = authClient.useSession();
  const user = session.data?.user;
  const ownerId = !session.isPending && user?.emailVerified && (user as { isAnonymous?: boolean }).isAnonymous !== true ? user.id : undefined;
  const currentOwner = useRef(ownerId);
  useLayoutEffect(() => { currentOwner.current = ownerId; }, [ownerId]);
  const [notice, setNotice] = useState<(GuaranteeNotice & { ownerId: string })>();
  const visible = notice && notice.ownerId === ownerId ? notice : undefined;
  const palace = CANONICAL_TAB_PALACE_IDS.find(id => `ziwei.palace.${id}` === visible?.relatedPalaceId);
  useEffect(() => {
    if (session.isPending) return;
    let active = true;
    queueMicrotask(() => { if (active) setNotice(current => current?.ownerId === ownerId ? current : undefined); });
    return () => { active = false; };
  }, [ownerId, session.isPending, notice?.ownerId]);
  return <GuaranteeNoticeContext.Provider value={{
    canReceiveResult: Boolean(ownerId),
    showApproved: result => { if (ownerId && currentOwner.current === ownerId) setNotice({ ...result, ownerId }); },
  }}>
    {children}
    {visible && <aside className="guarantee-result-notice" data-testid="guarantee-result-notice" data-print-hidden>
      <p role="status" aria-live="polite">{t("restored", { amount: visible.amountLaRestored })}</p>
      {palace && <a onClick={() => setNotice(undefined)} href={`${locale === "en" ? "/en" : ""}/la-so/${encodeURIComponent(visible.chartId)}?tab=palaces&open=${encodeURIComponent(palace)}`}>{t("related", { palace: ziweiPresentation(locale, { strict: false }).palace(`ziwei.palace.${palace}`) })}</a>}
      <button type="button" onClick={() => setNotice(undefined)}>{t("dismiss")}</button>
    </aside>}
  </GuaranteeNoticeContext.Provider>;
}
