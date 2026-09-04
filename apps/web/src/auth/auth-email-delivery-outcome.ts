import { AuthEmailDeliveryOutcomeSchema } from "@lasoviet/contracts";

export function requireSentAuthEmailDelivery(body: unknown): void {
  if (!AuthEmailDeliveryOutcomeSchema.safeParse(body).success) {
    throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
  }
}
