import { describe, expect, it } from "vitest";
import { resolveIdentityReportVersionFamily } from "./identity-report-version-family.js";
import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
} from "./identity-report-config.js";

describe("resolveIdentityReportVersionFamily", () => {
  it("resolves v1 only for exact v1 prompt and v1 knowledge pair", () => {
    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V1,
        REPORT_KNOWLEDGE_VERSION_V1,
      ),
    ).toBe("v1");
  });

  it("resolves v2 only for exact v2 prompt and v2 knowledge pair", () => {
    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V2,
        REPORT_KNOWLEDGE_VERSION_V2,
      ),
    ).toBe("v2");
  });

  it("resolves v3 only for exact v3 prompt and v3 knowledge pair", () => {
    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V3,
        REPORT_KNOWLEDGE_VERSION_V3,
      ),
    ).toBe("v3");
  });

  it("returns null for mismatched v1/v2 pairs", () => {
    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V1,
        REPORT_KNOWLEDGE_VERSION_V2,
      ),
    ).toBeNull();

    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V2,
        REPORT_KNOWLEDGE_VERSION_V1,
      ),
    ).toBeNull();

    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V3,
        REPORT_KNOWLEDGE_VERSION_V2,
      ),
    ).toBeNull();

    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V2,
        REPORT_KNOWLEDGE_VERSION_V3,
      ),
    ).toBeNull();
  });

  it("returns null for unknown prompt versions", () => {
    expect(
      resolveIdentityReportVersionFamily(
        "unknown.prompt.v1",
        REPORT_KNOWLEDGE_VERSION_V1,
      ),
    ).toBeNull();

    expect(
      resolveIdentityReportVersionFamily(
        "unknown.prompt.v2",
        REPORT_KNOWLEDGE_VERSION_V2,
      ),
    ).toBeNull();
  });

  it("returns null for unknown knowledge versions", () => {
    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V1,
        "unknown.knowledge.v1",
      ),
    ).toBeNull();

    expect(
      resolveIdentityReportVersionFamily(
        REPORT_PROMPT_VERSION_V2,
        "unknown.knowledge.v2",
      ),
    ).toBeNull();
  });

  it("returns null for empty, null, undefined, or non-string values", () => {
    expect(resolveIdentityReportVersionFamily("", "")).toBeNull();
    expect(resolveIdentityReportVersionFamily(null, null)).toBeNull();
    expect(resolveIdentityReportVersionFamily(undefined, undefined)).toBeNull();
    expect(resolveIdentityReportVersionFamily(123, 456)).toBeNull();
  });
});
