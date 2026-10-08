import { createRecoveryOutboundControlTool } from "@lasoviet/backend";
import { createDatabase, type Database } from "@lasoviet/database";
import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";

export async function runRecoveryOutboundControlTool(database: Database, secret: string, token: string, input?: unknown, now = new Date()) {
  const actor = await verifyInternalActorToken(token, new TextEncoder().encode(secret), Math.floor(now.getTime() / 1000), database);
  const tool = createRecoveryOutboundControlTool(database, () => now);
  return input === undefined ? tool.read(actor) : tool.update(actor, input);
}

async function main() {
  const {DATABASE_URL: databaseUrl, INTERNAL_ACTOR_SECRET: secret, RECOVERY_CONTROL_ACTOR_TOKEN: token} = process.env;
  if (!databaseUrl?.trim() || !secret?.trim() || !token?.trim()) throw new Error("RECOVERY_CONTROL_CONFIG_INVALID");
  const args = process.argv.slice(2);
  if (args.length !== 1 || !["read", "update"].includes(args[0]!)) throw new Error("RECOVERY_CONTROL_INVALID");
  let input: unknown;
  if (args[0] === "update") {
    let payload = "";
    for await (const chunk of process.stdin) {
      payload += String(chunk);
      if (Buffer.byteLength(payload) > 8192) throw new Error("RECOVERY_CONTROL_INVALID");
    }
    input = JSON.parse(payload) as unknown;
  }
  const database = createDatabase(databaseUrl);
  try {
    const result = await runRecoveryOutboundControlTool(database, secret, token, input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.ok) process.exitCode = 1;
  } finally { await (database as Database & {$client: {end(): Promise<unknown>}}).$client.end(); }
}
if (process.argv[1]?.endsWith("recovery-outbound-control-cli.js")) {
  void main().catch(() => { process.stderr.write("RECOVERY_CONTROL_FAILED\n"); process.exitCode = 1; });
}
