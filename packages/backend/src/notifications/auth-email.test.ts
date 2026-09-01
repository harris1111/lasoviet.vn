import { describe, expect, it } from "vitest";

import type { AuthEmailRequest } from "@lasoviet/contracts";

import type {
  AuthEmailDeliveryRecord,
  AuthEmailDeliveryStore,
  NotificationDeliveryStatus,
} from "./auth-email.js";
import type {
  EmailMessage,
  EmailProvider,
  EmailProviderResult,
} from "./email-provider.js";
import { createAuthEmailDeliveryService } from "./auth-email.js";

const request: AuthEmailRequest = {
  version: 1,
  kind: "email_verification",
  idempotencyKey: "auth-email:verification:synthetic",
  recipient: "user@synthetic.test",
  locale: "en",
  actionUrl: "https://lasoviet.example/en/verify?token=synthetic",
  requestId: "request-synthetic",
};

class MemoryDeliveryStore implements AuthEmailDeliveryStore {
  private readonly records = new Map<string, AuthEmailDeliveryRecord>();

  async insertPending(
    input: Omit<
      AuthEmailDeliveryRecord,
      "id" | "status" | "attemptCount" | "createdAt" | "updatedAt"
    >,
    now: Date,
  ): Promise<void> {
    if (this.records.has(input.idempotencyKey)) {
      return;
    }
    this.records.set(input.idempotencyKey, {
      ...input,
      id: `delivery-${this.records.size + 1}`,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      sendingLeaseExpiresAt: null,
      lastErrorCode: null,
      providerMessageId: null,
      sentAt: null,
    });
  }

  async getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<AuthEmailDeliveryRecord> {
    const record = this.records.get(idempotencyKey);
    if (record === undefined) {
      throw new Error("missing synthetic delivery");
    }
    return { ...record };
  }

  async markExpiredSendingUnknown(
    idempotencyKey: string,
    now: Date,
  ): Promise<void> {
    const record = this.records.get(idempotencyKey);
    if (
      record?.status === "sending" &&
      record.sendingLeaseExpiresAt !== null &&
      record.sendingLeaseExpiresAt <= now
    ) {
      record.status = "delivery_unknown";
      record.sendingLeaseExpiresAt = null;
      record.updatedAt = now;
    }
  }

  async claim(
    idempotencyKey: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<{ attemptCount: number } | null> {
    const record = this.records.get(idempotencyKey);
    if (
      record === undefined ||
      (record.status !== "pending" && record.status !== "failed_retryable") ||
      record.attemptCount >= 3
    ) {
      return null;
    }
    record.status = "sending";
    record.attemptCount += 1;
    record.sendingLeaseExpiresAt = leaseExpiresAt;
    record.updatedAt = now;
    return { attemptCount: record.attemptCount };
  }

  async markSent(
    idempotencyKey: string,
    attemptCount: number,
    providerMessageId: string | undefined,
    now: Date,
  ): Promise<void> {
    const record = this.records.get(idempotencyKey);
    if (
      record?.status === "sending" &&
      record.attemptCount === attemptCount
    ) {
      record.status = "sent";
      record.providerMessageId = providerMessageId ?? null;
      record.sendingLeaseExpiresAt = null;
      record.sentAt = now;
      record.updatedAt = now;
    }
  }

  async markFailure(
    idempotencyKey: string,
    attemptCount: number,
    status: Extract<
      NotificationDeliveryStatus,
      "failed_retryable" | "failed_permanent" | "delivery_unknown"
    >,
    errorCode: string,
    now: Date,
  ): Promise<void> {
    const record = this.records.get(idempotencyKey);
    if (
      record?.status === "sending" &&
      record.attemptCount === attemptCount
    ) {
      record.status = status;
      record.lastErrorCode = errorCode;
      record.sendingLeaseExpiresAt = null;
      record.updatedAt = now;
    }
  }

  seed(record: AuthEmailDeliveryRecord): void {
    this.records.set(record.idempotencyKey, { ...record });
  }
}

function provider(
  result: EmailProviderResult,
  calls: { count: number },
): EmailProvider {
  return {
    async send(_message: EmailMessage, _idempotencyKey: string) {
      calls.count += 1;
      return result;
    },
  };
}

describe("auth email delivery state machine", () => {
  it("suppresses duplicate sends after a successful delivery", async () => {
    const store = new MemoryDeliveryStore();
    const calls = { count: 0 };
    const service = createAuthEmailDeliveryService({
      store,
      provider: provider(
        { ok: true, providerMessageId: "synthetic-message" },
        calls,
      ),
      recipientFingerprintSecret: "synthetic-secret",
      now: () => new Date("2026-09-01T00:00:00Z"),
    });

    await expect(service.send(request)).resolves.toMatchObject({ status: "sent" });
    await expect(service.send(request)).resolves.toMatchObject({ status: "sent" });
    expect(calls.count).toBe(1);
  });

  it("caps retryable delivery attempts at three", async () => {
    const store = new MemoryDeliveryStore();
    const calls = { count: 0 };
    const service = createAuthEmailDeliveryService({
      store,
      provider: provider({ ok: false, code: "SMTP_RETRYABLE" }, calls),
      recipientFingerprintSecret: "synthetic-secret",
      now: () => new Date("2026-09-01T00:00:00Z"),
    });

    await service.send(request);
    await service.send(request);
    await service.send(request);
    await service.send(request);

    expect(calls.count).toBe(3);
    await expect(service.send(request)).resolves.toMatchObject({
      status: "failed_retryable",
      attemptCount: 3,
    });
    expect(calls.count).toBe(3);
  });

  it("marks an expired sending lease unknown without a second SMTP call", async () => {
    const store = new MemoryDeliveryStore();
    const calls = { count: 0 };
    const now = new Date("2026-09-01T00:00:00Z");
    store.seed({
      id: "delivery-expired",
      idempotencyKey: request.idempotencyKey,
      kind: request.kind,
      recipientFingerprint: "synthetic-fingerprint",
      status: "sending",
      sendingLeaseExpiresAt: new Date("2026-08-31T23:59:59Z"),
      attemptCount: 1,
      lastErrorCode: null,
      providerMessageId: null,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    });

    const service = createAuthEmailDeliveryService({
      store,
      provider: provider({ ok: true, providerMessageId: "unexpected" }, calls),
      recipientFingerprintSecret: "synthetic-secret",
      now: () => now,
    });

    await expect(service.send(request)).resolves.toMatchObject({
      status: "delivery_unknown",
    });
    expect(calls.count).toBe(0);
  });
});
