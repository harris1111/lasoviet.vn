import { createHmac } from "node:crypto";

import {
  and,
  eq,
  lt,
  or,
  sql,
} from "drizzle-orm";

import {
  AuthEmailRequestSchema,
  type AuthEmailKind,
  type AuthEmailRequest,
} from "@lasoviet/contracts";
import {
  notificationDeliveries,
  type Database,
} from "@lasoviet/database/runtime";

import type {
  EmailMessage,
  EmailProvider,
  EmailProviderResult,
} from "./email-provider.js";

export type NotificationDeliveryStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed_retryable"
  | "failed_permanent"
  | "delivery_unknown";

export type AuthEmailDeliveryRecord = {
  id: string;
  idempotencyKey: string;
  kind: AuthEmailKind;
  recipientFingerprint: string;
  requestPayload: AuthEmailRequest;
  status: NotificationDeliveryStatus;
  sendingLeaseExpiresAt: Date | null;
  attemptCount: number;
  lastErrorCode: string | null;
  providerMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
};

export type NewAuthEmailDelivery = Pick<
  AuthEmailDeliveryRecord,
  "idempotencyKey" | "kind" | "recipientFingerprint" | "requestPayload"
>;

export interface AuthEmailDeliveryStore {
  insertPending(input: NewAuthEmailDelivery, now: Date): Promise<void>;
  getByIdempotencyKey(idempotencyKey: string): Promise<AuthEmailDeliveryRecord>;
  markExpiredSendingUnknown(idempotencyKey: string, now: Date): Promise<void>;
  claim(
    idempotencyKey: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<{ attemptCount: number } | null>;
  markSent(
    idempotencyKey: string,
    attemptCount: number,
    providerMessageId: string | undefined,
    now: Date,
  ): Promise<void>;
  markFailure(
    idempotencyKey: string,
    attemptCount: number,
    status: Extract<
      NotificationDeliveryStatus,
      "failed_retryable" | "failed_permanent" | "delivery_unknown"
    >,
    errorCode: string,
    now: Date,
  ): Promise<void>;
  listRetryable(limit: number): Promise<AuthEmailRequest[]>;
}

export type AuthEmailDeliveryOutcome = {
  status: NotificationDeliveryStatus;
  attemptCount: number;
  providerMessageId: string | null;
  errorCode: string | null;
};

export type AuthEmailDeliveryServiceOptions = {
  store: AuthEmailDeliveryStore;
  provider: EmailProvider;
  recipientFingerprintSecret: string;
  now?: () => Date;
};

const LEASE_MS = 45_000;

const messages: Record<
  "vi" | "en",
  Record<AuthEmailKind, EmailMessage & { to: string }>
> = {
  vi: {
    email_verification: {
      to: "",
      subject: "Xac minh email La So Viet",
      text: "Mo lien ket de xac minh email La So Viet: {actionUrl}",
      html: "<p>Mo lien ket de xac minh email La So Viet:</p><p>{actionUrl}</p>",
    },
    password_reset: {
      to: "",
      subject: "Dat lai mat khau La So Viet",
      text: "Mo lien ket de dat lai mat khau La So Viet: {actionUrl}",
      html: "<p>Mo lien ket de dat lai mat khau La So Viet:</p><p>{actionUrl}</p>",
    },
  },
  en: {
    email_verification: {
      to: "",
      subject: "Verify your La So Viet email",
      text: "Open this link to verify your La So Viet email: {actionUrl}",
      html: "<p>Open this link to verify your La So Viet email:</p><p>{actionUrl}</p>",
    },
    password_reset: {
      to: "",
      subject: "Reset your La So Viet password",
      text: "Open this link to reset your La So Viet password: {actionUrl}",
      html: "<p>Open this link to reset your La So Viet password:</p><p>{actionUrl}</p>",
    },
  },
};

function fingerprint(recipient: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(recipient.trim().toLowerCase())
    .digest("hex");
}

function renderMessage(request: AuthEmailRequest): EmailMessage {
  const template = messages[request.locale][request.kind];
  return {
    to: request.recipient,
    subject: template.subject,
    text: template.text.replaceAll("{actionUrl}", request.actionUrl),
    html: template.html.replaceAll("{actionUrl}", request.actionUrl),
  };
}

function outcome(record: AuthEmailDeliveryRecord): AuthEmailDeliveryOutcome {
  return {
    status: record.status,
    attemptCount: record.attemptCount,
    providerMessageId: record.providerMessageId,
    errorCode: record.lastErrorCode,
  };
}

function terminalOrActive(
  record: AuthEmailDeliveryRecord,
  now: Date,
): boolean {
  if (
    record.status === "sent" ||
    record.status === "failed_permanent" ||
    record.status === "delivery_unknown" ||
    (record.status === "failed_retryable" && record.attemptCount >= 3)
  ) {
    return true;
  }
  return (
    record.status === "sending" &&
    record.sendingLeaseExpiresAt !== null &&
    record.sendingLeaseExpiresAt > now
  );
}

function statusForProviderResult(
  result: EmailProviderResult,
): Extract<NotificationDeliveryStatus, "failed_retryable" | "failed_permanent"> {
  return result.ok ? "failed_permanent" : result.code === "SMTP_RETRYABLE"
    ? "failed_retryable"
    : "failed_permanent";
}

export function createAuthEmailDeliveryService(
  options: AuthEmailDeliveryServiceOptions,
) {
  const nowValue = options.now ?? (() => new Date());

  return {
    async send(request: AuthEmailRequest): Promise<AuthEmailDeliveryOutcome> {
      const validatedRequest = AuthEmailRequestSchema.parse(request);
      const now = nowValue();
      const idempotencyKey = validatedRequest.idempotencyKey;

      await options.store.insertPending(
        {
          idempotencyKey,
          kind: validatedRequest.kind,
          recipientFingerprint: fingerprint(
            validatedRequest.recipient,
            options.recipientFingerprintSecret,
          ),
          requestPayload: validatedRequest,
        },
        now,
      );
      await options.store.markExpiredSendingUnknown(idempotencyKey, now);

      let record = await options.store.getByIdempotencyKey(idempotencyKey);
      if (terminalOrActive(record, now)) {
        return outcome(record);
      }

      const claim = await options.store.claim(
        idempotencyKey,
        now,
        new Date(now.getTime() + LEASE_MS),
      );
      if (claim === null) {
        return outcome(await options.store.getByIdempotencyKey(idempotencyKey));
      }

      const message = renderMessage(validatedRequest);
      let result: EmailProviderResult;
      try {
        result = await options.provider.send(message, idempotencyKey);
      } catch {
        await options.store.markFailure(
          idempotencyKey,
          claim.attemptCount,
          "delivery_unknown",
          "PROVIDER_EXCEPTION",
          nowValue(),
        );
        record = await options.store.getByIdempotencyKey(idempotencyKey);
        return outcome(record);
      }

      if (result.ok) {
        await options.store.markSent(
          idempotencyKey,
          claim.attemptCount,
          result.providerMessageId,
          nowValue(),
        );
      } else {
        await options.store.markFailure(
          idempotencyKey,
          claim.attemptCount,
          statusForProviderResult(result),
          result.code,
          nowValue(),
        );
      }
      record = await options.store.getByIdempotencyKey(idempotencyKey);
      return outcome(record);
    },
    async retryDue(limit = 25): Promise<number> {
      const requests = await options.store.listRetryable(limit);
      for (const request of requests) {
        await this.send(request);
      }
      return requests.length;
    },
  };
}

function fromDatabaseRecord(
  record: typeof notificationDeliveries.$inferSelect,
): AuthEmailDeliveryRecord {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey,
    kind: record.kind,
    recipientFingerprint: record.recipientFingerprint,
    requestPayload: AuthEmailRequestSchema.parse(record.requestPayload),
    status: record.status,
    sendingLeaseExpiresAt: record.sendingLeaseExpiresAt,
    attemptCount: record.attemptCount,
    lastErrorCode: record.lastErrorCode,
    providerMessageId: record.providerMessageId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sentAt: record.sentAt,
  };
}

export function createDatabaseAuthEmailDeliveryStore(
  database: Database,
): AuthEmailDeliveryStore {
  return {
    async insertPending(input, now) {
      await database
        .insert(notificationDeliveries)
        .values({
          ...input,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    },
    async listRetryable(limit) {
      const records = await database
        .select()
        .from(notificationDeliveries)
        .where(
          and(
            eq(notificationDeliveries.status, "failed_retryable"),
            lt(notificationDeliveries.attemptCount, 3),
          ),
        )
        .limit(limit);
      return records.flatMap((record) => {
        const parsed = AuthEmailRequestSchema.safeParse(record.requestPayload);
        return parsed.success ? [parsed.data] : [];
      });
    },

    async getByIdempotencyKey(idempotencyKey) {
      const [record] = await database
        .select()
        .from(notificationDeliveries)
        .where(eq(notificationDeliveries.idempotencyKey, idempotencyKey))
        .limit(1);
      if (record === undefined) {
        throw new Error("AUTH_EMAIL_DELIVERY_NOT_FOUND");
      }
      return fromDatabaseRecord(record);
    },

    async markExpiredSendingUnknown(idempotencyKey, now) {
      await database
        .update(notificationDeliveries)
        .set({
          status: "delivery_unknown",
          sendingLeaseExpiresAt: null,
          updatedAt: now,
          lastErrorCode: "SENDING_LEASE_EXPIRED",
        })
        .where(
          and(
            eq(notificationDeliveries.idempotencyKey, idempotencyKey),
            eq(notificationDeliveries.status, "sending"),
            lt(notificationDeliveries.sendingLeaseExpiresAt, now),
          ),
        );
    },

    async claim(idempotencyKey, now, leaseExpiresAt) {
      const [record] = await database
        .update(notificationDeliveries)
        .set({
          status: "sending",
          attemptCount: sql<number>`${notificationDeliveries.attemptCount} + 1`,
          sendingLeaseExpiresAt: leaseExpiresAt,
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationDeliveries.idempotencyKey, idempotencyKey),
            or(
              eq(notificationDeliveries.status, "pending"),
              and(
                eq(notificationDeliveries.status, "failed_retryable"),
                lt(notificationDeliveries.attemptCount, 3),
              ),
            ),
          ),
        )
        .returning({ attemptCount: notificationDeliveries.attemptCount });
      return record ?? null;
    },

    async markSent(idempotencyKey, attemptCount, providerMessageId, now) {
      await database
        .update(notificationDeliveries)
        .set({
          status: "sent",
          providerMessageId: providerMessageId ?? null,
          sendingLeaseExpiresAt: null,
          sentAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationDeliveries.idempotencyKey, idempotencyKey),
            eq(notificationDeliveries.status, "sending"),
            eq(notificationDeliveries.attemptCount, attemptCount),
          ),
        );
    },

    async markFailure(
      idempotencyKey,
      attemptCount,
      status,
      errorCode,
      now,
    ) {
      await database
        .update(notificationDeliveries)
        .set({
          status,
          lastErrorCode: errorCode,
          sendingLeaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationDeliveries.idempotencyKey, idempotencyKey),
            eq(notificationDeliveries.status, "sending"),
            eq(notificationDeliveries.attemptCount, attemptCount),
          ),
        );
    },
  };
}
