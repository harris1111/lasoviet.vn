export type PaymentInstructions = {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  currency: "VND";
  transferDescription: string;
  qrUrl: string;
  expiresAt: string;
};

export function createPaymentInstructions(input: {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  currency: "VND";
  paymentCode: string;
  createdAt: Date;
  orderTtlSeconds: number;
}): PaymentInstructions {
  const bankCode = input.bankCode.trim();
  const accountNumber = input.accountNumber.trim();
  const accountHolder = input.accountHolder.trim();
  const paymentCode = input.paymentCode.trim();

  if (!bankCode || bankCode.length > 64) {
    throw new Error("Invalid bank code");
  }
  if (!accountNumber || accountNumber.length > 64) {
    throw new Error("Invalid account number");
  }
  if (!accountHolder || accountHolder.length > 128) {
    throw new Error("Invalid account holder");
  }
  if (!paymentCode || paymentCode.length > 128) {
    throw new Error("Invalid payment code");
  }
  if (input.currency !== "VND") {
    throw new Error("Currency must be VND");
  }
  if (
    typeof input.amount !== "number" ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error("Invalid payment amount");
  }
  if (
    typeof input.orderTtlSeconds !== "number" ||
    !Number.isSafeInteger(input.orderTtlSeconds) ||
    input.orderTtlSeconds <= 0
  ) {
    throw new Error("Invalid order TTL seconds");
  }
  if (
    !(input.createdAt instanceof Date) ||
    Number.isNaN(input.createdAt.getTime())
  ) {
    throw new Error("Invalid createdAt date");
  }

  const qrUrlObj = new URL("https://vietqr.app/img");
  qrUrlObj.searchParams.set("acc", accountNumber);
  qrUrlObj.searchParams.set("bank", bankCode);
  qrUrlObj.searchParams.set("amount", String(input.amount));
  qrUrlObj.searchParams.set("des", paymentCode);
  qrUrlObj.searchParams.set("template", "compact");

  const expiresAtMs = input.createdAt.getTime() + input.orderTtlSeconds * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  return {
    bankCode,
    accountNumber,
    accountHolder,
    amount: input.amount,
    currency: "VND",
    transferDescription: paymentCode,
    qrUrl: qrUrlObj.toString(),
    expiresAt,
  };
}
