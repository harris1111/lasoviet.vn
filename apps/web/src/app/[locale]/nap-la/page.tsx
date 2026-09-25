import type { Metadata } from "next";
import { customerContactConfig } from "@lasoviet/config";
import { PaidTopicSelector } from "../../../features/reports/paid-topic-selector";

export const metadata: Metadata = {
  title: "Nạp Lá - Bảng giá Lá Số Việt",
  description: "Bảng giá gói Lá và luận giải Tử Vi Đẩu Số trên Lá Số Việt.",
};

export const dynamic = "force-dynamic";

export default async function TopUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "vi";

  return (
    <main className="topic-page" data-light-ready>
      <div className="container">
        <PaidTopicSelector
          locale={locale}
          initialTab="nap-la"
          supportEmail={customerContactConfig.email.value}
        />
      </div>
    </main>
  );
}
