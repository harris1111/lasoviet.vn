import { createHmac } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TIER_2_ENTITLEMENT_SCOPE,
  TIER_2_V4_ENTITLEMENT_SCOPE,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
} from "../packages/contracts/dist/index.js";
import {
  authSessions,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceItems,
  evidenceSets,
  reportReservations,
  reportSourceSnapshots,
  reportVersions,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "../packages/database/dist/index.js";

export const WP13_FIXTURE_EVIDENCE_KEYS = [
  "ziwei.identity.life-palace",
  "ziwei.identity.body-palace",
  "ziwei.identity.transformations",
];

export const WP13_V4_REPORT_EVIDENCE_KEYS = {
  natal: "natal.ziwei.palace.life",
  starZiwei: "natal.ziwei.star.purple-emperor",
  starTianfu: "natal.ziwei.star.tianfu",
  decadal: "decadal.state.active",
  annual: "annual.target-year.2026",
};

function validateEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL is required");
  }

  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  if (!betterAuthSecret || betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  const isLoopback =
    parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";
  const isWp13Port = parsedUrl.port === "55435";
  const isWp13Db = parsedUrl.pathname === "/lasoviet_wp13";

  if (!isLoopback || !isWp13Port || !isWp13Db) {
    throw new Error(
      `Refusing non-loopback/non-WP-13 database URL: ${parsedUrl.hostname}:${parsedUrl.port}${parsedUrl.pathname}`,
    );
  }

  return { databaseUrl, betterAuthSecret };
}

function signSessionToken(token, secret) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

export function buildFixtureTemporalValues(fixtureNow) {
  return {
    pendingOrderCreatedAt: new Date(fixtureNow.getTime()),
    sessionExpiresAt: new Date(fixtureNow.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}

export function buildNormalizedBirthProfile({ displayName, birth }) {
  const originalInput = {
    version: 1,
    calendar: { kind: "solar", date: birth.date },
    time: { precision: "exact_minute", localTime: birth.time },
    timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
    placeLabel: "Vietnam",
    displayName,
    consentVersion: "privacy.v1",
    locale: "vi",
    gender: birth.gender,
  };

  return {
    version: 1,
    originalInput,
    normalizedCalendar: originalInput.calendar,
    normalizedTime: originalInput.time,
    normalizedPlaceLabel: originalInput.placeLabel,
    timezoneProvenance: {
      source: "iana",
      ianaZone: "Asia/Ho_Chi_Minh",
      runtime: "Intl",
    },
    normalizationWarnings: [],
    limitations: [],
  };
}

export function buildBirthProfileRevisionFixture({ displayName, birth }) {
  const normalizedProfile = buildNormalizedBirthProfile({ displayName, birth });
  const { originalInput, ...normalizedInput } = normalizedProfile;
  return { originalInput, normalizedInput };
}

function buildFixturePalaceStars() {
  return [
    {
      id: "ziwei.star.purple-emperor",
      brightness: "ziwei.brightness.exalted",
      category: "major",
    },
    {
      id: "ziwei.star.tianfu",
      brightness: "ziwei.brightness.prosperous",
      category: "major",
    },
  ];
}

export function buildNormalizedZiweiChart() {
  const branches = [
    "ziwei.branch.rat",
    "ziwei.branch.ox",
    "ziwei.branch.tiger",
    "ziwei.branch.rabbit",
    "ziwei.branch.dragon",
    "ziwei.branch.snake",
    "ziwei.branch.horse",
    "ziwei.branch.goat",
    "ziwei.branch.monkey",
    "ziwei.branch.rooster",
    "ziwei.branch.dog",
    "ziwei.branch.pig",
  ];

  return {
    version: 1,
    systemId: "ziwei",
    palaces: ZIWEI_PALACE_IDS.map((id, index) => ({
      id,
      earthlyBranchId: branches[index],
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: id === "ziwei.palace.life",
      stars: buildFixturePalaceStars(),
    })),
    transformations: [{
      starId: "ziwei.star.purple-emperor",
      id: "ziwei.transformation.prosperity",
    }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-09T08:00:00+00:00",
      limitations: ["SYNTHETIC_WP13_FIXTURE"],
    },
  };
}

export function buildIdentityEvidenceItems(evidenceSetId) {
  const limitations = ["Synthetic WP-13 fixture data"];
  const item = (suffix, id, factReferences) => ({
    id: `evitem-${suffix}-${evidenceSetId}`,
    evidenceSetId,
    evidenceKey: id,
    payload: {
      id,
      factReferences,
      confidence: "moderate",
      interpretationBounds: [
        "Use only as a reflective identity signal, not a deterministic outcome.",
        "Do not infer health, legal, financial, or relationship outcomes.",
      ],
      interpretationBoundCodes: ["reflective_identity_only"],
      limitations,
      riskTags: ["identity", "determinism", "birth-time"],
      allowedActionCategories: ["reflect", "explore"],
    },
  });

  return [
    item("life", WP13_FIXTURE_EVIDENCE_KEYS[0], [
      "palaces.ziwei.palace.life.earthlyBranchId",
      "soulPalaceId",
    ]),
    item("body", WP13_FIXTURE_EVIDENCE_KEYS[1], [
      "palaces.ziwei.palace.career.earthlyBranchId",
      "bodyPalaceId",
    ]),
    item("transformations", WP13_FIXTURE_EVIDENCE_KEYS[2], [
      "transformations",
      "provenance.ruleSetId",
    ]),
  ];
}

export function buildReportSourceSnapshot({
  reportId,
  reportVersionId,
  chartVersionId,
  snapshotHash,
  selectedFrame,
}) {
  const branches = [
    "ziwei.branch.rat",
    "ziwei.branch.ox",
    "ziwei.branch.tiger",
    "ziwei.branch.rabbit",
    "ziwei.branch.dragon",
    "ziwei.branch.snake",
    "ziwei.branch.horse",
    "ziwei.branch.goat",
    "ziwei.branch.monkey",
    "ziwei.branch.rooster",
    "ziwei.branch.dog",
    "ziwei.branch.pig",
  ];
  const timingPalaces = ZIWEI_PALACE_IDS.map((palaceId, index) => ({
    palaceId,
    heavenlyStemId: "ziwei.stem.bing",
    earthlyBranchId: branches[index],
    isOriginalPalace: palaceId === "ziwei.palace.life",
    cycleStateId: "ziwei.cycle.born",
    stars: buildFixturePalaceStars(),
    transformations: index === 0
      ? [{
          starId: "ziwei.star.purple-emperor",
          id: "ziwei.transformation.prosperity",
        }]
      : [],
  }));
  const timingRuleVersion = "ziwei.timing.v1";
  const sensitivityRuleVersion = "ziwei.sensitivity.v1";
  const asOfDate = "2026-09-09";
  const snapshot = {
    version: 1,
    chartVersionId,
    asOfDate,
    timezone: "Asia/Ho_Chi_Minh",
    timingRuleVersion,
    sensitivityRuleVersion,
    timing: {
      decadal: {
        state: "active",
        index: 2,
        ageRange: [22, 31],
        yearRange: [2022, 2031],
        palaceId: "ziwei.palace.fortune",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.dog",
        palaces: timingPalaces,
      },
      annual: {
        targetYear: 2026,
        palaceId: "ziwei.palace.career",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.monkey",
        palaces: timingPalaces,
      },
      provenance: {
        engineId: "ziwei.iztro",
        engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter",
        adapterVersion: "1.0.0",
        ruleSetId: "ziwei.default",
        config: {
          yearDivide: "normal",
          horoscopeDivide: "normal",
          ageDivide: "normal",
          dayDivide: "current",
        },
      },
    },
    sensitivity: {
      previousFrame: {
        position: "previous",
        vendorTimeIndex: selectedFrame.vendorTimeIndex - 1,
        civilDateOffset: 0,
        frameId: selectedFrame.previousFrameId,
      },
      selectedFrame: {
        position: "selected",
        vendorTimeIndex: selectedFrame.vendorTimeIndex,
        civilDateOffset: 0,
        frameId: selectedFrame.frameId,
      },
      nextFrame: {
        position: "next",
        vendorTimeIndex: selectedFrame.vendorTimeIndex + 1,
        civilDateOffset: 0,
        frameId: selectedFrame.nextFrameId,
      },
      stableFactKeys: [
        "ziwei.fact.soul-palace",
        "ziwei.fact.body-palace",
      ],
      sensitiveFacts: [],
    },
    provenance: {
      chartVersionId,
      timingRuleVersion,
      sensitivityRuleVersion,
      snapshotHash,
    },
  };

  return {
    version: 1,
    reportId,
    reportVersionId,
    chartVersionId,
    asOfDate,
    targetYear: 2026,
    timingRuleVersion,
    sensitivityRuleVersion,
    snapshotHash,
    snapshot,
  };
}

export function buildV4ReportContent() {
  const natalEvidenceKeys = [
    WP13_V4_REPORT_EVIDENCE_KEYS.starZiwei,
    WP13_V4_REPORT_EVIDENCE_KEYS.starTianfu,
  ];
  const buildSectionProse = (subject, vocabulary, minimumSyllables) => {
    const words = vocabulary.split(/\s+/u);
    const sentences = [
      `Sao Tử Vi và sao Thiên Phủ là hai điểm tham chiếu cho ${subject}.`,
    ];
    let index = 0;
    while (sentences.join(" ").split(/\s+/u).length < minimumSyllables + 12) {
      const selected = Array.from(
        { length: 6 },
        (_, offset) => words[(index + offset) % words.length],
      );
      sentences.push(
        `${subject} xem xét ${selected.join(", ")} qua bước ${index + 1}, từ đó ghi nhận thay đổi cụ thể, giữ nhịp quan sát đều đặn và chọn điều chỉnh phù hợp với hoàn cảnh hiện tại.`,
      );
      index += 1;
    }
    return sentences.join(" ");
  };
  const palaceSections = {
    "ziwei.palace.life": {
      title: "Cung Mệnh",
      subject: "phần nhận diện cá nhân",
      vocabulary: "bản sắc chủ động nhận thức lựa chọn giá trị thói quen định hướng tự chủ",
    },
    "ziwei.palace.siblings": {
      title: "Cung Huynh Đệ",
      subject: "phần tương tác đồng hành",
      vocabulary: "chia sẻ phối hợp lắng nghe hỗ trợ ranh giới trao đổi hợp tác tin cậy",
    },
    "ziwei.palace.spouse": {
      title: "Cung Phu Thê",
      subject: "phần quan hệ gần gũi",
      vocabulary: "đối thoại tôn trọng cam kết nhu cầu khoảng cách đồng thuận thấu hiểu hiện diện",
    },
    "ziwei.palace.children": {
      title: "Cung Tử Tức",
      subject: "phần nuôi dưỡng phát triển",
      vocabulary: "sáng tạo hướng dẫn kiên nhẫn trưởng thành trách nhiệm khích lệ khám phá tiếp nối",
    },
    "ziwei.palace.wealth": {
      title: "Cung Tài Bạch",
      subject: "phần quản lý nguồn lực",
      vocabulary: "ngân sách phân bổ tích lũy chi tiêu dự phòng kế hoạch cân đối kiểm soát",
    },
    "ziwei.palace.health": {
      title: "Cung Tật Ách",
      subject: "phần nhịp sống thường ngày",
      vocabulary: "sinh hoạt vận động giấc ngủ phục hồi nhịp độ chăm sóc điều độ nghỉ ngơi",
    },
    "ziwei.palace.travel": {
      title: "Cung Thiên Di",
      subject: "phần thích nghi môi trường",
      vocabulary: "trải nghiệm di chuyển khám phá linh hoạt chuẩn bị quan sát mở rộng chuyển tiếp",
    },
    "ziwei.palace.friends": {
      title: "Cung Nô Bộc",
      subject: "phần mạng lưới cộng tác",
      vocabulary: "kết nối tin cậy vai trò phản hồi hỗ trợ chọn lọc đóng góp phối hợp",
    },
    "ziwei.palace.career": {
      title: "Cung Quan Lộc",
      subject: "phần trách nhiệm nghề nghiệp",
      vocabulary: "kỹ năng tiến độ học hỏi đóng góp mục tiêu tiêu chuẩn thực hành chuyên môn",
    },
    "ziwei.palace.property": {
      title: "Cung Điền Trạch",
      subject: "phần nền tảng không gian",
      vocabulary: "ổn định sắp xếp nơi ở tập trung duy trì riêng tư tiện ích trật tự",
    },
    "ziwei.palace.fortune": {
      title: "Cung Phúc Đức",
      subject: "phần nội lực suy ngẫm",
      vocabulary: "bình tâm ý nghĩa cân bằng khoảng nghỉ bền bỉ chiêm nghiệm tĩnh lặng phục hồi",
    },
    "ziwei.palace.parents": {
      title: "Cung Phụ Mẫu",
      subject: "phần nền nếp gia đình",
      vocabulary: "tiếp nối biết ơn đối thoại trưởng thành nâng đỡ truyền đạt tôn trọng gắn kết",
    },
  };
  const thematicSections = {
    career_wealth: {
      title: "Sự nghiệp và tài chính",
      subject: "chuyên đề công việc và ngân sách",
      vocabulary: "ưu tiên năng lực tiến độ khoản chi tích lũy phương án hiệu quả mục tiêu",
    },
    relationships_family: {
      title: "Tình cảm và gia đình",
      subject: "chuyên đề gắn kết gia đình",
      vocabulary: "lắng nghe đồng thuận chia sẻ hiện diện chăm sóc trách nhiệm ranh giới hòa hợp",
    },
    social_environment: {
      title: "Quan hệ xã hội",
      subject: "chuyên đề môi trường xã hội",
      vocabulary: "cộng đồng đối tác kết nối vai trò uy tín phản hồi chọn lọc tương trợ",
    },
    wellbeing_inner_resources: {
      title: "Nội lực và cân bằng",
      subject: "chuyên đề cân bằng nội lực",
      vocabulary: "tập trung thư giãn hồi phục tự nhận biết tiết chế nhịp sống yên tĩnh bền bỉ",
    },
  };

  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: buildSectionProse(
        "phần tổng quan định hướng",
        "toàn cảnh lựa chọn nhịp sống mục tiêu nguồn lực quan sát điều chỉnh cân đối",
        600,
      ),
      evidenceKeys: natalEvidenceKeys,
    },
    coreAxis: {
      title: "Trục cốt lõi",
      narrative: buildSectionProse(
        "phần trục cốt lõi",
        "nguyên tắc phản hồi ưu tiên ranh giới nhất quán cân nhắc trách nhiệm chủ động",
        600,
      ),
      evidenceKeys: natalEvidenceKeys,
    },
    keyConfigurations: [{
      title: "Cấu trúc tham chiếu",
      narrative: buildSectionProse(
        "phần cấu trúc tham chiếu",
        "liên kết trọng tâm bối cảnh phối hợp khả năng điều kiện chuyển tiếp hỗ trợ",
        250,
      ),
      evidenceKeys: natalEvidenceKeys,
    }],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: palaceSections[palaceId].title,
      narrative: buildSectionProse(
        palaceSections[palaceId].subject,
        palaceSections[palaceId].vocabulary,
        450,
      ),
      evidenceKeys: natalEvidenceKeys,
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: thematicSections[id].title,
      narrative: buildSectionProse(
        thematicSections[id].subject,
        thematicSections[id].vocabulary,
        550,
      ),
      evidenceKeys: natalEvidenceKeys,
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh và điều cần lưu ý",
      narrative: buildSectionProse(
        "phần thế mạnh và điểm vướng",
        "đều đặn linh hoạt kiên trì phân tán giới hạn điều kiện phát huy điều tiết",
        500,
      ),
      evidenceKeys: natalEvidenceKeys,
    },
    currentDecadal: {
      title: "Đại vận hiện hành",
      state: "active",
      index: 2,
      ageRange: [22, 31],
      yearRange: [2022, 2031],
      narrative: buildSectionProse(
        "phần giai đoạn mười năm",
        "chu kỳ nền tảng tiến trình chuyển đổi thích ứng củng cố kiểm tra chuẩn bị",
        550,
      ),
      evidenceKeys: [
        ...natalEvidenceKeys,
        WP13_V4_REPORT_EVIDENCE_KEYS.decadal,
      ],
    },
    annualSnapshot: {
      title: "Lưu niên 2026",
      targetYear: 2026,
      asOfDate: "2026-09-09",
      narrative: buildSectionProse(
        "phần rà soát năm 2026",
        "thời điểm kế hoạch quý tháng tiến độ cập nhật xem xét phản hồi lịch trình",
        450,
      ),
      evidenceKeys: [
        ...natalEvidenceKeys,
        WP13_V4_REPORT_EVIDENCE_KEYS.annual,
      ],
    },
    practicalDirection: [
      {
        recommendation: buildSectionProse(
          "khuyến nghị sắp xếp tuần",
          "lịch biểu ưu tiên thời lượng đầu việc thứ tự hoàn thành kiểm tra",
          42,
        ),
        rationale: buildSectionProse(
          "lý do theo dõi tiến độ",
          "mốc nhỏ ghi chép phản hồi đo lường nhịp độ rõ ràng duy trì",
          42,
        ),
        avoid: buildSectionProse(
          "điều cần tiết chế khi khởi động",
          "dàn trải vội vàng chồng chéo ngắt quãng quá tải thiếu chuẩn bị",
          42,
        ),
        evidenceKeys: natalEvidenceKeys,
      },
      {
        recommendation: buildSectionProse(
          "khuyến nghị dành khoảng yên tĩnh",
          "suy xét lựa chọn khoảng nghỉ tập trung đối chiếu phương án ghi nhận",
          42,
        ),
        rationale: buildSectionProse(
          "lý do xem lại quyết định",
          "chủ đích bình tĩnh tiêu chí hậu quả nguồn lực phạm vi cân nhắc",
          42,
        ),
        avoid: buildSectionProse(
          "điều cần tiết chế trước áp lực",
          "phản ứng tức thời dao động hấp tấp bỏ dở lệch hướng nóng vội",
          42,
        ),
        evidenceKeys: natalEvidenceKeys,
      },
      {
        recommendation: buildSectionProse(
          "khuyến nghị trao đổi mục tiêu",
          "người tin cậy câu hỏi chia sẻ kỳ vọng phản biện thống nhất hỗ trợ",
          42,
        ),
        rationale: buildSectionProse(
          "lý do mở rộng góc nhìn",
          "giả định nhận xét đối chiếu điểm mù khả thi lựa chọn bổ sung",
          42,
        ),
        avoid: buildSectionProse(
          "điều cần tiết chế khi tham khảo",
          "phụ thuộc áp đặt sao chép kết luận vội bỏ qua hoàn cảnh riêng",
          42,
        ),
        evidenceKeys: natalEvidenceKeys,
      },
    ],
  };
}

export async function seedAuthenticatedFixture() {
  const { databaseUrl, betterAuthSecret } = validateEnvironment();
  const fixtureNow = new Date();
  const { pendingOrderCreatedAt, sessionExpiresAt } =
    buildFixtureTemporalValues(fixtureNow);

  const origLog = console.log;
  console.log = () => {};
  try {
    await runMigrations(databaseUrl);
  } finally {
    console.log = origLog;
  }
  const database = createDatabase(databaseUrl);
  try {

  const USER_ID = "10000000-0000-4000-8000-000000000001";
  const USER_EMAIL = "nguyenvanan@example.test";
  const USER_NAME = "Nguyễn Văn An";

  const SESSION_ID = "20000000-0000-4000-8000-000000000001";
  const SESSION_TOKEN = "wp13-session-token-live-seed-001";
  const SESSION_EXPIRES_AT = sessionExpiresAt;

  const signedCookieValue = signSessionToken(SESSION_TOKEN, betterAuthSecret);

  // Profile 1: Self profile (Nguyễn Văn An)
  const PROFILE_1_ID = "30000000-0000-4000-8000-000000000001";
  // Revisions and Charts for Profile 1:
  const REVISION_1_ID = "31000000-0000-4000-8000-000000000001";
  const RUN_1_ID = "32000000-0000-4000-8000-000000000001";
  const CHART_1_ID = "chart-30000000-0000-4000-8000-000000000001";
  const CHART_VERSION_1_ID = "cver-30000000-0000-4000-8000-000000000001";
  const EVIDENCE_SET_1_ID = "evset-30000000-0000-4000-8000-000000000001";

  const REVISION_8_ID = "31000000-0000-4000-8000-000000000008";
  const RUN_8_ID = "32000000-0000-4000-8000-000000000008";
  const CHART_8_ID = "chart-30000000-0000-4000-8000-000000000008";
  const CHART_VERSION_8_ID = "cver-30000000-0000-4000-8000-000000000008";
  const EVIDENCE_SET_8_ID = "evset-30000000-0000-4000-8000-000000000008";

  const REVISION_9_ID = "31000000-0000-4000-8000-000000000009";
  const RUN_9_ID = "32000000-0000-4000-8000-000000000009";
  const CHART_9_ID = "chart-30000000-0000-4000-8000-000000000009";
  const CHART_VERSION_9_ID = "cver-30000000-0000-4000-8000-000000000009";
  const EVIDENCE_SET_9_ID = "evset-30000000-0000-4000-8000-000000000009";

  // Profile 2: Family profile (Nguyễn Minh Châu) for report library grouping
  const PROFILE_2_ID = "30000000-0000-4000-8000-000000000002";
  const REVISION_2_ID = "31000000-0000-4000-8000-000000000002";
  const RUN_2_ID = "32000000-0000-4000-8000-000000000002";
  const CHART_2_ID = "chart-30000000-0000-4000-8000-000000000002";
  const CHART_VERSION_2_ID = "cver-30000000-0000-4000-8000-000000000002";
  const EVIDENCE_SET_2_ID = "evset-30000000-0000-4000-8000-000000000002";

  // Profile 3: Single order without report (Lê Hoàng Nam) for checkout paid without reportId
  const PROFILE_3_ID = "30000000-0000-4000-8000-000000000003";
  const REVISION_3_ID = "31000000-0000-4000-8000-000000000003";
  const RUN_3_ID = "32000000-0000-4000-8000-000000000003";
  const CHART_3_ID = "chart-30000000-0000-4000-8000-000000000003";
  const CHART_VERSION_3_ID = "cver-30000000-0000-4000-8000-000000000003";
  const EVIDENCE_SET_3_ID = "evset-30000000-0000-4000-8000-000000000003";

  // Clean previous fixture rows if any
  await database.delete(reportSourceSnapshots);
  await database.delete(reportVersions);
  await database.delete(reportReservations);
  await database.delete(commerceEntitlements);
  await database.delete(commerceOrders);
  await database.delete(evidenceItems);
  await database.delete(evidenceSets);
  await database.delete(ziweiChartVersions);
  await database.delete(ziweiCharts);
  await database.delete(calculationRuns);
  await database.delete(birthProfileRevisions);
  await database.delete(birthProfiles);
  await database.delete(authSessions);
  await database.delete(authUsers);

  // 1. Insert User
  await database.insert(authUsers).values({
    id: USER_ID,
    name: USER_NAME,
    email: USER_EMAIL,
    emailVerified: true,
    isAnonymous: false,
  });

  // 2. Insert Session
  await database.insert(authSessions).values({
    id: SESSION_ID,
    userId: USER_ID,
    token: SESSION_TOKEN,
    expiresAt: SESSION_EXPIRES_AT,
  });

  // Insert Profiles
  await database.insert(birthProfiles).values([
    { id: PROFILE_1_ID, userId: USER_ID },
    { id: PROFILE_2_ID, userId: USER_ID },
    { id: PROFILE_3_ID, userId: USER_ID },
  ]);

  // Helper to insert revision, run, chart, chartVersion, evidenceSet
  async function seedChartLineage({
    profileId,
    revisionNumber,
    revisionId,
    runId,
    chartId,
    chartVersionId,
    evidenceSetId,
    displayName,
    birth,
  }) {
    const revision = buildBirthProfileRevisionFixture({ displayName, birth });
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber,
      originalInput: revision.originalInput,
      normalizedInput: revision.normalizedInput,
      consentVersion: "privacy.v1",
    });

    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: "run-" + runId,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });

    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: buildNormalizedZiweiChart(),
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    await database.insert(evidenceSets).values({
      id: evidenceSetId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values(
      buildIdentityEvidenceItems(evidenceSetId),
    );
  }

  // Profile 1: Revision 1, 2, 3
  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 1,
    revisionId: REVISION_1_ID,
    runId: RUN_1_ID,
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceSetId: EVIDENCE_SET_1_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 2,
    revisionId: REVISION_8_ID,
    runId: RUN_8_ID,
    chartId: CHART_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    evidenceSetId: EVIDENCE_SET_8_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 3,
    revisionId: REVISION_9_ID,
    runId: RUN_9_ID,
    chartId: CHART_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    evidenceSetId: EVIDENCE_SET_9_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  // Profile 2: Revision 1
  await seedChartLineage({
    profileId: PROFILE_2_ID,
    revisionNumber: 1,
    revisionId: REVISION_2_ID,
    runId: RUN_2_ID,
    chartId: CHART_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceSetId: EVIDENCE_SET_2_ID,
    displayName: "Nguyễn Minh Châu",
    birth: { date: "1995-05-15", time: "14:15", gender: "female" },
  });

  // Profile 3: Revision 1
  await seedChartLineage({
    profileId: PROFILE_3_ID,
    revisionNumber: 1,
    revisionId: REVISION_3_ID,
    runId: RUN_3_ID,
    chartId: CHART_3_ID,
    chartVersionId: CHART_VERSION_3_ID,
    evidenceSetId: EVIDENCE_SET_3_ID,
    displayName: "Lê Hoàng Nam",
    birth: { date: "1992-10-20", time: "10:00", gender: "male" },
  });

  // Order 1: Paid + Ready report for Profile 1 (Library Group 1)
  const ORDER_1_ID = "40000000-0000-4000-8000-000000000001";
  const ENTITLEMENT_1_ID = "50000000-0000-4000-8000-000000000001";
  const RESERVATION_1_ID = "60000000-0000-4000-8000-000000000001";
  const REPORT_1_ID = "70000000-0000-4000-8000-000000000001";
  const REPORT_VERSION_1_ID = "71000000-0000-4000-8000-000000000001";
  const REPORT_ROW_1_ID = "80000000-0000-4000-8000-000000000001";
  const PDF_ASSET_1_ID = "90000000-0000-4000-8000-000000000001";

  await database.insert(commerceOrders).values({
    id: ORDER_1_ID,
    paymentCode: "LSV901000001",
    invoiceNumber: "LSV-20260909-001",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:00:00.000Z"),
    createdAt: new Date("2026-09-09T07:50:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_1_ID,
    orderId: ORDER_1_ID,
    chartId: CHART_1_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_V4_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:00:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_1_ID,
    reportId: REPORT_1_ID,
    reportVersionId: REPORT_VERSION_1_ID,
    entitlementId: ENTITLEMENT_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceVersionId: EVIDENCE_SET_1_ID,
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
    promptVersion: "ziwei.comprehensive.prompt.v4",
    reportConfigVersion: "ziwei.comprehensive.report.v4",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "complete",
    asOfDate: "2026-09-09",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    createdAt: new Date("2026-09-09T08:01:00.000Z"),
    updatedAt: new Date("2026-09-09T08:05:00.000Z"),
  });

  await database.insert(reportVersions).values({
    id: REPORT_ROW_1_ID,
    reportId: REPORT_1_ID,
    reportVersionId: REPORT_VERSION_1_ID,
    entitlementId: ENTITLEMENT_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceVersionId: EVIDENCE_SET_1_ID,
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
    promptVersion: "ziwei.comprehensive.prompt.v4",
    reportConfigVersion: "ziwei.comprehensive.report.v4",
    templateVersion: "ziwei-comprehensive-html.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    providerId: "openai",
    modelId: "gpt-4o",
    structuredContent: buildV4ReportContent(),
    htmlContent: "<p>Báo cáo fixture tổng hợp.</p>",
    contentHash: "1".repeat(64),
    pdfAssetId: PDF_ASSET_1_ID,
    renderVersion: "identity-report-pdf.v1",
    createdAt: new Date("2026-09-09T08:05:00.000Z"),
  });

  const SOURCE_SNAPSHOT_1 = buildReportSourceSnapshot({
    reportId: REPORT_1_ID,
    reportVersionId: REPORT_VERSION_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    snapshotHash: "d".repeat(64),
    selectedFrame: {
      vendorTimeIndex: 5,
      previousFrameId: "ziwei.time-frame.dragon",
      frameId: "ziwei.time-frame.snake",
      nextFrameId: "ziwei.time-frame.horse",
    },
  });
  await database.insert(reportSourceSnapshots).values({
    id: "a0000000-0000-4000-8000-000000000001",
    reportId: SOURCE_SNAPSHOT_1.reportId,
    reportVersionId: SOURCE_SNAPSHOT_1.reportVersionId,
    chartVersionId: SOURCE_SNAPSHOT_1.chartVersionId,
    asOfDate: SOURCE_SNAPSHOT_1.asOfDate,
    targetYear: SOURCE_SNAPSHOT_1.targetYear,
    timingRuleVersion: SOURCE_SNAPSHOT_1.timingRuleVersion,
    sensitivityRuleVersion: SOURCE_SNAPSHOT_1.sensitivityRuleVersion,
    snapshotHash: SOURCE_SNAPSHOT_1.snapshotHash,
    snapshot: SOURCE_SNAPSHOT_1.snapshot,
    createdAt: new Date("2026-09-09T08:02:00.000Z"),
  });

  // Order 2: Paid + Ready report for Profile 2 (Account Overview latest report & Library Group 2)
  const ORDER_2_ID = "40000000-0000-4000-8000-000000000002";
  const ENTITLEMENT_2_ID = "50000000-0000-4000-8000-000000000002";
  const RESERVATION_2_ID = "60000000-0000-4000-8000-000000000002";
  const REPORT_2_ID = "70000000-0000-4000-8000-000000000002";
  const REPORT_VERSION_2_ID = "71000000-0000-4000-8000-000000000002";
  const REPORT_ROW_2_ID = "80000000-0000-4000-8000-000000000002";
  const PDF_ASSET_2_ID = "90000000-0000-4000-8000-000000000002";

  await database.insert(commerceOrders).values({
    id: ORDER_2_ID,
    paymentCode: "LSV901000002",
    invoiceNumber: "LSV-20260909-002",
    chartId: CHART_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:30:00.000Z"),
    createdAt: new Date("2026-09-09T08:20:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_2_ID,
    orderId: ORDER_2_ID,
    chartId: CHART_2_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_V4_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:30:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_2_ID,
    reportId: REPORT_2_ID,
    reportVersionId: REPORT_VERSION_2_ID,
    entitlementId: ENTITLEMENT_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceVersionId: EVIDENCE_SET_2_ID,
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
    promptVersion: "ziwei.comprehensive.prompt.v4",
    reportConfigVersion: "ziwei.comprehensive.report.v4",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "complete",
    asOfDate: "2026-09-09",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    createdAt: new Date("2026-09-09T08:31:00.000Z"),
    updatedAt: new Date("2026-09-09T08:35:00.000Z"),
  });

  await database.insert(reportVersions).values({
    id: REPORT_ROW_2_ID,
    reportId: REPORT_2_ID,
    reportVersionId: REPORT_VERSION_2_ID,
    entitlementId: ENTITLEMENT_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceVersionId: EVIDENCE_SET_2_ID,
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
    promptVersion: "ziwei.comprehensive.prompt.v4",
    reportConfigVersion: "ziwei.comprehensive.report.v4",
    templateVersion: "ziwei-comprehensive-html.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    providerId: "openai",
    modelId: "gpt-4o",
    structuredContent: buildV4ReportContent(),
    htmlContent: "<p>Báo cáo fixture tổng hợp.</p>",
    contentHash: "2".repeat(64),
    pdfAssetId: PDF_ASSET_2_ID,
    renderVersion: "identity-report-pdf.v1",
    createdAt: new Date("2026-09-09T08:35:00.000Z"),
  });

  const SOURCE_SNAPSHOT_2 = buildReportSourceSnapshot({
    reportId: REPORT_2_ID,
    reportVersionId: REPORT_VERSION_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    snapshotHash: "e".repeat(64),
    selectedFrame: {
      vendorTimeIndex: 7,
      previousFrameId: "ziwei.time-frame.horse",
      frameId: "ziwei.time-frame.goat",
      nextFrameId: "ziwei.time-frame.monkey",
    },
  });
  await database.insert(reportSourceSnapshots).values({
    id: "a0000000-0000-4000-8000-000000000002",
    reportId: SOURCE_SNAPSHOT_2.reportId,
    reportVersionId: SOURCE_SNAPSHOT_2.reportVersionId,
    chartVersionId: SOURCE_SNAPSHOT_2.chartVersionId,
    asOfDate: SOURCE_SNAPSHOT_2.asOfDate,
    targetYear: SOURCE_SNAPSHOT_2.targetYear,
    timingRuleVersion: SOURCE_SNAPSHOT_2.timingRuleVersion,
    sensitivityRuleVersion: SOURCE_SNAPSHOT_2.sensitivityRuleVersion,
    snapshotHash: SOURCE_SNAPSHOT_2.snapshotHash,
    snapshot: SOURCE_SNAPSHOT_2.snapshot,
    createdAt: new Date("2026-09-09T08:32:00.000Z"),
  });

  // Order 3: Checkout pending state
  const ORDER_3_ID = "40000000-0000-4000-8000-000000000003";
  await database.insert(commerceOrders).values({
    id: ORDER_3_ID,
    paymentCode: "LSV901000003",
    invoiceNumber: "LSV-20260909-003",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "pending",
    createdAt: pendingOrderCreatedAt,
  });

  // Order 4: Checkout paid with no report ID (Chart 3 has no reservation)
  const ORDER_4_ID = "40000000-0000-4000-8000-000000000004";
  await database.insert(commerceOrders).values({
    id: ORDER_4_ID,
    paymentCode: "LSV901000004",
    invoiceNumber: "LSV-20260909-004",
    chartId: CHART_3_ID,
    chartVersionId: CHART_VERSION_3_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:45:00.000Z"),
    createdAt: new Date("2026-09-09T08:41:00.000Z"),
  });

  // Order 5: Checkout expired state
  const ORDER_5_ID = "40000000-0000-4000-8000-000000000005";
  await database.insert(commerceOrders).values({
    id: ORDER_5_ID,
    paymentCode: "LSV901000005",
    invoiceNumber: "LSV-20260909-005",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "expired",
    createdAt: new Date("2026-09-01T08:00:00.000Z"),
  });

  // Order 6: Checkout failed state
  const ORDER_6_ID = "40000000-0000-4000-8000-000000000006";
  await database.insert(commerceOrders).values({
    id: ORDER_6_ID,
    paymentCode: "LSV901000006",
    invoiceNumber: "LSV-20260909-006",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "failed",
    createdAt: new Date("2026-09-02T08:00:00.000Z"),
  });

  // Order 7: Checkout refunded state
  const ORDER_7_ID = "40000000-0000-4000-8000-000000000007";
  await database.insert(commerceOrders).values({
    id: ORDER_7_ID,
    paymentCode: "LSV901000007",
    invoiceNumber: "LSV-20260909-007",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "refunded",
    createdAt: new Date("2026-09-03T08:00:00.000Z"),
  });

  // Order 8: Report pending state (real generating reservation)
  const ORDER_8_ID = "40000000-0000-4000-8000-000000000008";
  const ENTITLEMENT_8_ID = "50000000-0000-4000-8000-000000000008";
  const RESERVATION_8_ID = "60000000-0000-4000-8000-000000000008";
  const REPORT_8_ID = "70000000-0000-4000-8000-000000000008";
  const REPORT_VERSION_8_ID = "71000000-0000-4000-8000-000000000008";

  await database.insert(commerceOrders).values({
    id: ORDER_8_ID,
    paymentCode: "LSV901000008",
    invoiceNumber: "LSV-20260909-008",
    chartId: CHART_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:50:00.000Z"),
    createdAt: new Date("2026-09-09T08:48:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_8_ID,
    orderId: ORDER_8_ID,
    chartId: CHART_8_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:50:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_8_ID,
    reportId: REPORT_8_ID,
    reportVersionId: REPORT_VERSION_8_ID,
    entitlementId: ENTITLEMENT_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    evidenceVersionId: EVIDENCE_SET_8_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "generating",
    createdAt: new Date("2026-09-09T08:50:00.000Z"),
    updatedAt: new Date("2026-09-09T08:50:00.000Z"),
  });

  // Order 9: Report terminal_failure state (paid order with terminal_failure reservation)
  const ORDER_9_ID = "40000000-0000-4000-8000-000000000009";
  const ENTITLEMENT_9_ID = "50000000-0000-4000-8000-000000000009";
  const RESERVATION_9_ID = "60000000-0000-4000-8000-000000000009";
  const REPORT_9_ID = "70000000-0000-4000-8000-000000000009";
  const REPORT_VERSION_9_ID = "71000000-0000-4000-8000-000000000009";

  await database.insert(commerceOrders).values({
    id: ORDER_9_ID,
    paymentCode: "LSV901000009",
    invoiceNumber: "LSV-20260909-009",
    chartId: CHART_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:55:00.000Z"),
    createdAt: new Date("2026-09-09T08:52:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_9_ID,
    orderId: ORDER_9_ID,
    chartId: CHART_9_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:55:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_9_ID,
    reportId: REPORT_9_ID,
    reportVersionId: REPORT_VERSION_9_ID,
    entitlementId: ENTITLEMENT_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    evidenceVersionId: EVIDENCE_SET_9_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "terminal_failure",
    lastErrorCode: "AI_PROVIDER_ERROR",
    createdAt: new Date("2026-09-09T08:55:00.000Z"),
    updatedAt: new Date("2026-09-09T08:56:00.000Z"),
  });

  const manifest = {
    user: {
      id: USER_ID,
      email: USER_EMAIL,
      name: USER_NAME,
    },
    session: {
      cookieName: "better-auth.session_token",
      cookieValue: signedCookieValue,
    },
    routes: {
      account: "/tai-khoan",
      reports: "/tai-khoan/bao-cao",
      orders: "/tai-khoan/don-hang",
      checkoutPending: `/thanh-toan/${ORDER_3_ID}`,
      checkoutPaid: `/thanh-toan/${ORDER_4_ID}`,
      checkoutExpired: `/thanh-toan/${ORDER_5_ID}`,
      checkoutFailed: `/thanh-toan/${ORDER_6_ID}`,
      checkoutRefunded: `/thanh-toan/${ORDER_7_ID}`,
      reportReady: `/bao-cao/${REPORT_1_ID}`,
      reportPending: `/bao-cao/${REPORT_8_ID}`,
      reportTerminalFailure: `/bao-cao/${REPORT_9_ID}`,
    },
    ids: {
      orderPendingId: ORDER_3_ID,
      orderPaidNoReportId: ORDER_4_ID,
      orderExpiredId: ORDER_5_ID,
      orderFailedId: ORDER_6_ID,
      orderRefundedId: ORDER_7_ID,
      reportReadyId: REPORT_1_ID,
      reportPendingId: REPORT_8_ID,
      reportTerminalFailureId: REPORT_9_ID,
    },
  };

  // Write manifest to artifacts directory for tests to consume
  const artifactDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13",
  );
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "fixture-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  }

  return manifest;
  } finally {
    if (database?.$client?.end) {
      await database.$client.end({ timeout: 5 });
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAuthenticatedFixture()
    .then((manifest) => {
      // Output only JSON fixture manifest with no secrets or database URL
      console.log(JSON.stringify(manifest, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exit(1);
    });
}
