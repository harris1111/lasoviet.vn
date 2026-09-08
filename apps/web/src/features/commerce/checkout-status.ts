import { z } from "zod";

export const PaymentInstructionsSchema = z
  .object({
    bankCode: z.string().trim().min(1).max(64),
    accountNumber: z.string().trim().min(1).max(64),
    accountHolder: z.string().trim().min(1).max(128),
    amount: z.number().int().positive(),
    currency: z.literal("VND"),
    transferDescription: z.string().trim().min(1).max(128),
    qrUrl: z
      .string()
      .url()
      .refine((url) => {
        try {
          return new URL(url).origin === "https://vietqr.app";
        } catch {
          return false;
        }
      }, { message: "QR URL must have origin https://vietqr.app" }),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type PaymentInstructions = z.infer<typeof PaymentInstructionsSchema>;

export const CheckoutOrderSummarySchema = z
  .object({
    id: z.string().trim().min(1),
    status: z.enum(["pending", "paid", "expired", "failed", "refunded"]),
    amount: z.number().int().positive(),
    currency: z.literal("VND"),
    locale: z.enum(["vi", "en"]),
  })
  .strict();

export type CheckoutOrderSummary = z.infer<typeof CheckoutOrderSummarySchema>;

export const CheckoutStatusSchema = z
  .object({
    order: CheckoutOrderSummarySchema,
    paymentInstructions: PaymentInstructionsSchema.nullable(),
    reportId: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.order.status === "pending" && data.paymentInstructions === null) {
      context.addIssue({
        code: "custom",
        path: ["paymentInstructions"],
        message: "Pending orders require payment instructions",
      });
    }
  });

export type CheckoutStatus = z.infer<typeof CheckoutStatusSchema>;

export function parseCheckoutStatus(value: unknown): CheckoutStatus {
  return CheckoutStatusSchema.parse(value);
}

export function safeParseCheckoutStatus(
  value: unknown,
): { ok: true; value: CheckoutStatus } | { ok: false; error: z.ZodError } {
  const result = CheckoutStatusSchema.safeParse(value);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, error: result.error };
}
