import { spawnSync } from "node:child_process";

export type TianjiReferenceInput = {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  localHour: number;
};

export type TianjiReferenceResult =
  | { ok: true; lifePalaceBranch: string }
  | { ok: false; reason: "REFERENCE_UNAVAILABLE" | "REFERENCE_FAILED" };

const program = [
  "import json, sys",
  "from tianji.ziwei import create_ziwei_chart",
  "value = json.loads(sys.stdin.read())",
  "chart = create_ziwei_chart(value['lunarYear'], value['lunarMonth'], value['lunarDay'], value['localHour'])",
  "print(json.dumps({'lifePalaceBranch': chart.palaces['命宫'].branch}))",
].join("; ");

export function runTianjiReference(
  referenceRoot: string | undefined,
  input: TianjiReferenceInput,
): TianjiReferenceResult {
  if (referenceRoot === undefined) {
    return { ok: false, reason: "REFERENCE_UNAVAILABLE" };
  }
  const execution = spawnSync(
    "py",
    ["-3", "-c", program],
    {
      cwd: referenceRoot,
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, PYTHONPATH: `${referenceRoot}\\src` },
    },
  );
  if (execution.status !== 0) {
    return { ok: false, reason: "REFERENCE_FAILED" };
  }
  return {
    ok: true,
    lifePalaceBranch: (JSON.parse(execution.stdout) as { lifePalaceBranch: string })
      .lifePalaceBranch,
  };
}
