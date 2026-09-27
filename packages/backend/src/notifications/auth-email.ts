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
  PersistedEmailDeliveryRequestSchema,
  type AuthEmailKind,
  type AuthEmailRequest,
  type PersistedEmailDeliveryRequest,
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

export type NotificationDeliveryKind =
  | AuthEmailKind
  | "report_ready"
  | "report_failed"
  | "nurture_verified_signin"
  | "han_month_reminder"
  | "delayed_unlock_completed";

export type AuthEmailDeliveryRecord = {
  id: string;
  idempotencyKey: string;
  kind: NotificationDeliveryKind;
  recipientFingerprint: string;
  requestPayload: PersistedEmailDeliveryRequest;
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
  listRetryable(limit: number): Promise<PersistedEmailDeliveryRequest[]>;
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
  preferenceChecker?: {
    isNonTransactionalAllowed(recipient: string, userId?: string): Promise<boolean>;
  };
  now?: () => Date;
};

const LEASE_MS = 45_000;

const messages: Record<
  "vi" | "en",
  Record<NotificationDeliveryKind, EmailMessage & { to: string }>
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
    report_ready: {
      to: "",
      subject: "Bao cao La So Viet da san sang",
      text: "Bao cao cua ban da san sang. Mo lien ket de xem bao cao: {actionUrl}",
      html: "<p>Bao cao cua ban da san sang. Mo lien ket de xem bao cao:</p><p>{actionUrl}</p>",
    },
    report_failed: {
      to: "",
      subject: "Bao cao La So Viet can duoc ho tro",
      text: "Bao cao cua ban can duoc ho tro. Mo lien ket de xem trang ho tro: {actionUrl}",
      html: "<p>Bao cao cua ban can duoc ho tro.</p><p><a href=\"{actionUrl}\">Mo trang ho tro</a></p>",
    },
    nurture_verified_signin: {
      to: "",
      subject: "Kham pha them ve {palaceTitle} tren la so Tu Vi cua ban",
      text: "La so cua ban da duoc luu tren La So Viet. Mo lien ket de kham pha them ve {palaceTitle}: {actionUrl}\n\nDe huy nhan thong bao nay, mo lien ket: {unsubscribeUrl}",
      html: "<p>La so cua ban da duoc luu tren La So Viet.</p><p>Mo lien ket de kham pha them ve <strong>{palaceTitle}</strong>:</p><p><a href=\"{actionUrl}\">Xem {palaceTitle}</a></p><p style=\"font-size:12px;color:#666;\">De huy nhan thong bao: <a href=\"{unsubscribeUrl}\">Huy dang ky</a></p>",
    },
    han_month_reminder: {
      to: "",
      subject: "Luu y van han thang {monthIndex} tren la so Tu Vi cua ban",
      text: "Thang {monthIndex} tren la so cua ban can dac biet chu y ve {primaryFocus}. {prepText}\n\nMo lien ket de xem chi tiet: {actionUrl}\n\nDe huy nhan thong bao nay, mo lien ket: {unsubscribeUrl}",
      html: "<p>Thang {monthIndex} tren la so cua ban can dac biet chu y ve <strong>{primaryFocus}</strong>.</p><p>{prepText}</p><p><a href=\"{actionUrl}\">Xem chi tiet van han</a></p><p style=\"font-size:12px;color:#666;\">De huy nhan thong bao: <a href=\"{unsubscribeUrl}\">Huy dang ky</a></p>",
    },
    delayed_unlock_completed: {
      to: "",
      subject: "Phan ban chon da duoc mo tren La So Viet",
      text: "Giao dich nap La thanh cong va {itemName} da duoc mo. Mo lien ket de xem ngay: {actionUrl}",
      html: "<p>Giao dich nap La thanh cong va <strong>{itemName}</strong> da duoc mo.</p><p><a href=\"{actionUrl}\">Xem ngay</a></p>",
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
    report_ready: {
      to: "",
      subject: "Your La So Viet report is ready",
      text: "Your report is ready. Open this link to view your report: {actionUrl}",
      html: "<p>Your report is ready. Open this link to view your report:</p><p>{actionUrl}</p>",
    },
    report_failed: {
      to: "",
      subject: "Your La So Viet report needs support",
      text: "Your report needs support. Open this link to view the support page: {actionUrl}",
      html: "<p>Your report needs support.</p><p><a href=\"{actionUrl}\">Open support</a></p>",
    },
    nurture_verified_signin: {
      to: "",
      subject: "Explore more about {palaceTitle} on your Zi Wei chart",
      text: "Your chart is saved on La So Viet. Open this link to explore more about {palaceTitle}: {actionUrl}\n\nTo unsubscribe from these emails, open: {unsubscribeUrl}",
      html: "<p>Your chart is saved on La So Viet.</p><p>Open this link to explore more about <strong>{palaceTitle}</strong>:</p><p><a href=\"{actionUrl}\">View {palaceTitle}</a></p><p style=\"font-size:12px;color:#666;\">To stop receiving these emails: <a href=\"{unsubscribeUrl}\">Unsubscribe</a></p>",
    },
    han_month_reminder: {
      to: "",
      subject: "Monthly guidance for month {monthIndex} on your Zi Wei chart",
      text: "Month {monthIndex} calls for focus on {primaryFocus}. {prepText}\n\nOpen this link for details: {actionUrl}\n\nTo unsubscribe from these emails, open: {unsubscribeUrl}",
      html: "<p>Month {monthIndex} calls for focus on <strong>{primaryFocus}</strong>.</p><p>{prepText}</p><p><a href=\"{actionUrl}\">View monthly guidance</a></p><p style=\"font-size:12px;color:#666;\">To stop receiving these emails: <a href=\"{unsubscribeUrl}\">Unsubscribe</a></p>",
    },
    delayed_unlock_completed: {
      to: "",
      subject: "Your selected item is unlocked on La So Viet",
      text: "Your La top-up was successful and {itemName} has been unlocked. Open this link to view: {actionUrl}",
      html: "<p>Your La top-up was successful and <strong>{itemName}</strong> has been unlocked.</p><p><a href=\"{actionUrl}\">View now</a></p>",
    },
  },
};

function fingerprint(recipient: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(recipient.trim().toLowerCase())
    .digest("hex");
}

function renderMessage(request: PersistedEmailDeliveryRequest): EmailMessage {
  const template = messages[request.locale][request.kind];
  let text = template.text.replaceAll("{actionUrl}", request.actionUrl);
  let html = template.html.replaceAll("{actionUrl}", request.actionUrl);
  let subject = template.subject;

  if (request.kind === "nurture_verified_signin") {
    text = text
      .replaceAll("{palaceTitle}", request.palaceTitle)
      .replaceAll("{unsubscribeUrl}", request.unsubscribeUrl);
    html = html
      .replaceAll("{palaceTitle}", request.palaceTitle)
      .replaceAll("{unsubscribeUrl}", request.unsubscribeUrl);
    subject = subject.replaceAll("{palaceTitle}", request.palaceTitle);
  } else if (request.kind === "han_month_reminder") {
    text = text
      .replaceAll("{monthIndex}", String(request.monthIndex))
      .replaceAll("{primaryFocus}", request.primaryFocus)
      .replaceAll("{prepText}", request.prepText)
      .replaceAll("{unsubscribeUrl}", request.unsubscribeUrl);
    html = html
      .replaceAll("{monthIndex}", String(request.monthIndex))
      .replaceAll("{primaryFocus}", request.primaryFocus)
      .replaceAll("{prepText}", request.prepText)
      .replaceAll("{unsubscribeUrl}", request.unsubscribeUrl);
    subject = subject.replaceAll("{monthIndex}", String(request.monthIndex));
  } else if (request.kind === "delayed_unlock_completed") {
    text = text.replaceAll("{itemName}", request.itemName);
    html = html.replaceAll("{itemName}", request.itemName);
    subject = subject.replaceAll("{itemName}", request.itemName);
  }

  return {
    to: request.recipient,
    subject,
    text,
    html,
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
    async send(request: PersistedEmailDeliveryRequest): Promise<AuthEmailDeliveryOutcome> {
      const validatedRequest = PersistedEmailDeliveryRequestSchema.parse(request);
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

      // Check unsubscribe / preferences for non-transactional messages
      if (
        (validatedRequest.kind === "nurture_verified_signin" ||
          validatedRequest.kind === "han_month_reminder") &&
        options.preferenceChecker !== undefined
      ) {
        const allowed = await options.preferenceChecker.isNonTransactionalAllowed(
          validatedRequest.recipient,
          validatedRequest.userId,
        );
        if (!allowed) {
          await options.store.markFailure(
            idempotencyKey,
            0,
            "failed_permanent",
            "RECIPIENT_UNSUBSCRIBED",
            now,
          );
          return outcome(await options.store.getByIdempotencyKey(idempotencyKey));
        }
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
    kind: record.kind as NotificationDeliveryKind,
    recipientFingerprint: record.recipientFingerprint,
    requestPayload: PersistedEmailDeliveryRequestSchema.parse(record.requestPayload),
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
          or(
            and(
              eq(notificationDeliveries.status, "pending"),
              or(
                eq(notificationDeliveries.kind, "report_ready"),
                eq(notificationDeliveries.kind, "report_failed"),
                eq(notificationDeliveries.kind, "nurture_verified_signin"),
                eq(notificationDeliveries.kind, "han_month_reminder"),
              ),
            ),
            and(
              eq(notificationDeliveries.status, "failed_retryable"),
              lt(notificationDeliveries.attemptCount, 3),
            ),
          ),
        )
        .orderBy(notificationDeliveries.createdAt)
        .limit(limit);
      return records.flatMap((record) => {
        const parsed = PersistedEmailDeliveryRequestSchema.safeParse(record.requestPayload);
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
            or(
              eq(notificationDeliveries.status, "sending"),
              eq(notificationDeliveries.status, "pending"),
            ),
            attemptCount === 0
              ? sql`true`
              : eq(notificationDeliveries.attemptCount, attemptCount),
          ),
        );
    },
  };
}
