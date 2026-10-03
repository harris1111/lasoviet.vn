"use server";

import { WalletTopUpContinuationRequestV1Schema } from "@lasoviet/contracts";

import { createTopUpOrder } from "./create-topup-order";

export async function createTopUpOrderFormAction(
  formData: FormData,
): Promise<void> {
  const packId = String(formData.get("packId") ?? "");
  const locale = String(formData.get("locale") ?? "vi");
  const returnPath = formData.get("returnPath");
  const serialized = formData.get("continuation");
  const continuation = typeof serialized === "string" && serialized ? WalletTopUpContinuationRequestV1Schema.parse(JSON.parse(serialized)) : undefined;
  await createTopUpOrder(
    packId,
    locale,
    typeof returnPath === "string" && returnPath.length > 0 ? returnPath : undefined,
    continuation,
  );
}
