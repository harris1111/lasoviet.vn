import { timingSafeEqual } from "node:crypto";

import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpStatus, Inject, NotFoundException, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
import { createDatabaseCommerceRepository, createSePayGateway, createSePayWebhookService } from "@lasoviet/backend";
import type { CurrentActor } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { ActorTokenError, verifyInternalActorToken } from "../auth/internal-actor.guard.js";

export const COMMERCE_DATABASE = Symbol("COMMERCE_DATABASE");
export const COMMERCE_ACTOR_SECRET = Symbol("COMMERCE_ACTOR_SECRET");
export const COMMERCE_SEPAY_SECRET = Symbol("COMMERCE_SEPAY_SECRET");
export const COMMERCE_INGRESS_SECRET = Symbol("COMMERCE_INGRESS_SECRET");
export const COMMERCE_SEPAY_ENV = Symbol("COMMERCE_SEPAY_ENV");
export const COMMERCE_SEPAY_MERCHANT = Symbol("COMMERCE_SEPAY_MERCHANT");
export const COMMERCE_RETURN_ORIGIN = Symbol("COMMERCE_RETURN_ORIGIN");

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
    @Inject(COMMERCE_SEPAY_SECRET) private readonly sepaySecret: string,
    @Inject(COMMERCE_INGRESS_SECRET) private readonly ingressSecret: string,
    @Inject(COMMERCE_SEPAY_ENV) private readonly sepayEnvironment: "sandbox" | "production",
    @Inject(COMMERCE_SEPAY_MERCHANT) private readonly merchantId: string,
    @Inject(COMMERCE_RETURN_ORIGIN) private readonly origin: string,
  ) {}

  private async actor(authorization: string | undefined): Promise<CurrentActor> {
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException({ code: "ACTOR_TOKEN_INVALID" });
    try {
      return await verifyInternalActorToken(authorization.slice(7), new TextEncoder().encode(this.actorSecret), undefined, this.database);
    } catch (error) {
      throw new UnauthorizedException({ code: error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID" });
    }
  }

  private payment(order: { id: string; invoiceNumber: string; amount: number }) {
    const path = `/thanh-toan/${order.id}`;
    return createSePayGateway({ environment: this.sepayEnvironment, merchantId: this.merchantId, secretKey: this.sepaySecret }).createPayment({
      id: order.id, invoiceNumber: order.invoiceNumber, amount: order.amount, currency: "VND",
      description: "Zi Wei identity report", successUrl: `${this.origin}${path}`, errorUrl: `${this.origin}${path}`, cancelUrl: `${this.origin}${path}`,
    });
  }

  @Post("orders")
  @HttpCode(HttpStatus.OK)
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    if (typeof body !== "object" || body === null || !("chartId" in body) || !("sku" in body) || !("locale" in body) || typeof body.chartId !== "string" || typeof body.sku !== "string" || (body.locale !== "vi" && body.locale !== "en")) {
      return { ok: false, error: { code: "COMMERCE_ORDER_INVALID" } };
    }
    const result = await createDatabaseCommerceRepository(this.database).createOrder(await this.actor(authorization), body.chartId, body.sku, body.locale);
    if (!result.ok) {
      if (result.code === "CHECKOUT_ACCOUNT_REQUIRED") {
        throw new UnauthorizedException({ code: result.code });
      }
      if (result.code === "CHECKOUT_EMAIL_VERIFICATION_REQUIRED") {
        throw new ForbiddenException({ code: result.code });
      }
      return { ok: false, error: { code: result.code } };
    }
    return { ok: true, value: { order: result.value, payment: this.payment(result.value) } };
  }

  @Get("orders/:orderId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const order = await createDatabaseCommerceRepository(this.database).readOrder(await this.actor(authorization), orderId);
    return order === null
      ? { ok: false, error: { code: "ORDER_NOT_FOUND" } }
      : { ok: true, value: { order, payment: this.payment(order) } };
  }

  @Post("webhooks/sepay")
  @HttpCode(HttpStatus.OK)
  async webhook(@Headers("x-internal-ingress-secret") ingress: string | undefined, @Headers("x-secret-key") secret: string | undefined, @Req() request: { rawBody?: Buffer }) {
    if (!equal(ingress, this.ingressSecret)) throw new UnauthorizedException({ code: "INGRESS_AUTH_INVALID" });
    const rawBody = request.rawBody?.toString("utf8");
    if (rawBody === undefined) throw new BadRequestException({ code: "SEPAY_RAW_BODY_MISSING" });
    const result = await createSePayWebhookService({
      secretKey: this.sepaySecret,
      recordPaid: (input) => createDatabaseCommerceRepository(this.database).recordPaid(input),
    }).handle({ rawBody, secretHeader: secret, traceId: "sepay-ipn" });
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
