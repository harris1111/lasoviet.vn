import { z } from "zod";

export const INTERNAL_ACTOR_AUDIENCE = "lasoviet-api" as const;
export const INTERNAL_ACTOR_ISSUER = "lasoviet-web" as const;

export type CurrentActor =
  | {
      kind: "account";
      userId: string;
      sessionId: string;
      requestId: string;
    }
  | {
      kind: "anonymous";
      anonymousActorId: string;
      sessionId: string;
      requestId: string;
      expiresAt: string;
    };

export type InternalActorV1 =
  | {
      version: 1;
      kind: "account";
      sub: string;
      sid: string;
      aud: typeof INTERNAL_ACTOR_AUDIENCE;
      exp: number;
      requestId: string;
    }
  | {
      version: 1;
      kind: "anonymous";
      sub: string;
      sid: string;
      aud: typeof INTERNAL_ACTOR_AUDIENCE;
      exp: number;
      requestId: string;
      expiresAt: string;
    };

const actorIdentifier = z.string().trim().min(1);
const offsetTimestamp = z
  .iso.datetime({ offset: true })
  .refine((value) => /[+-]\d{2}:\d{2}$/.test(value), {
    message: "Timestamp must include an explicit offset",
  });

const accountActor = z
  .object({
    version: z.literal(1),
    kind: z.literal("account"),
    sub: actorIdentifier,
    sid: actorIdentifier,
    aud: z.literal(INTERNAL_ACTOR_AUDIENCE),
    exp: z.number().int().positive(),
    requestId: actorIdentifier,
  })
  .strict();

const anonymousActor = z
  .object({
    version: z.literal(1),
    kind: z.literal("anonymous"),
    sub: actorIdentifier,
    sid: actorIdentifier,
    aud: z.literal(INTERNAL_ACTOR_AUDIENCE),
    exp: z.number().int().positive(),
    requestId: actorIdentifier,
    expiresAt: offsetTimestamp,
  })
  .strict();

export const InternalActorV1Schema: z.ZodType<InternalActorV1> =
  z.discriminatedUnion("kind", [accountActor, anonymousActor]);
