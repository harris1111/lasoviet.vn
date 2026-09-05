import { z } from "zod";

export type RequiredDependencyHealthV1 = {
  name: string;
  status: "ready" | "unready";
};

export type DegradedDependencyHealthV1 = {
  name: string;
  status: "degraded";
};

export type HealthV1 = {
  version: 1;
  status: "ok" | "degraded" | "unready";
  required: RequiredDependencyHealthV1[];
  degraded: DegradedDependencyHealthV1[];
  checkedAt: string;
};

const dependencyName = z.string().trim().min(1);
const offsetTimestamp = z
  .iso.datetime({ offset: true })
  .refine((value) => /[+-]\d{2}:\d{2}$/.test(value), {
    message: "Timestamp must include an explicit offset",
  });

const requiredDependency = z
  .object({
    name: dependencyName,
    status: z.enum(["ready", "unready"]),
  })
  .strict();

const degradedDependency = z
  .object({
    name: dependencyName,
    status: z.literal("degraded"),
  })
  .strict();

export const HealthV1Schema: z.ZodType<HealthV1> = z
  .object({
    version: z.literal(1),
    status: z.enum(["ok", "degraded", "unready"]),
    required: z.array(requiredDependency),
    degraded: z.array(degradedDependency),
    checkedAt: offsetTimestamp,
  })
  .strict()
  .superRefine((health, context) => {
    const hasUnreadyRequired = health.required.some(
      (dependency) => dependency.status === "unready",
    );

    if (health.status === "ok") {
      if (hasUnreadyRequired || health.degraded.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["status"],
          message: "Ok health cannot contain unready or degraded dependencies",
        });
      }
    }

    if (health.status === "degraded") {
      if (hasUnreadyRequired || health.degraded.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["status"],
          message: "Degraded health requires ready dependencies and degradation",
        });
      }
    }

    if (
      health.status === "unready" &&
      !health.required.some((dependency) => dependency.status === "unready")
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Unready health requires an unready dependency",
      });
    }
  });
