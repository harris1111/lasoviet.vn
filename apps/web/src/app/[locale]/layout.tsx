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
import "../../styles/global.css";

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
          // Applies the saved theme before first paint; preloads only the active hero image (FD-102).
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("lasoviet:theme");var theme=(t==="light"||t==="dark")?t:"dark";if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var p=location.pathname;if(p==="/"||p==="/vi"||p==="/en"||p==="/vi/"||p==="/en/"){var isDesktop=window.innerWidth>768;var isHiDPI=(window.devicePixelRatio||1)>1.2;var suffix=(isDesktop&&isHiDPI)?".webp":"-700.webp";var f="/images/lasoviet/v3/"+(theme==="light"?"lsv-hero-open-light":"lsv-hero-open-dark")+suffix;var l=document.createElement("link");l.rel="preload";l.as="image";l.href=f;l.fetchPriority="high";document.head.appendChild(l);}}catch(e){}',
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AnalyticsCollector />
          {children}
          <MessengerBubble locale={locale as "vi" | "en"} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
