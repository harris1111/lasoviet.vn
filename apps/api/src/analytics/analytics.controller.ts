import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  type AnalyticsIngestSuccessV1,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";
import {
  createAnalyticsService,
} from "@lasoviet/backend";

import { AnalyticsServiceGuard } from "./analytics-service.guard.js";

export const ANALYTICS_SERVICE = Symbol("ANALYTICS_SERVICE");

@Controller("internal/analytics")
export class AnalyticsController {
  constructor(
    @Inject(ANALYTICS_SERVICE)
    private readonly analyticsService: ReturnType<
      typeof createAnalyticsService
    >,
  ) {}

  @Post("events")
  @UseGuards(AnalyticsServiceGuard)
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Req()
    req: {
      analyticsIngestRequest?: PrivateAnalyticsIngestRequestV1;
      body?: unknown;
    },
  ): Promise<AnalyticsIngestSuccessV1> {
    const request = req.analyticsIngestRequest;
    if (!request) {
      throw new BadRequestException({ code: "ANALYTICS_REQUEST_INVALID" });
    }

    const result = await this.analyticsService.ingest({
      idempotencyKey: request.idempotencyKey,
      visitorId: request.visitorId,
      userId: request.userId,
      name: request.event.name,
      properties: request.event.properties,
      ip: request.ip,
      userAgent: request.userAgent,
      referrer: request.referrer,
      utmSource: request.utmSource,
      utmMedium: request.utmMedium,
      utmCampaign: request.utmCampaign,
      utmContent: request.utmContent,
      utmTerm: request.utmTerm,
      deviceClass: request.deviceClass,
      locale: request.locale,
      pathname: request.pathname,
      occurredAt: new Date(request.occurredAt),
    });

    if (!result.ok) {
      const errorPayload = {
        ok: false as const,
        error: result.error,
      };
      if (
        result.error.code === "IDEMPOTENCY_KEY_CONFLICT" ||
        result.error.code === "VISITOR_ACCOUNT_CONFLICT"
      ) {
        throw new ConflictException(errorPayload);
      }
      if (result.error.code === "PROFILE_NOT_FOUND") {
        throw new NotFoundException(errorPayload);
      }
      if (result.error.code === "PROFILE_FORBIDDEN") {
        throw new ForbiddenException(errorPayload);
      }
      throw new BadRequestException(errorPayload);
    }

    return {
      ok: true,
      value: {
        replayed: result.value.replayed,
      },
    };
  }
}
