import assert from "node:assert";

async function main() {
  console.log("=== Verifying Task #38 (FD-089 Content Line) ===");

  // 1. Verify running web container on port 63423
  console.log("1. Checking web container health...");
  const res = await fetch("http://127.0.0.1:63423/vi");
  assert.strictEqual(res.status, 200, `Expected 200 OK from web container, got ${res.status}`);
  console.log("  Web container responded 200 OK.");

  // 2. Import validator and quality checker from built dist
  console.log("2. Testing validation rules against built dist...");
  const { validateComprehensiveZiweiReportV4 } = await import("../packages/backend/dist/reports/comprehensive-report-validator-v4.js");
  const { validateComprehensiveReportSectionQualityV4, findUncomputedMisfortunePeriods } = await import("../packages/backend/dist/reports/comprehensive-report-quality-v4.js");
  const { VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT } = await import("../packages/backend/dist/reports/comprehensive-report-writer-v4.js");

  // Verify prompt contents per FD-089
  console.log("3. Verifying prompt rules per FD-089...");
  assert(
    VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT.includes("Luận giải trực diện theo Tử Vi truyền thống"),
    "Prompt must include traditional directness instruction",
  );
  assert(
    VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT.includes('KHÔNG đề cập đến cái chết, tuổi thọ, thọ yểu hoặc "khắc chết"'),
    "Prompt must strictly ban death/lifespan/khắc chết per FD-089",
  );
  assert(
    VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT.includes("KHÔNG chẩn đoán bệnh cụ thể"),
    "Prompt must ban specific disease prediction",
  );
  assert(
    VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT.includes("KHÔNG giới thiệu, gợi ý hay bán các nghi lễ, cúng bái"),
    "Prompt must ban selling rituals/giải hạn",
  );
  assert(
    !VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT.includes("KHÔNG đưa ra các dự đoán định mệnh mang tính khẳng định chắc chắn về tai nạn, tử vong, phá sản hoặc phản bội trong cùng câu"),
    "Old softening rule must be removed",
  );
  console.log("  Prompts verified successfully.");

  // 4. Test findUncomputedMisfortunePeriods with synthetic facts
  console.log("4. Testing findUncomputedMisfortunePeriods engine checks...");
  const testFacts = {
    timing: {
      annual: { targetYear: 2026 },
      decadal: { state: "active", yearRange: [2024, 2033], ageRange: [33, 42] },
    },
  };

  // Engine-computed periods pass
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Năm 2026 có nguy cơ hao tài, trắc trở sự nghiệp.", testFacts), []);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Đại vận 2024-2033 có nguy cơ kiện tụng.", testFacts), []);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Năm 2027 có rủi ro đổ vỡ hợp đồng.", testFacts), []);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Ở độ tuổi 35 có nguy cơ hao hụt tiền.", testFacts), []);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Năm 2026 có 2 tháng hạn cần chú ý dòng tiền.", testFacts), []);

  // Uncomputed periods rejected
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Năm 2045 bạn sẽ phá sản.", testFacts), ["Năm 2045"]);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Ngày 12 tháng 3 sẽ gặp tai nạn.", testFacts), ["Ngày 12 tháng 3"]);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Tháng 8 có hạn kiện tụng lớn.", testFacts), ["Tháng 8"]);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Ở tuổi 65 bạn sẽ phá sản.", testFacts), ["tuổi 65"]);
  assert.deepStrictEqual(findUncomputedMisfortunePeriods("Giai đoạn 2038-2047 có nhiều tai ách.", testFacts), ["2038-2047"]);
  console.log("  Uncomputed misfortune period detection verified successfully.");

  console.log("All smoke checks passed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
