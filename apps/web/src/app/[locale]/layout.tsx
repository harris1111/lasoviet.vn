import {
  Be_Vietnam_Pro,
  JetBrains_Mono,
  Source_Serif_4,
} from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SITE_THEME_BOOTSTRAP } from "../../features/theme/site-theme-bootstrap";
import { routing } from "../../i18n/routing";
import { AnalyticsCollector } from "../../features/analytics/analytics-collector";
import { MessengerBubble } from "../../components/ui/messenger-bubble";
import { WelcomeGrantNotice } from "../../features/commerce/welcome-grant-notice";
import "../../styles/global.css";
import "../../styles/free-result-read-first.css";

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
        <meta name="theme-color" content="#080706" />
        <script dangerouslySetInnerHTML={{ __html: SITE_THEME_BOOTSTRAP }} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AnalyticsCollector />
          {children}
          <MessengerBubble locale={locale as "vi" | "en"} />
          <WelcomeGrantNotice locale={locale as "vi" | "en"} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
