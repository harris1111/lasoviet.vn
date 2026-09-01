import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { loadEnvironment } from "@lasoviet/config";
import {
  HealthV1Schema,
  type HealthV1,
} from "@lasoviet/contracts";

export type DependencyProbe = () => boolean | Promise<boolean>;

export type HealthProbes = {
  postgres: DependencyProbe;
  redis: DependencyProbe;
  config: DependencyProbe;
  ai?: DependencyProbe;
  cloudS3?: DependencyProbe;
};

type DependencyStatus = {
  name: string;
  status: "ready" | "unready" | "degraded";
};

function checkedAt(): string {
  return new Date().toISOString().replace("Z", "+00:00");
}

async function probe(probeFunction: DependencyProbe): Promise<boolean> {
  try {
    return (await probeFunction()) === true;
  } catch {
    return false;
  }
}

function healthStatus(
  required: DependencyStatus[],
  degraded: DependencyStatus[],
): HealthV1["status"] {
  if (required.some((dependency) => dependency.status === "unready")) {
    return "unready";
  }
  return degraded.length > 0 ? "degraded" : "ok";
}

export async function getHealth(probes: HealthProbes): Promise<HealthV1> {
  const requiredEntries: DependencyStatus[] = await Promise.all(
    (
      [
        ["postgres", probes.postgres],
        ["redis", probes.redis],
        ["config", probes.config],
      ] as const
    ).map(async ([name, dependencyProbe]) => ({
      name,
      status: (await probe(dependencyProbe)) ? "ready" : "unready",
    })),
  );

  const optionalProbes: Array<readonly [string, DependencyProbe]> = [];
  if (probes.ai !== undefined) {
    optionalProbes.push(["ai", probes.ai]);
  }
  if (probes.cloudS3 !== undefined) {
    optionalProbes.push(["cloudS3", probes.cloudS3]);
  }

  const optionalEntries: DependencyStatus[] = await Promise.all(
    optionalProbes.map(async ([name, dependencyProbe]) => ({
      name,
      status: (await probe(dependencyProbe)) ? "ready" : "degraded",
    })),
  );

  const degraded = optionalEntries.filter(
    (dependency) => dependency.status === "degraded",
  );
  const health = {
    version: 1 as const,
    status: healthStatus(requiredEntries, degraded),
    required: requiredEntries,
    degraded,
    checkedAt: checkedAt(),
  };

  return HealthV1Schema.parse(health);
}

function defaultHealthProbes(): HealthProbes {
  const environment = loadEnvironment(process.env);
  const values = environment.ok ? environment.value : undefined;

  return {
    postgres: () => values?.databaseUrl !== undefined,
    redis: () => values?.redisUrl !== undefined,
    config: () => environment.ok,
    ...(values?.ai.enabled ? { ai: async () => false } : {}),
    ...(values?.cloudS3.enabled ? { cloudS3: async () => false } : {}),
  };
}

function liveHealth(): HealthV1 {
  return HealthV1Schema.parse({
    version: 1,
    status: "ok",
    required: [],
    degraded: [],
    checkedAt: checkedAt(),
  });
}

@Controller("health")
export class HealthController {
  private readonly probes: HealthProbes;

  constructor(@Optional() probes?: HealthProbes) {
    this.probes = probes ?? defaultHealthProbes();
  }

  @Get("live")
  @HttpCode(HttpStatus.OK)
  live(): HealthV1 {
    return liveHealth();
  }

  @Get("ready")
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthV1> {
    const health = await getHealth(this.probes);
    if (health.status === "unready") {
      throw new ServiceUnavailableException({
        code: "REQUIRED_DEPENDENCY_UNREADY",
        health,
      });
    }
    return health;
  }
}
