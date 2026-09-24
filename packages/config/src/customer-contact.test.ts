import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildCustomerSupportMailto,
  customerContactConfig,
  validateCustomerContactConfig,
} from "./customer-contact";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("customerContactConfig", () => {
  it("loads valid customer contact config with email enabled and others disabled", () => {
    expect(customerContactConfig.email.value).toBe("lasoviet.net@gmail.com");
    expect(customerContactConfig.email.visible).toBe(true);
    expect(customerContactConfig.phone.visible).toBe(false);
    expect(customerContactConfig.zalo.visible).toBe(false);
    expect(customerContactConfig.address.visible).toBe(false);
    expect(customerContactConfig.legalEntity.visible).toBe(false);
    expect(customerContactConfig.social.visible).toBe(false);
  });

  it("throws on invalid customer contact config source", () => {
    expect(() =>
      validateCustomerContactConfig({
        email: { value: "not-an-email", visible: true },
      }),
    ).toThrow("CUSTOMER_CONTACT_CONFIG_INVALID");
  });

  it("builds safe customer support mailto link with prefilled order code", () => {
    const viMailto = buildCustomerSupportMailto({
      orderCode: "LSV-INV-2026-001",
      locale: "vi",
    });
    expect(viMailto).toBe(
      "mailto:lasoviet.net@gmail.com?subject=%5BL%C3%A1%20S%E1%BB%91%20Vi%E1%BB%87t%5D%20H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C6%A1n%20h%C3%A0ng%20LSV-INV-2026-001",
    );

    const enMailto = buildCustomerSupportMailto({
      orderCode: "LSV-INV-2026-001",
      locale: "en",
    });
    expect(enMailto).toBe(
      "mailto:lasoviet.net@gmail.com?subject=%5BLa%20So%20Viet%5D%20Support%20for%20order%20LSV-INV-2026-001",
    );

    const plainMailto = buildCustomerSupportMailto();
    expect(plainMailto).toBe("mailto:lasoviet.net@gmail.com");
  });

  it("verifies --check mode passes on tracked file without mutation", () => {
    const rootDir = resolve(__dirname, "../../..");
    const scriptPath = resolve(__dirname, "../scripts/generate-customer-contact.mjs");
    const generatedPath = resolve(__dirname, "customer-contact.generated.ts");

    const beforeStat = statSync(generatedPath);
    const beforeContent = readFileSync(generatedPath, "utf8");

    // Check mode should succeed on tracked file
    const output = execFileSync(process.execPath, [scriptPath, "--check"], {
      cwd: rootDir,
      encoding: "utf8",
    });
    expect(output).toContain("Customer contact config is in sync.");

    // Check mode must NOT mutate tracked file
    const afterStat = statSync(generatedPath);
    const afterContent = readFileSync(generatedPath, "utf8");
    expect(afterContent).toBe(beforeContent);
    expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs);
  });

  it("verifies --check mode detects drift and rejects in an isolated temp directory without touching tracked files", () => {
    const rootDir = resolve(__dirname, "../../..");
    const scriptPath = resolve(__dirname, "../scripts/generate-customer-contact.mjs");
    const originalConfigPath = resolve(__dirname, "../../../config/customer-contact.json");

    const tempDir = mkdtempSync(join(tmpdir(), "contact-drift-test-"));
    try {
      const tempConfig = join(tempDir, "customer-contact.json");
      const tempOutput = join(tempDir, "customer-contact.generated.ts");

      copyFileSync(originalConfigPath, tempConfig);

      // First generate into temp output
      execFileSync(
        process.execPath,
        [scriptPath, "--config", tempConfig, "--output", tempOutput],
        { cwd: rootDir, encoding: "utf8" },
      );

      // Check mode succeeds when in sync
      const okOutput = execFileSync(
        process.execPath,
        [scriptPath, "--config", tempConfig, "--output", tempOutput, "--check"],
        { cwd: rootDir, encoding: "utf8" },
      );
      expect(okOutput).toContain("Customer contact config is in sync.");

      // Drift output: tamper with tempOutput
      writeFileSync(tempOutput, "// drifted\n", "utf8");
      expect(() => {
        execFileSync(
          process.execPath,
          [scriptPath, "--config", tempConfig, "--output", tempOutput, "--check"],
          { cwd: rootDir, encoding: "utf8", stdio: "pipe" },
        );
      }).toThrow();

      // Missing output file also triggers failure
      rmSync(tempOutput);
      expect(() => {
        execFileSync(
          process.execPath,
          [scriptPath, "--config", tempConfig, "--output", tempOutput, "--check"],
          { cwd: rootDir, encoding: "utf8", stdio: "pipe" },
        );
      }).toThrow();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
