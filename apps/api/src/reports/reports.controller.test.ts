import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  type ReportViewV1,
} from "@lasoviet/contracts";

import {
  REPORT_QUERY_DATABASE,
  REPORT_QUERY_SERVICE,
  REPORT_QUERY_SERVICE_SECRET,
  ReportsController,
} from "./reports.controller.js";

const serviceSecret = "synthetic-reports-secret";
const secret = new TextEncoder().encode(serviceSecret);

const mockGetReport = vi.fn();

async function actorToken(subject = "verified-account"): Promise<string> {
  return new SignJWT({
    version: 1,
    kind: "account",
    sid: "session-1",
    requestId: "request-1",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class ReportsHttpTestModule {}

Module({
  controllers: [ReportsController],
  providers: [
    { provide: REPORT_QUERY_SERVICE, useValue: { getReport: mockGetReport } },
    { provide: REPORT_QUERY_SERVICE_SECRET, useValue: serviceSecret },
    { provide: REPORT_QUERY_DATABASE, useValue: undefined },
  ],
})(ReportsHttpTestModule);

describe("ReportsController HTTP boundary", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      ReportsHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("derives the actor strictly from the signed token, ignoring query/body owner parameters", async () => {
    mockGetReport.mockReset();
    mockGetReport.mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        state: "pending",
        reportId: "report-1",
        reportVersionId: "ver-1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
        fulfillmentStatus: "generating",
        refreshAfterMs: 5000,
      },
    });

    const token = await actorToken("user-123");
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/report-1?ownerId=hacker&userId=other",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetReport).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "user-123" }),
      "report-1",
    );
  });

  it("success returns strict ReportViewV1 envelope with no leaked sentinels", async () => {
    const readyView: any = {
      version: 1,
      state: "ready",
      reportId: "report-1",
      reportVersionId: "ver-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: {
        sections: [],
        reflectionQuestions: ["Q1", "Q2", "Q3"],
        summaryActions: ["A1"],
        professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
      },
      evidence: [],
      lineage: { supersedesReportVersionId: null },
      provenance: {
        method: "ziwei",
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: "knowledge.vi.v1",
        templateVersion: "template.v1",
        createdAt: "2026-09-05T00:00:00+07:00",
      },
    };
    mockGetReport.mockReset();
    mockGetReport.mockResolvedValue({ ok: true, value: readyView });

    const token = await actorToken("user-123");
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/report-1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.value.reportId).toBe("report-1");
    expect(body.value.htmlContent).toBeUndefined();
    expect(body.value.providerId).toBeUndefined();
    expect(body.value.modelId).toBeUndefined();
    expect(body.value.promptVersion).toBeUndefined();
    expect(response.body).not.toContain("sentinel");
    expect(response.body).not.toContain("lastErrorCode");
  });

  it("collapses internal REPORT_NOT_FOUND and REPORT_FORBIDDEN into identical outward envelopes", async () => {
    const token = await actorToken("user-123");

    mockGetReport.mockReset();
    mockGetReport.mockResolvedValue({
      ok: false,
      error: { code: "REPORT_NOT_FOUND", messageKey: "reports.not_found", retryable: false },
    });

    const notFoundRes = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/missing-report",
      headers: { authorization: `Bearer ${token}` },
    });

    mockGetReport.mockReset();
    mockGetReport.mockResolvedValue({
      ok: false,
      error: { code: "REPORT_FORBIDDEN", messageKey: "reports.forbidden", retryable: false },
    });

    const forbiddenRes = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/forbidden-report",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(notFoundRes.statusCode).toBe(forbiddenRes.statusCode);
    expect(JSON.parse(notFoundRes.body)).toEqual(JSON.parse(forbiddenRes.body));
    expect(JSON.parse(notFoundRes.body)).toEqual({
      ok: false,
      error: {
        code: "REPORT_NOT_FOUND",
        messageKey: "reports.report_not_found",
        retryable: false,
      },
    });
  });

  it("returns 401 when actor bearer token is missing or invalid", async () => {
    const res1 = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/report-1",
    });
    expect(res1.statusCode).toBe(401);

    const res2 = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/reports/report-1",
      headers: { authorization: "Bearer invalid.jwt.token" },
    });
    expect(res2.statusCode).toBe(401);
  });
});
