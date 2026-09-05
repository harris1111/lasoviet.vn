import { HealthV1Schema } from "@lasoviet/contracts";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const health = HealthV1Schema.parse({
    version: 1,
    status: "ok",
    required: [],
    degraded: [],
    checkedAt: new Date().toISOString().replace("Z", "+00:00"),
  });

  return NextResponse.json(health);
}
