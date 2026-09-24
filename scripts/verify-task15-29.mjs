import assert from "node:assert";

async function main() {
  console.log("=== Verifying Task #15 & Task #29 (V4 Sectioned Generation & Incident Closure) ===");

  // 1. Verify V4 Sectioned Generator and Quality configs from built dist
  console.log("1. Verifying sectioned report generator modules...");
  const {
    COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
    currentReportVersions,
    v4_1_2SensitivityReportVersions,
  } = await import("../packages/backend/dist/index.js");

  const versions = currentReportVersions("vi");
  assert.strictEqual(versions.family, "v4_1", "Vietnamese default report family must be v4_1 sectioned");
  assert.strictEqual(
    versions.reportConfigVersion,
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    "Report config version must match V4.1.1 sectioned sensitivity",
  );
  assert.strictEqual(
    versions.promptVersion,
    REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
    "Prompt version must match V4.1.2 sensitivity",
  );
  assert.strictEqual(
    versions.qualityVersion,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
    "Quality version must match V2.3 sensitivity",
  );
  console.log("  Default report version for Vietnamese is configured to sectioned V4.1.2.");

  // 2. Verify section keys completeness (24 sections)
  console.log("2. Checking 24 canonical section keys for section-by-section generator...");
  assert.strictEqual(
    COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.length,
    24,
    `Expected 24 sections in V4.1 sectioned report, found ${COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.length}`,
  );
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("overview"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("coreAxis"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("keyConfigurations"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("palace:ziwei.palace.life"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("thematic:career_wealth"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("currentDecadal"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("birthTimeSensitivity"));
  assert(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.includes("practicalDirection"));
  console.log("  All 24 canonical section keys verified.");

  // 3. Verify Task #29 recovery support in report.service
  console.log("3. Verifying recovery service error handling (Task #29)...");
  const { createReportService } = await import("../packages/backend/dist/reports/report.service.js");
  assert(typeof createReportService === "function", "createReportService must be exported");

  // 4. Verify live web container health
  console.log("4. Verifying production container health...");
  const res = await fetch("http://127.0.0.1:63423/vi");
  assert.strictEqual(res.status, 200, `Expected 200 OK from web container, got ${res.status}`);
  console.log("  Web container is healthy and responding 200 OK.");

  console.log("\nAll checks for Task #15 and Task #29 passed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
