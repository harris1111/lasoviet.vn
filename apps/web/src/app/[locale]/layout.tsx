import {
  Be_Vietnam_Pro,
  JetBrains_Mono,
  Source_Serif_4,
} from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { routing } from "../../i18n/routing";
import { AnalyticsCollector } from "../../features/analytics/analytics-collector";
import { MessengerBubble } from "../../components/ui/messenger-bubble";
import { PendingUnlockBanner } from "../../features/commerce/pending-unlock-banner";
import { WelcomeGrantNotice } from "../../features/commerce/welcome-grant-notice";
import { GuaranteeNoticeProvider } from "../../features/reports/guarantee-notice-provider";
import "../../styles/global.css";
import "../../styles/free-result-read-first.css";
import "../../styles/contextual-unlock.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-be-vietnam-pro",
});

const sourceSerif4 = Source_Serif_4({
  axes: ["opsz"],
  subsets: ["vietnamese"],
  style: ["normal", "italic"],
  weight: "variable",
  variable: "--font-source-serif-4",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["vietnamese"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      className={`${beVietnamPro.variable} ${sourceSerif4.variable} ${jetBrainsMono.variable}`}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          // Hotfix (2026-10-02, FD-102/FD-110): a saved "light" preference must
          // never paint a route that has no light styling — it must render dark
          // and the preference itself must be left untouched so it still applies
          // once the visitor reaches a light-ready route. The previous version of
          // this script applied the saved/OS theme unconditionally on every route;
          // tokens.css/global.css/homepage-v3.css then half-flipped three separate
          // light layers on top of unconverted dark markup (docs/qa/2026-10-02-
          // homepage-light-theme-handoff.md §3.1).
          //
          // This inline heuristic cannot read the DOM before <body> is parsed, so
          // it cannot see each page's real `data-light-ready` marker yet. It uses
          // a hand-checked blocklist of the routes confirmed to render WITHOUT
          // that marker today (grep across apps/web/src/app/[locale], 2026-10-02):
          // the homepage, /admin, /dang-nhap, /quen-mat-khau, /dat-lai-mat-khau.
          // Every other route (discipline pages, /la-so/[chartId], /tai-khoan,
          // /nap-la, /tao-la-so/tu-vi, /thanh-toan/[orderId], the public-content
          // catch-all) already renders `data-light-ready` today, so it is safe to
          // resolve the real theme for them before paint. `sync()` re-checks the
          // actual DOM marker once the document is parsed (and again on any later
          // `data-light-ready` mutation) and is the authority of last resort if
          // this list ever drifts from the code — it will force dark even for an
          // unlisted non-ready route, just one tick later than ideal.
          //
          // Adding a new top-level non-ready route? Add its pathname here too, or
          // give it `data-light-ready` once its light styling exists. This whole
          // blocklist goes away in the Task 07 single theme controller, which
          // reads a real server-supplied route capability map instead of guessing.
          //
          // Also drops the stale V10 hero preload: the Trời Nam hero
          // (troi-nam-hero.tsx) already renders with fetchPriority="high" and is
          // a different image than the old V10 plate this used to preload.
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var root=document.documentElement;function preferred(){var t;try{t=localStorage.getItem(\"lasoviet:theme\");}catch(e){}return t===\"light\"||t===\"dark\"?t:window.matchMedia&&window.matchMedia(\"(prefers-color-scheme: light)\").matches?\"light\":\"dark\";}var p=location.pathname.replace(/^\\/(vi|en)(?=\\/|$)/,\"\")||\"/\";var NOT_READY=[\"/\",\"/admin\",\"/dang-nhap\",\"/quen-mat-khau\",\"/dat-lai-mat-khau\"];var notReady=NOT_READY.indexOf(p)!==-1||NOT_READY.some(function(r){return r!==\"/\"&&(p===r||p.indexOf(r+\"/\")===0);});root.dataset.theme=notReady?\"dark\":preferred();function sync(){var next=document.querySelector(\"[data-light-ready]\")?preferred():\"dark\";if(root.dataset.theme!==next)root.dataset.theme=next;}new MutationObserver(sync).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:[\"data-light-ready\"]});document.addEventListener(\"DOMContentLoaded\",sync,{once:true});})();",
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <GuaranteeNoticeProvider locale={locale as "vi" | "en"}>
          <AnalyticsCollector />
          <PendingUnlockBanner locale={locale as "vi" | "en"} />
          {children}
          <MessengerBubble locale={locale as "vi" | "en"} />
          <WelcomeGrantNotice locale={locale as "vi" | "en"} />
          </GuaranteeNoticeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
