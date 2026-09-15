import { AnalyticsEventV1Schema } from "@lasoviet/config";
import type {
  AccountBehaviorProfileV1,
  AccountExportAnalyticsEventV1,
  Result,
} from "@lasoviet/contracts";
import type {
  AnalyticsEventRecord,
  AnalyticsRepository,
  AnalyticsVisitorRecord,
} from "./analytics.repository.js";
import { projectEventsForAccountExport } from "./analytics-export.js";

export type IngestAnalyticsEventInput = {
  id?: string;
  idempotencyKey: string;
  visitorId: string;
  userId?: string | null;
  anonymousActorId?: string | null;
  birthProfileId?: string | null;
  name: string;
  properties: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  deviceClass?: string | null;
  locale?: string | null;
  pathname?: string | null;
  occurredAt?: Date;
};

export type AnalyticsIngestErrorCode =
  | "ANALYTICS_EVENT_INVALID"
  | "IDEMPOTENCY_KEY_CONFLICT"
  | "VISITOR_ACCOUNT_CONFLICT"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_FORBIDDEN";

export type AnalyticsExportErrorCode =
  | "ANALYTICS_EXPORT_CORRUPTED"
  | "ANALYTICS_EXPORT_LIMIT_EXCEEDED";

export type AnalyticsServiceOptions = {
  repository?: AnalyticsRepository;
  now?: () => Date;
};

export type AnalyticsService = {
  ingest(
    input: IngestAnalyticsEventInput,
  ): Promise<Result<{ event: AnalyticsEventRecord; replayed: boolean }, AnalyticsIngestErrorCode>>;
  getOrCreateVisitor(visitorId: string): Promise<AnalyticsVisitorRecord>;
  linkVisitor(params: {
    visitorId: string;
    userId: string;
  }): Promise<Result<{ visitor: AnalyticsVisitorRecord }, "VISITOR_ACCOUNT_CONFLICT">>;
  recordWizardConsent(params: {
    visitorId: string;
    birthProfileId?: string | null;
    owner?: { userId?: string | null; anonymousActorId?: string | null };
    consentedAt?: Date;
  }): Promise<Result<void, "PROFILE_NOT_FOUND" | "PROFILE_FORBIDDEN">>;
  associateBirthProfile(params: {
    visitorId: string;
    birthProfileId: string;
    owner: { userId?: string | null; anonymousActorId?: string | null };
  }): Promise<Result<void, "PROFILE_NOT_FOUND" | "PROFILE_FORBIDDEN" | "VISITOR_NOT_FOUND">>;
  getAccountBehaviorProfile(userId: string): Promise<AccountBehaviorProfileV1 | null>;
  updateInterestTopics(
    userId: string,
    topics: string[],
  ): Promise<Result<AccountBehaviorProfileV1, "INVALID_TOPIC_CODES">>;
  listAccountExportEvents(
    userId: string,
  ): Promise<Result<AccountExportAnalyticsEventV1[], AnalyticsExportErrorCode>>;
};

function error<T extends string>(code: T): Result<never, T> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `analytics.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

export function createAnalyticsService(options: AnalyticsServiceOptions): AnalyticsService {
  const getNow = options.now ?? (() => new Date());

  function requireRepository(): AnalyticsRepository {
    if (!options.repository) {
      throw new Error("ANALYTICS_REPOSITORY_REQUIRED: repository is not configured for persistence");
    }
    return options.repository;
  }

  return {
    async ingest(input) {
      const repository = requireRepository();

      const parsed = AnalyticsEventV1Schema.safeParse({
        name: input.name,
        properties: input.properties,
      });

      if (!parsed.success) {
        return error("ANALYTICS_EVENT_INVALID");
      }

      const now = getNow();
      const result = await repository.recordEvent({
        id: input.id,
        idempotencyKey: input.idempotencyKey,
        visitorId: input.visitorId,
        userId: input.userId,
        anonymousActorId: input.anonymousActorId,
        birthProfileId: input.birthProfileId,
        name: input.name,
        properties: input.properties,
        ip: input.ip,
        userAgent: input.userAgent,
        referrer: input.referrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        deviceClass: input.deviceClass,
        locale: input.locale,
        pathname: input.pathname,
        occurredAt: input.occurredAt ?? now,
        now,
      });

      if (!result.ok) {
        return error(result.error);
      }

      return {
        ok: true,
        value: {
          event: result.event,
          replayed: result.replayed,
        },
      };
    },

    async getOrCreateVisitor(visitorId) {
      const repository = requireRepository();
      return repository.getOrCreateVisitor({
        id: visitorId,
        now: getNow(),
      });
    },

    async linkVisitor(params) {
      const repository = requireRepository();
      const result = await repository.linkVisitorToAccount({
        visitorId: params.visitorId,
        userId: params.userId,
        now: getNow(),
      });
      if (!result.ok) {
        return error(result.error);
      }
      return { ok: true, value: { visitor: result.visitor } };
    },

    async recordWizardConsent(params) {
      const repository = requireRepository();
      const result = await repository.recordWizardConsent({
        visitorId: params.visitorId,
        birthProfileId: params.birthProfileId,
        owner: params.owner,
        consentedAt: params.consentedAt ?? getNow(),
        now: getNow(),
      });
      if (!result.ok) {
        return error(result.error);
      }
      return { ok: true, value: undefined };
    },

    async associateBirthProfile(params) {
      const repository = requireRepository();
      const result = await repository.associateBirthProfile({
        visitorId: params.visitorId,
        birthProfileId: params.birthProfileId,
        owner: params.owner,
        now: getNow(),
      });
      if (!result.ok) {
        return error(result.error);
      }
      return { ok: true, value: undefined };
    },

    async getAccountBehaviorProfile(userId) {
      const repository = requireRepository();
      return repository.getAccountBehaviorProfile(userId);
    },

    async updateInterestTopics(userId, topics) {
      const repository = requireRepository();
      const result = await repository.updateInterestTopics(userId, topics, getNow());
      if (!result.ok) {
        return error(result.error);
      }
      return { ok: true, value: result.profile };
    },

    async listAccountExportEvents(userId) {
      const repository = requireRepository();
      const accountEvents = await repository.listAccountEvents(userId);
      if (!accountEvents.ok) {
        return error(accountEvents.error);
      }
      const projected = projectEventsForAccountExport(
        accountEvents.events.map((e) => ({
          id: e.id,
          name: e.name,
          properties: e.properties,
          occurredAt: e.occurredAt,
        })),
      );
      if (!projected.ok) {
        return error("ANALYTICS_EXPORT_CORRUPTED");
      }
      return { ok: true, value: projected.value };
    },
  };
}
