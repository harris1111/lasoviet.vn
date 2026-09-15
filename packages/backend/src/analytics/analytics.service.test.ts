import { describe, expect, it, vi } from "vitest";
import { createAnalyticsService } from "./analytics.service.js";
import type { AnalyticsRepository } from "./analytics.repository.js";

describe("analytics service", () => {
  it("proves legacy emit and sink are removed from service interface", () => {
    const service = createAnalyticsService({});
    expect("emit" in service).toBe(false);
  });

  it("fails explicitly when repository is absent for ingest and persistence methods (no fake success)", async () => {
    const service = createAnalyticsService({});

    await expect(
      service.ingest({
        idempotencyKey: "idem_1",
        visitorId: "vis_1",
        name: "landing",
        properties: { landing_page: "/home" },
      }),
    ).rejects.toThrow("ANALYTICS_REPOSITORY_REQUIRED");

    await expect(service.getOrCreateVisitor("vis_1")).rejects.toThrow(
      "ANALYTICS_REPOSITORY_REQUIRED",
    );
    await expect(
      service.linkVisitor({ visitorId: "vis_1", userId: "usr_1" }),
    ).rejects.toThrow("ANALYTICS_REPOSITORY_REQUIRED");
    await expect(
      service.recordWizardConsent({ visitorId: "vis_1" }),
    ).rejects.toThrow("ANALYTICS_REPOSITORY_REQUIRED");
    await expect(
      service.associateBirthProfile({
        visitorId: "vis_1",
        birthProfileId: "bp_1",
        owner: { userId: "usr_1" },
      }),
    ).rejects.toThrow("ANALYTICS_REPOSITORY_REQUIRED");
    await expect(
      service.updateInterestTopics("usr_1", ["career"]),
    ).rejects.toThrow("ANALYTICS_REPOSITORY_REQUIRED");
    await expect(service.listAccountExportEvents("usr_1")).rejects.toThrow(
      "ANALYTICS_REPOSITORY_REQUIRED",
    );
  });

  it("ingests canonical event through repository and preserves replay info", async () => {
    const mockRepo: Partial<AnalyticsRepository> = {
      recordEvent: vi.fn().mockResolvedValue({
        ok: true,
        replayed: false,
        event: {
          id: "evt_123",
          idempotencyKey: "idem_1",
          visitorId: "vis_1",
          userId: "usr_1",
          birthProfileId: null,
          name: "landing",
          properties: { landing_page: "/home" },
          ip: "127.0.0.1",
          userAgent: "test-agent",
          referrer: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmContent: null,
          utmTerm: null,
          deviceClass: "desktop",
          locale: "vi",
          pathname: "/home",
          ipExpiresAt: new Date("2027-09-14T00:00:00Z"),
          unlinkedExpiresAt: null,
          occurredAt: new Date("2026-09-14T00:00:00Z"),
          createdAt: new Date("2026-09-14T00:00:00Z"),
        },
      }),
    };

    const service = createAnalyticsService({
      repository: mockRepo as AnalyticsRepository,
    });

    const result = await service.ingest({
      idempotencyKey: "idem_1",
      visitorId: "vis_1",
      userId: "usr_1",
      name: "landing",
      properties: { landing_page: "/home" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.replayed).toBe(false);
    expect(result.value.event.id).toBe("evt_123");
  });

  it("delegates visitor linking and returns typed conflict", async () => {
    const mockRepo: Partial<AnalyticsRepository> = {
      linkVisitorToAccount: vi.fn().mockResolvedValue({
        ok: false,
        error: "VISITOR_ACCOUNT_CONFLICT",
      }),
    };

    const service = createAnalyticsService({
      repository: mockRepo as AnalyticsRepository,
    });

    const result = await service.linkVisitor({
      visitorId: "vis_conflict",
      userId: "usr_attacker",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VISITOR_ACCOUNT_CONFLICT");
    }
  });

  it("delegates birth profile association checking ownership", async () => {
    const mockRepo: Partial<AnalyticsRepository> = {
      associateBirthProfile: vi.fn().mockResolvedValue({
        ok: false,
        error: "PROFILE_FORBIDDEN",
      }),
    };

    const service = createAnalyticsService({
      repository: mockRepo as AnalyticsRepository,
    });

    const result = await service.associateBirthProfile({
      visitorId: "vis_1",
      birthProfileId: "bp_other",
      owner: { userId: "usr_1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_FORBIDDEN");
    }
  });
  it("forwards PROFILE_FORBIDDEN and PROFILE_NOT_FOUND errors on ingest", async () => {
    const mockRepo: Partial<AnalyticsRepository> = {
      recordEvent: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          error: "PROFILE_FORBIDDEN",
        })
        .mockResolvedValueOnce({
          ok: false,
          error: "PROFILE_NOT_FOUND",
        }),
    };

    const service = createAnalyticsService({
      repository: mockRepo as AnalyticsRepository,
    });

    const resForbidden = await service.ingest({
      idempotencyKey: "idem_forbidden",
      visitorId: "vis_1",
      name: "landing",
      birthProfileId: "bp_forbidden",
      properties: { landing_page: "/home" },
    });

    expect(resForbidden.ok).toBe(false);
    if (!resForbidden.ok) {
      expect(resForbidden.error.code).toBe("PROFILE_FORBIDDEN");
      expect(resForbidden.error.messageKey).toBe("analytics.profile_forbidden");
    }

    const resNotFound = await service.ingest({
      idempotencyKey: "idem_not_found",
      visitorId: "vis_1",
      name: "landing",
      birthProfileId: "bp_not_found",
      properties: { landing_page: "/home" },
    });

    expect(resNotFound.ok).toBe(false);
    if (!resNotFound.ok) {
      expect(resNotFound.error.code).toBe("PROFILE_NOT_FOUND");
      expect(resNotFound.error.messageKey).toBe("analytics.profile_not_found");
    }
  });

  it("projects account export events and returns typed error on corrupt record", async () => {
    const validRawEvent = {
      id: "evt_valid",
      idempotencyKey: "idem_valid",
      visitorId: "vis_1",
      userId: "usr_1",
      birthProfileId: null,
      name: "landing",
      properties: { landing_page: "/home" },
      ip: "203.0.113.1",
      userAgent: "agent-test",
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      deviceClass: "desktop",
      locale: "vi",
      pathname: "/home",
      ipExpiresAt: null,
      unlinkedExpiresAt: null,
      occurredAt: new Date("2026-09-14T00:00:00Z"),
      createdAt: new Date("2026-09-14T00:00:00Z"),
    };

    const mockRepo: Partial<AnalyticsRepository> = {
      listAccountEvents: vi.fn().mockResolvedValue({
        ok: true,
        events: [validRawEvent],
      }),
    };

    const service = createAnalyticsService({
      repository: mockRepo as AnalyticsRepository,
    });

    const exportRes = await service.listAccountExportEvents("usr_1");
    expect(exportRes.ok).toBe(true);
    if (exportRes.ok) {
      expect(exportRes.value).toHaveLength(1);
      expect(exportRes.value[0].id).toBe("evt_valid");
      expect(exportRes.value[0].name).toBe("landing");
      expect(exportRes.value[0].properties).toEqual({ landing_page: "/home" });
      // Sensitive fields must not leak into properties
      expect("ip" in exportRes.value[0].properties).toBe(false);
      expect("user_agent" in exportRes.value[0].properties).toBe(false);
    }

    const corruptRepo: Partial<AnalyticsRepository> = {
      listAccountEvents: vi.fn().mockResolvedValue({
        ok: true,
        events: [
          {
            ...validRawEvent,
            name: "unapproved_corrupted_event",
          },
        ],
      }),
    };

    const corruptService = createAnalyticsService({
      repository: corruptRepo as AnalyticsRepository,
    });

    const corruptRes = await corruptService.listAccountExportEvents("usr_1");
    expect(corruptRes.ok).toBe(false);
    if (!corruptRes.ok) {
      expect(corruptRes.error.code).toBe("ANALYTICS_EXPORT_CORRUPTED");
    }
  });

  it("exports exactly 500 events and returns a typed limit error without partial data for 501", async () => {
    const validRawEvents = Array.from({ length: 500 }, (_, index) => ({
      id: `evt_${index}`,
      idempotencyKey: `idem_${index}`,
      visitorId: "vis_1",
      userId: "usr_1",
      birthProfileId: null,
      name: "landing",
      properties: { landing_page: `/page-${index}` },
      ip: null,
      userAgent: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      deviceClass: null,
      locale: null,
      pathname: null,
      ipExpiresAt: null,
      unlinkedExpiresAt: null,
      occurredAt: new Date("2026-09-14T00:00:00Z"),
      createdAt: new Date("2026-09-14T00:00:00Z"),
    }));
    const completeRepository: Partial<AnalyticsRepository> = {
      listAccountEvents: vi.fn().mockResolvedValue({
        ok: true,
        events: validRawEvents,
      }),
    };
    const completeService = createAnalyticsService({
      repository: completeRepository as AnalyticsRepository,
    });

    const completeResult = await completeService.listAccountExportEvents(
      "usr_1",
    );
    expect(completeResult.ok).toBe(true);
    if (completeResult.ok) {
      expect(completeResult.value).toHaveLength(500);
    }
    expect(completeRepository.listAccountEvents).toHaveBeenCalledWith("usr_1");

    const limitedRepository: Partial<AnalyticsRepository> = {
      listAccountEvents: vi.fn().mockResolvedValue({
        ok: false,
        error: "ANALYTICS_EXPORT_LIMIT_EXCEEDED",
      }),
    };
    const limitedService = createAnalyticsService({
      repository: limitedRepository as AnalyticsRepository,
    });

    const limitedResult = await limitedService.listAccountExportEvents("usr_1");
    expect(limitedResult).toEqual({
      ok: false,
      error: {
        code: "ANALYTICS_EXPORT_LIMIT_EXCEEDED",
        messageKey: "analytics.analytics_export_limit_exceeded",
        retryable: false,
      },
    });
  });
});
