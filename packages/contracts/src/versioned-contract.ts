import { z } from "zod";

export type VersionedContract<TVersion extends number> = {
  readonly version: TVersion;
};

export type AppError<TCode extends string> = {
  code: TCode;
  messageKey: string;
  retryable: boolean;
  field?: string;
  details?: Record<string, string | number | boolean>;
};

export type Result<T, TCode extends string> =
  | { ok: true; value: T }
  | { ok: false; error: AppError<TCode> };

export function createVersionedContractSchema<const TVersion extends number>(
  version: TVersion,
): z.ZodObject<{ version: z.ZodLiteral<TVersion> }> {
  return z.object({ version: z.literal(version) }).strict();
}
