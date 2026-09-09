import { createPaymentInstructions, type PaymentInstructions } from "@lasoviet/backend";
import { timingSafeEqual } from "node:crypto";

import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, NotFoundException, Param, Post, Req, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createDatabaseCommerceRepository, createSePayGateway, createSePayWebhookService } from "@lasoviet/backend";
import { CommerceSkuSchema, PaymentSelfClaimRequestV1Schema, type CurrentActor } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { ActorTokenError, verifyInternalActorToken } from "../auth/internal-actor.guard.js";

export const COMMERCE_DATABASE = Symbol("COMMERCE_DATABASE");
export const COMMERCE_ACTOR_SECRET = Symbol("COMMERCE_ACTOR_SECRET");
export const COMMERCE_SEPAY_SECRET = Symbol("COMMERCE_SEPAY_SECRET");
export const COMMERCE_INGRESS_SECRET = Symbol("COMMERCE_INGRESS_SECRET");
export const COMMERCE_SEPAY_ENV = Symbol("COMMERCE_SEPAY_ENV");
export const COMMERCE_SEPAY_MERCHANT = Symbol("COMMERCE_SEPAY_MERCHANT");
export const COMMERCE_RETURN_ORIGIN = Symbol("COMMERCE_RETURN_ORIGIN");
export const COMMERCE_ORDER_TTL_SECONDS = Symbol("COMMERCE_ORDER_TTL_SECONDS");
export const COMMERCE_SEPAY_WEBHOOK_SECRET = Symbol("COMMERCE_SEPAY_WEBHOOK_SECRET");
export const COMMERCE_SEPAY_BANK_CODE = Symbol("COMMERCE_SEPAY_BANK_CODE");
export const COMMERCE_SEPAY_ACCOUNT_NUMBER = Symbol("COMMERCE_SEPAY_ACCOUNT_NUMBER");
export const COMMERCE_SEPAY_ACCOUNT_HOLDER = Symbol("COMMERCE_SEPAY_ACCOUNT_HOLDER");

function checkoutPath(locale: "vi" | "en", orderId: string): string {
  return locale === "en" ? `/en/thanh-toan/${orderId}` : `/thanh-toan/${orderId}`;
}

function checkoutLocale(locale: string): "vi" | "en" {
  if (locale === "vi" || locale === "en") return locale;
  throw new Error("COMMERCE_ORDER_LOCALE_INVALID");
}

function equal(a: string | undefined, b: string): boolean {
  if (a === undefined) return false;
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Controller("commerce")
export class CommerceController {
  constructor(
    @Inject(COMMERCE_DATABASE) private readonly database: Database,
    @Inject(COMMERCE_ACTOR_SECRET) private readonly actorSecret: string,
    @Inject(COMMERCE_SEPAY_SECRET) private readonly sepaySecret: string | undefined,
    @Inject(COMMERCE_INGRESS_SECRET) private readonly ingressSecret: string,
    @Inject(COMMERCE_SEPAY_ENV) private readonly sepayEnvironment: "disabled" | "sandbox" | "production",
    @Inject(COMMERCE_SEPAY_MERCHANT) private readonly merchantId: string | undefined,
    @Inject(COMMERCE_RETURN_ORIGIN) private readonly origin: string,
    @Inject(COMMERCE_ORDER_TTL_SECONDS) private readonly orderTtlSeconds: number | undefined,
    @Inject(COMMERCE_SEPAY_WEBHOOK_SECRET) private readonly sepayWebhookSecret: string | undefined,
    @Inject(COMMERCE_SEPAY_BANK_CODE) private readonly bankCode: string | undefined,
    @Inject(COMMERCE_SEPAY_ACCOUNT_NUMBER) private readonly accountNumber: string | undefined,
    @Inject(COMMERCE_SEPAY_ACCOUNT_HOLDER) private readonly accountHolder: string | undefined,
  ) {}

  private repository() {
    return createDatabaseCommerceRepository(this.database, {
      orderTtlSeconds: this.orderTtlSeconds ?? 86400,
    });
  }

  private async actor(authorization: string | undefined): Promise<CurrentActor> {
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException({ code: "ACTOR_TOKEN_INVALID" });
    try {
      return await verifyInternalActorToken(authorization.slice(7), new TextEncoder().encode(this.actorSecret), undefined, this.database);
    } catch (error) {
      throw new UnauthorizedException({ code: error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID" });
    }
  }

  private buildPaymentInstructions(order: {
    paymentCode: string;
    amount: number;
    createdAt: Date;
  }): PaymentInstructions {
    return createPaymentInstructions({
      bankCode: this.bankCode ?? "",
      accountNumber: this.accountNumber ?? "",
      accountHolder: this.accountHolder ?? "",
      amount: order.amount,
      currency: "VND",
      paymentCode: order.paymentCode,
      createdAt: order.createdAt,
      orderTtlSeconds: this.orderTtlSeconds ?? 86400,
    });
  }

  @Post("orders")
  @HttpCode(HttpStatus.OK)
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    if (typeof body !== "object" || body === null || !("chartId" in body) || !("sku" in body) || !("locale" in body) || typeof body.chartId !== "string" || typeof body.sku !== "string" || (body.locale !== "vi" && body.locale !== "en")) {
      return { ok: false, error: { code: "COMMERCE_ORDER_INVALID" } };
    }
    const skuResult = CommerceSkuSchema.safeParse(body.sku);
    if (!skuResult.success) {
      return { ok: false, error: { code: "COMMERCE_ORDER_INVALID" } };
    }
    const actor = await this.actor(authorization);
    const result = await this.repository().createOrder(actor, body.chartId, skuResult.data, body.locale);
    if (!result.ok) {
      if (result.code === "CHECKOUT_ACCOUNT_REQUIRED") {
        throw new UnauthorizedException({ code: result.code });
      }
      if (result.code === "CHECKOUT_EMAIL_VERIFICATION_REQUIRED") {
        throw new ForbiddenException({ code: result.code });
      }
      if (result.code === "CHECKOUT_PAYMENTS_PAUSED") {
        throw new ServiceUnavailableException({ code: result.code });
      }
      return { ok: false, error: { code: result.code } };
    }
    if (this.sepayEnvironment === "disabled") {
      try {
        if (result.value.status === "pending") {
          const paidResult = await this.repository().recordPaid({
            invoiceNumber: result.value.invoiceNumber,
            matchMethod: "invoice_number",
            providerEventId: `disabled-autopay:${result.value.id}`,
            amount: result.value.amount,
            currency: result.value.currency,
            traceId: actor.requestId,
          });
          if (!paidResult.ok) {
            return { ok: false, error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" } };
          }
        }
        const projection = await this.repository().readOrderProjection(actor, result.value.id);
        if (projection === null) {
          return { ok: false, error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" } };
        }
        return {
          ok: true,
          value: {
            order: {
              id: projection.order.id,
              status: projection.order.status,
              amount: projection.order.amount,
              currency: projection.order.currency,
              locale: projection.order.locale,
            },
            paymentInstructions: null,
            reportId: projection.reportId,
          },
        };
      } catch {
        return { ok: false, error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" } };
      }
    }

    const projection = await this.repository().readOrderProjection(actor, result.value.id);
    if (projection === null) {
      return { ok: false, error: { code: "COMMERCE_ORDER_CREATE_FAILED" } };
    }
    return {
      ok: true,
      value: {
        order: {
          id: projection.order.id,
          status: projection.order.status,
          amount: projection.order.amount,
          currency: projection.order.currency,
          locale: projection.order.locale,
        },
        paymentInstructions: this.buildPaymentInstructions(projection.order),
        reportId: projection.reportId,
      },
    };
  }

  @Get(["library", "account/library"])
  async library(@Headers("authorization") authorization: string | undefined) {
    const actor = await this.actor(authorization);
    const value = await this.repository().readAccountLibrary(actor);
    return { ok: true, value };
  }

  @Get(["orders", "history", "order-history"])
  async history(@Headers("authorization") authorization: string | undefined) {
    const actor = await this.actor(authorization);
    const value = await this.repository().readOrderHistory(actor);
    return { ok: true, value };
  }

  @Get("orders/:orderId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const projection = await this.repository().readOrderProjection(await this.actor(authorization), orderId);
    return projection === null
      ? { ok: false, error: { code: "ORDER_NOT_FOUND" } }
      : {
          ok: true,
          value: {
            order: {
              id: projection.order.id,
              status: projection.order.status,
              amount: projection.order.amount,
              currency: projection.order.currency,
              locale: projection.order.locale,
            },
            paymentInstructions: this.sepayEnvironment === "disabled"
              ? null
              : this.buildPaymentInstructions(projection.order),
            reportId: projection.reportId,
          },
        };
  }

  @Post("payments/self-claim")
  @HttpCode(HttpStatus.OK)
  async selfClaim(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = PaymentSelfClaimRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: "PAYMENT_CLAIM_INVALID" });
    }
    let actor: CurrentActor;
    try {
      actor = await this.actor(authorization);
    } catch {
      throw new UnauthorizedException({ code: "PAYMENT_CLAIM_ACCOUNT_REQUIRED" });
    }
    const result = await this.repository().claimUnmatchedPayment(actor, {
      amount: parsed.data.amount,
      transferredAtLocal: parsed.data.transferredAtLocal,
    });
    if (!result.ok) {
      switch (result.code) {
        case "PAYMENT_CLAIM_INVALID":
          throw new BadRequestException({ code: result.code });
        case "PAYMENT_CLAIM_ACCOUNT_REQUIRED":
          throw new UnauthorizedException({ code: result.code });
        case "PAYMENT_CLAIM_EMAIL_VERIFICATION_REQUIRED":
          throw new ForbiddenException({ code: result.code });
        case "PAYMENT_CLAIM_RATE_LIMITED":
          throw new HttpException({ code: result.code }, HttpStatus.TOO_MANY_REQUESTS);
        case "PAYMENT_CLAIM_NOT_FOUND":
          throw new NotFoundException({ code: result.code });
        default:
          throw new NotFoundException({ code: "PAYMENT_CLAIM_NOT_FOUND" });
      }
    }
    return {
      ok: true,
      value: result.value,
    };
  }

  @Post("webhooks/sepay")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers("x-internal-ingress-secret") ingress: string | undefined,
    @Headers("x-secret-key") secret: string | undefined,
    @Headers("x-sepay-signature") signature: string | undefined,
    @Headers("x-sepay-timestamp") timestamp: string | undefined,
    @Req() request: { rawBody?: Buffer },
  ) {
    if (this.sepayEnvironment === "disabled") {
      throw new ServiceUnavailableException({ code: "SEPAY_DISABLED" });
    }
    if (!equal(ingress, this.ingressSecret)) throw new UnauthorizedException({ code: "INGRESS_AUTH_INVALID" });
    const rawBody = request.rawBody?.toString("utf8");
    if (rawBody === undefined) throw new BadRequestException({ code: "SEPAY_RAW_BODY_MISSING" });
    const repo = this.repository();
    const result = await createSePayWebhookService({
      secretKey: this.sepaySecret ?? "",
      webhookSecret: this.sepayWebhookSecret ?? "",
      recordPaid: (input) => repo.recordPaid(input),
      recordUnmatched: (input) => repo.recordUnmatched(input),
    }).handle({
      rawBody,
      secretHeader: secret,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "sepay-webhook",
    });
    if (result.ok) return { success: true };
    switch (result.error.code) {
      case "SEPAY_SIGNATURE_INVALID":
        throw new UnauthorizedException({ code: result.error.code });
      case "SEPAY_PAYLOAD_INVALID":
        throw new BadRequestException({ code: result.error.code });
      case "ORDER_NOT_FOUND":
        throw new NotFoundException({ code: result.error.code });
      default:
        throw new ConflictException({ code: result.error.code });
    }
  }
}
