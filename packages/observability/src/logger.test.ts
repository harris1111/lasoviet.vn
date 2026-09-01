import { describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger.js";

describe("structured logger", () => {
  it("redacts sensitive fields from stdout JSON", () => {
    const writes: string[] = [];
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(((chunk: string | Uint8Array) => {
        writes.push(chunk.toString());
        return true;
      }) as typeof process.stdout.write);

    try {
      const logger = createLogger("observability-test", {
        requestId: "request-1",
      });

      logger.info(
        {
          password: "password-secret",
          apiKey: "api-key-secret",
          birthProfile: { name: "Private Person" },
          reportContent: "Private report",
          signedUrl: "https://private.example/signed",
          safeField: "safe",
        },
        "redaction test",
      );
      logger.flush();

      const output = writes.join("");
      expect(output).toContain('"service":"observability-test"');
      expect(output).toContain('"requestId":"request-1"');
      expect(output).toContain("[Redacted]");
      expect(output).not.toContain("password-secret");
      expect(output).not.toContain("api-key-secret");
      expect(output).not.toContain("Private Person");
      expect(output).not.toContain("Private report");
      expect(output).not.toContain("https://private.example/signed");
    } finally {
      stdoutWrite.mockRestore();
    }
  });
});
