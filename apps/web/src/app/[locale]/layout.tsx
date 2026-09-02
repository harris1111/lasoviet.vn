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
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
