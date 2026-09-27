import type { Metadata } from "next";
import { customerContactConfig } from "@lasoviet/config";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  resolveVerifiedAccountActor,
  VerifiedAccountResolutionError,
} from "../../../auth/resolve-current-actor";
import { accountDataLoader } from "../../../features/account/account-data-loader";
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

  let actor: Extract<CurrentActor, { kind: "account" }> | null = null;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      actor = null;
    } else {
      throw error;
    }
  }

  let userBalance = 0;
  if (actor !== null) {
    const balanceResult = await accountDataLoader.loadWalletBalance(actor);
    if (balanceResult.ok) {
      userBalance = balanceResult.value.totalLa;
    }
  }

  return (
    <main className="topic-page" data-light-ready>
      <div className="container">
        <PaidTopicSelector
          locale={locale}
          initialTab="nap-la"
          supportEmail={customerContactConfig.email.value}
          userBalance={userBalance}
        />
      </div>
    </main>
  );
}
