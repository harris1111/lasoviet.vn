export type StalePaymentAlertPayload = {
  providerEventId: string;
  amount: number;
  receivedAt: Date | string;
  reason: string;
};

export type CircuitOpenAlertPayload = {
  openedAt: Date | string;
  reasonCode: string;
  idempotencyKey: string;
  autoMatched?: number;
  totalReceived?: number;
  staleCount?: number;
};

export type TelegramAlertResult =
  | { status: "delivered" }
  | { status: "unconfigured" }
  | { status: "retryable_failure"; error: string };

export type TelegramAlertProviderOptions = {
  botToken?: string;
  chatId?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export type TelegramAlertProvider = {
  isConfigured(): boolean;
  sendStalePaymentAlert(payload: StalePaymentAlertPayload): Promise<TelegramAlertResult>;
  sendCircuitOpenAlert(payload: CircuitOpenAlertPayload): Promise<TelegramAlertResult>;
};

function formatStalePaymentMessage(payload: StalePaymentAlertPayload): string {
  const receivedStr =
    payload.receivedAt instanceof Date
      ? payload.receivedAt.toISOString()
      : new Date(payload.receivedAt).toISOString();
  return [
    "[LA SO VIET] Canh bao giao dich chua doi soat >6 gio",
    `- Ma giao dich: ${payload.providerEventId}`,
    `- So tien: ${payload.amount} VND`,
    `- Thoi diem nhan: ${receivedStr}`,
    `- Ly do: ${payload.reason}`,
  ].join("\n");
}

function formatCircuitOpenMessage(payload: CircuitOpenAlertPayload): string {
  const openedStr =
    payload.openedAt instanceof Date
      ? payload.openedAt.toISOString()
      : new Date(payload.openedAt).toISOString();
  const lines = [
    "[LA SO VIET] CAU DAO DUNG THANH TOAN (CIRCUIT BREAKER OPEN)",
    "- Trang thai: Da ngat tao don thanh toan",
    `- Ly do: ${payload.reasonCode}`,
    `- Thoi diem: ${openedStr}`,
    `- Idempotency key: ${payload.idempotencyKey}`,
  ];
  if (payload.totalReceived !== undefined) {
    lines.push(
      `- Giao dich 24h: ${payload.totalReceived} (Tu dong khop: ${payload.autoMatched ?? 0})`,
    );
  }
  if (payload.staleCount !== undefined) {
    lines.push(`- Giao dich treo >6h: ${payload.staleCount}`);
  }
  return lines.join("\n");
}

export function createTelegramAlertProvider(
  options: TelegramAlertProviderOptions,
): TelegramAlertProvider {
  const fetchImpl = options.fetch ?? fetch;

  function isConfigured(): boolean {
    return Boolean(
      options.botToken &&
        options.botToken.trim().length > 0 &&
        options.chatId &&
        options.chatId.trim().length > 0,
    );
  }

  async function postMessage(message: string): Promise<TelegramAlertResult> {
    if (!isConfigured()) {
      return { status: "unconfigured" };
    }

    const timeoutMs = options.timeoutMs ?? 5000;
    const signal = AbortSignal.timeout(timeoutMs);

    try {
      const response = await fetchImpl(
        `https://api.telegram.org/bot${options.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: options.chatId,
            text: message,
          }),
          signal,
        },
      );

      if (!response.ok) {
        return {
          status: "retryable_failure",
          error: `TELEGRAM_HTTP_${response.status}`,
        };
      }
      return { status: "delivered" };
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return {
        status: "retryable_failure",
        error: isTimeout ? "TELEGRAM_TIMEOUT" : "TELEGRAM_NETWORK_ERROR",
      };
    }
  }

  return {
    isConfigured,
    async sendStalePaymentAlert(payload) {
      return postMessage(formatStalePaymentMessage(payload));
    },
    async sendCircuitOpenAlert(payload) {
      return postMessage(formatCircuitOpenMessage(payload));
    },
  };
}
