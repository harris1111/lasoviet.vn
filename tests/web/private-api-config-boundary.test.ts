import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const privateApiClient = readFileSync(
  new URL(
    "../../apps/web/src/api/private-api-client.ts",
    import.meta.url,
  ),
  "utf8",
);
const actorToken = readFileSync(
  new URL(
    "../../apps/web/src/auth/create-internal-actor-token.ts",
    import.meta.url,
  ),
  "utf8",
);
const auth = readFileSync(
  new URL("../../apps/web/src/auth/auth.ts", import.meta.url),
  "utf8",
);
const authEmailClient = readFileSync(
  new URL(
    "../../apps/web/src/auth/auth-email-client.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("private API config boundary", () => {
  it("imports environment loading without evaluating the config registry barrel", () => {
    for (const source of [privateApiClient, actorToken, auth, authEmailClient]) {
      expect(source).toContain(
        'from "@lasoviet/config/load-environment"',
      );
      expect(source).not.toContain('from "@lasoviet/config";');
    }
  });
});
