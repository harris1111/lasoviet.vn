import type { Metadata } from "next";
import { customerContactConfig } from "@lasoviet/config";

import type { CurrentActor } from "@lasoviet/contracts";
import { WalletTopUpContinuationRequestV1Schema, WalletTopUpPackIdSchema } from "@lasoviet/contracts";
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ pack?: string; intent?: string; intentVersion?: string; price?: string; tab?: string; open?: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "vi";
  const query = await searchParams;
  const requestedPack = query?.pack;
  const continuationResult = WalletTopUpContinuationRequestV1Schema.safeParse({
    purchaseIntentId: query?.intent, expectedIntentVersion: Number(query?.intentVersion),
    confirmedPriceLa: Number(query?.price), returnTab: query?.tab ?? "topics", ...(query?.open ? { returnOpen: query.open } : {}),
  });
  const continuation = continuationResult.success ? continuationResult.data : undefined;
  const returnQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) if (typeof value === "string") returnQuery.set(key, value);
  const topUpReturnPath = `${locale === "en" ? "/en" : ""}/nap-la?${returnQuery}`;
  const parsedPack = WalletTopUpPackIdSchema.safeParse(requestedPack);
  const initialPackId = parsedPack.success ? parsedPack.data : undefined;

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
          initialPackId={initialPackId}
          topUpContinuation={continuation}
          topUpReturnPath={topUpReturnPath}
          supportEmail={customerContactConfig.email.value}
          userBalance={userBalance}
        />
      </div>
    </main>
  );
}
