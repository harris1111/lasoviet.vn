import "server-only";
import { WalletQuotesV1Schema, type CurrentActor, type WalletQuoteRequestV1, type WalletQuotesV1 } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../api/private-api-client";

export async function loadWalletQuotes(actor: Extract<CurrentActor, { kind: "account" }>, input: WalletQuoteRequestV1): Promise<WalletQuotesV1 | null> {
  try {
    const response = await privateApiClient(actor, actor.requestId).request<unknown>(`/commerce/wallet/quotes?${new URLSearchParams(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`);
    const result = WalletQuotesV1Schema.safeParse((response as { ok?: boolean; value?: unknown } | null)?.ok === true ? (response as { value: unknown }).value : undefined);
    return result.success && result.data.chartId === input.chartId && result.data.chartVersionId === input.chartVersionId && result.data.locale === input.locale && result.data.targetYear === input.targetYear ? result.data : null;
  } catch (error) {
    if (error instanceof PrivateApiClientError) return null;
    throw error;
  }
}
