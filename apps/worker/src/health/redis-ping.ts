import { Socket } from "node:net";

export type RedisPingResult =
  | { ok: true }
  | { ok: false; code: "WORKER_REDIS_UNREACHABLE" };

export async function pingRedis(
  redisUrl: string | undefined = process.env.REDIS_URL,
  timeoutMs = 3000,
): Promise<RedisPingResult> {
  if (typeof redisUrl !== "string" || redisUrl.trim() === "") {
    return { ok: false, code: "WORKER_REDIS_UNREACHABLE" };
  }

  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    return { ok: false, code: "WORKER_REDIS_UNREACHABLE" };
  }

  if (parsed.protocol !== "redis:") {
    return { ok: false, code: "WORKER_REDIS_UNREACHABLE" };
  }

  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port ? parseInt(parsed.port, 10) : 6379;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return { ok: false, code: "WORKER_REDIS_UNREACHABLE" };
  }

  return new Promise<RedisPingResult>((resolve) => {
    let settled = false;
    const socket = new Socket();

    const finish = (result: RedisPingResult) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => {
      finish({ ok: false, code: "WORKER_REDIS_UNREACHABLE" });
    });

    socket.once("error", () => {
      finish({ ok: false, code: "WORKER_REDIS_UNREACHABLE" });
    });

    socket.connect(port, host, () => {
      socket.write("*1\r\n$4\r\nPING\r\n");
    });

    let buffer = "";
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (buffer.startsWith("+PONG")) {
        finish({ ok: true });
      } else if (buffer.length > 64 || buffer.includes("\r\n")) {
        finish({ ok: false, code: "WORKER_REDIS_UNREACHABLE" });
      }
    });

    socket.once("close", () => {
      finish({ ok: false, code: "WORKER_REDIS_UNREACHABLE" });
    });
  });
}
