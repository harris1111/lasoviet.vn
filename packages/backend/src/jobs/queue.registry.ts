export const REGISTERED_QUEUES = ["report.generate"] as const;
export type RegisteredQueue = (typeof REGISTERED_QUEUES)[number];

export type ResolveWorkerQueuesResult =
  | { ok: true; value: RegisteredQueue[] }
  | { ok: false; code: "WORKER_QUEUES_INVALID" };

export function resolveWorkerQueues(
  raw: string | undefined = process.env.WORKER_QUEUES,
): ResolveWorkerQueuesResult {
  if (raw === undefined) {
    return { ok: true, value: ["report.generate"] };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, code: "WORKER_QUEUES_INVALID" };
  }
  const tokens = trimmed.split(",").map((token) => token.trim());
  if (tokens.some((token) => token === "")) {
    return { ok: false, code: "WORKER_QUEUES_INVALID" };
  }
  const resolved: RegisteredQueue[] = [];
  for (const token of tokens) {
    if ((REGISTERED_QUEUES as readonly string[]).includes(token)) {
      if (!resolved.includes(token as RegisteredQueue)) {
        resolved.push(token as RegisteredQueue);
      }
    } else {
      return { ok: false, code: "WORKER_QUEUES_INVALID" };
    }
  }
  return { ok: true, value: resolved };
}
