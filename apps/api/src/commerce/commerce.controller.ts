import { createPaymentInstructions, type PaymentInstructions } from "@lasoviet/backend";
import { timingSafeEqual } from "node:crypto";

import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, NotFoundException, Param, Post, Req, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createDatabaseCommerceRepository, createSePayGateway, createSePayWebhookService } from "@lasoviet/backend";
import {
  AccountLibraryV2Schema,
  CommerceSkuSchema,
  PaymentSelfClaimRequestV1Schema,
  resolveProductTitle,
  WalletBalanceV1Schema,
  WalletHistoryV1Schema,
  type CommerceSku,
  type CurrentActor,
} from "@lasoviet/contracts";
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

function walletIntentRequest(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length !== 4 ||
    typeof value.chartId !== "string" || value.chartId.trim().length === 0 ||
    typeof value.chartVersionId !== "string" || value.chartVersionId.trim().length === 0 ||
    (value.sku !== "ZIWEI-NATAL-EXCERPT-P0" && value.sku !== "ZIWEI-IDENTITY-P0") ||
    (value.locale !== "vi" && value.locale !== "en")) return null;
  return value as {
    chartId: string;
    chartVersionId: string;
    sku: "ZIWEI-NATAL-EXCERPT-P0" | "ZIWEI-IDENTITY-P0";
    locale: "vi" | "en";
  };
}

function walletUnlockRequest(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length !== 4 ||
    typeof value.purchaseIntentId !== "string" || value.purchaseIntentId.trim().length === 0 ||
    typeof value.expectedIntentVersion !== "number" || !Number.isInteger(value.expectedIntentVersion) || value.expectedIntentVersion <= 0 ||
    typeof value.expectedWalletVersion !== "number" || !Number.isInteger(value.expectedWalletVersion) || value.expectedWalletVersion <= 0 ||
    typeof value.idempotencyKey !== "string" || value.idempotencyKey.trim().length === 0 || value.idempotencyKey.length > 200) return null;
  return value as {
    purchaseIntentId: string;
    expectedIntentVersion: number;
    expectedWalletVersion: number;
    idempotencyKey: string;
  };
}

function customerWalletIntent(value: {
  id: string;
  sku: string;
  locale: string;
  amountLa: number;
  status: string;
  stateVersion: number;
  createdAt: string;
}) {
  if (value.id.trim().length === 0 ||
    (value.sku !== "ZIWEI-NATAL-EXCERPT-P0" && value.sku !== "ZIWEI-IDENTITY-P0") ||
    (value.locale !== "vi" && value.locale !== "en") ||
    (value.amountLa !== 240 && value.amountLa !== 720 && value.amountLa !== 960) ||
    !["pending", "completed", "cancelled", "expired"].includes(value.status) ||
    !Number.isInteger(value.stateVersion) || value.stateVersion <= 0 ||
    Number.isNaN(Date.parse(value.createdAt))) throw new Error("WALLET_INTENT_PROJECTION_INVALID");
  return {
    id: value.id,
    productTitle: resolveProductTitle(value.sku as CommerceSku, value.locale),
    locale: value.locale,
    amountLa: value.amountLa,
    status: value.status,
    stateVersion: value.stateVersion,
    createdAt: value.createdAt,
  };
}

function walletError(code: string): never {
  if (code === "WALLET_ACCOUNT_REQUIRED") throw new UnauthorizedException({ code });
  if (code === "WALLET_ACCOUNT_INELIGIBLE") throw new ForbiddenException({ code });
  throw new BadRequestException({ code });
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
    creditExpiresAt?: Date | null;
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
      creditExpiresAt: order.creditExpiresAt ?? null,
    });
  }

  private buildCustomerSafeOrder(order: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    locale: string;
    sku: string;
    paymentCode: string;
    invoiceNumber: string;
    chartId: string;
    createdAt: Date;
    creditApplied: number;
    creditExpiresAt?: Date | null;
  }) {
    const orderLocale = (order.locale === "en" ? "en" : "vi") as "vi" | "en";
    const productTitle = resolveProductTitle(
      order.sku as CommerceSku,
      orderLocale,
    );
    const supportUrl = orderLocale === "en"
      ? `/en/lien-he?order=${encodeURIComponent(order.invoiceNumber)}`
      : `/lien-he?order=${encodeURIComponent(order.invoiceNumber)}`;

    return {
      id: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      locale: order.locale,
      productTitle,
      paymentCode: order.paymentCode,
      chartId: order.chartId,
      createdAt: order.createdAt.toISOString(),
      creditApplied: order.creditApplied ?? 0,
      creditExpiresAt: order.creditExpiresAt ? order.creditExpiresAt.toISOString() : null,
      supportUrl,
    };
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
    if (skuResult.data === "ZIWEI-NATAL-EXCERPT-P0" && body.locale === "en") {
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
            order: this.buildCustomerSafeOrder(projection.order),
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
        order: this.buildCustomerSafeOrder(projection.order),
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

  @Get("wallet/balance")
  async walletBalance(@Headers("authorization") authorization: string | undefined) {
    const result = await this.repository().readWalletBalance(await this.actor(authorization));
    if (!result.ok) walletError(result.error.code);
    return { ok: true, value: WalletBalanceV1Schema.parse(result.value) };
  }

  @Get("wallet/history")
  async walletHistory(@Headers("authorization") authorization: string | undefined) {
    const result = await this.repository().readWalletHistory(await this.actor(authorization));
    if (!result.ok) walletError(result.error.code);
    return { ok: true, value: WalletHistoryV1Schema.parse(result.value) };
  }

  @Post("wallet/purchase-intents")
  @HttpCode(HttpStatus.OK)
  async createWalletPurchaseIntent(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const input = walletIntentRequest(body);
    if (input === null) throw new BadRequestException({ code: "WALLET_INTENT_INVALID" });
    const result = await this.repository().createWalletPurchaseIntent(await this.actor(authorization), input);
    if (!result.ok) walletError(result.code);
    const intent = customerWalletIntent({
      id: result.value.id,
      sku: result.value.sku,
      locale: result.value.locale,
      amountLa: result.value.amountLa,
      status: result.value.status,
      stateVersion: result.value.stateVersion,
      createdAt: result.value.createdAt,
    });
    return { ok: true, value: intent };
  }

  @Post("wallet/unlock")
  @HttpCode(HttpStatus.OK)
  async unlockWallet(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const input = walletUnlockRequest(body);
    if (input === null) throw new BadRequestException({ code: "WALLET_INTENT_INVALID" });
    const result = await this.repository().unlockWalletPurchase(await this.actor(authorization), input);
    if (!result.ok) walletError(result.code);
    const intent = customerWalletIntent({
      id: result.value.intent.id,
      sku: result.value.intent.sku,
      locale: result.value.intent.locale,
      amountLa: result.value.intent.amountLa,
      status: result.value.intent.status,
      stateVersion: result.value.intent.stateVersion,
      createdAt: result.value.intent.createdAt,
    });
    return {
      ok: true,
      value: {
        intent,
        balance: WalletBalanceV1Schema.parse(result.value.balance),
        reportId: result.value.reportId,
      },
    };
  }

  @Get("account/library-v2")
  async libraryV2(@Headers("authorization") authorization: string | undefined) {
    const value = await this.repository().readAccountLibraryV2(await this.actor(authorization));
    return { ok: true, value: AccountLibraryV2Schema.parse(value) };
  }

  @Get("orders/:orderId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const projection = await this.repository().readOrderProjection(await this.actor(authorization), orderId);
    return projection === null
      ? { ok: false, error: { code: "ORDER_NOT_FOUND" } }
      : {
          ok: true,
          value: {
            order: this.buildCustomerSafeOrder(projection.order),
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
