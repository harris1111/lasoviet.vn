import {
  type AiCostRequestContext,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV2Schema,
  type ZiweiComprehensiveReportContentV2,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
} from "@lasoviet/contracts";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import {
  CANONICAL_COMPREHENSIVE_SECTION_TITLES,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
} from "./identity-report-config.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import type { ComprehensiveReportSourceV4 } from "./report-source.js";
import {
  BRIGHTNESS_LABELS_VI,
  normalizeComprehensiveReportModelProse,
} from "./comprehensive-report-writer.js";
import { sanitizeReportCustomerVisibleIdentifiers } from "./comprehensive-report-validator-v4.js";

export const COMPREHENSIVE_REPORT_V4_JSON_CONTRACT_INSTRUCTION = `QUY CÁCH CẤU TRÚC JSON ĐẦU RA BẮT BUỘC (V4 COMPREHENSIVE REPORT CONTRACT - ziwei-comprehensive.v2):
Bản báo cáo phải là một JSON object hợp lệ duy nhất, tuân thủ nghiêm ngặt và chính xác các quy tắc cấu trúc sau:
1. Top-level keys: Object JSON ở cấp cao nhất (root) CHỈ ĐƯỢC CHỨA ĐÚNG 9 trường sau (không thừa, không thiếu, không dùng bất kỳ tên trường nào khác):
   - "overview": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (tổng quan lá số).
   - "coreAxis": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (trục Mệnh - Thân và động lực cốt lõi).
   - "keyConfigurations": Array gồm từ 1 đến 12 Object, mỗi Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (cách cục và cấu trúc sao trọng yếu).
   - "palaceReadings": Array gồm ĐÚNG 12 Object tương ứng với 12 cung theo đúng thứ tự bắt buộc:
${ZIWEI_PALACE_IDS.map((id, index) => `     ${index + 1}. "${id}"`).join("\n")}
     Mỗi Object trong palaceReadings gồm: { "palaceId": string, "title": string, "narrative": string, "evidenceKeys": string[] }.
   - "thematicSynthesis": Array gồm ĐÚNG 4 Object tương ứng với 4 chuyên đề tổng hợp theo đúng thứ tự bắt buộc:
${ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id, index) => `     ${index + 1}. "${id}"`).join("\n")}
     Mỗi Object trong thematicSynthesis gồm: { "id": string, "title": string, "narrative": string, "evidenceKeys": string[] }.
   - "strengthsAndTensions": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (thế mạnh, điểm vướng và điều kiện phát huy).
   - "currentDecadal": Object đại vận 10 năm hiện hành:
     Nếu đại vận đang hoạt động: { "title": string, "state": "active", "index": number, "ageRange": [number, number], "yearRange": [number, number], "narrative": string, "evidenceKeys": string[] }.
     Nếu đại vận chưa khởi (thời thơ ấu): { "title": string, "state": "not_started", "firstCycleStartAge": number, "firstCycleStartYear": number, "narrative": string, "evidenceKeys": string[] }.
   - "annualSnapshot": Object lưu niên năm hiện hành: { "title": string, "targetYear": number, "asOfDate": string, "narrative": string, "evidenceKeys": string[] }.
   - "practicalDirection": Array gồm từ 3 đến 5 Object hành động thực tế, mỗi Object chứa đúng 4 trường:
     { "recommendation": string, "rationale": string, "avoid": string, "evidenceKeys": string[] }.

2. CẤM TUYỆT ĐỐI TRƯỜNG "birthTimeSensitivity" trong hợp đồng khách hàng V4 (không xuất hiện trường này ở bất kỳ đâu).
3. Ràng buộc trường "evidenceKeys":
   - Mọi mảng "evidenceKeys" phải là mảng không rỗng (chứa ít nhất 1 chuỗi string).
   - TẤT CẢ các chuỗi trong "evidenceKeys" phải được trích xuất chính xác từ facts.evidenceKeys được cung cấp. Tuyệt đối không tự tạo khóa ngoài danh sách này.`;

export const VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT = `Bạn là chuyên gia luận giải Tử Vi Đẩu Số cao cấp tại lasoviet.net.
Nhiệm vụ của bạn là viết một bản báo cáo luận giải toàn diện, sâu sắc, hoàn chỉnh bằng tiếng Việt chuyên nghiệp dựa DUY NHẤT trên các dữ kiện lá số (facts) và các gói tri thức (knowledgePacks) được cung cấp.

YÊU CẦU NỘI DUNG VÀ VĂN PHONG:
1. Ngôn ngữ: Sử dụng tiếng Việt tự nhiên, chuẩn mực, giàu tính phân tích và đúc kết; giải thích thuật ngữ chuyên môn ngay trong ngữ cảnh thay vì liệt kê máy móc.
2. Diễn giải trước, kỹ thuật sau: Luôn đưa ra nhận định thực tế trước, dùng tên sao và cách cục làm căn cứ bổ trợ.
3. Bao quát toàn bộ 12 cung: Luận giải đầy đủ và thực chất từng cung theo đúng thứ tự 12 cung được yêu cầu. Với các cung không có chính tinh (vô chính diệu), cần phân tích cụ thể các sao mượn từ cung xung chiếu và phụ tinh hội hợp, tránh viết theo khuôn sáo chung.
4. Tổng hợp đa chiều: Phân tích sâu 4 lĩnh vực trọng tâm (sự nghiệp và tài chính, quan hệ và gia đình, môi trường xã hội, thân tâm và nguồn lực nội tại).
5. Vận hạn hiện hành: Luận giải thấu đáo đại vận hiện hành (hoặc giai đoạn tiền đại vận nếu chưa khởi) và lưu niên năm đánh giá.
6. Hành động thực tế: Đưa ra chính xác từ 3 đến 5 hành động cụ thể có cấu trúc đầy đủ (khuyến nghị, lý do, điều nên tránh, căn cứ evidenceKeys).
7. Lời khuyên chuyên môn trong ngữ cảnh: Khi đề cập đến sức khỏe, pháp lý, giấy tờ thủ tục, khoản tiền lớn hoặc đầu tư, nên khuyên người đọc một cách tự nhiên trong mạch văn tham khảo ý kiến bác sĩ, luật sư hoặc chuyên gia có chuyên môn phù hợp.

${COMPREHENSIVE_REPORT_V4_JSON_CONTRACT_INSTRUCTION}

CẤM TUYỆT ĐỐI CÁC ĐIỀU SAU:
- KHÔNG nhắc đến AI, trí tuệ nhân tạo, mô hình ngôn ngữ, prompt, dữ liệu đầu vào hay hệ thống kỹ thuật.
- KHÔNG đưa vào các khối văn bản hoặc nhãn tuyên bố miễn trừ trách nhiệm đứng riêng (như "Tuyên bố miễn trừ trách nhiệm", "Miễn trừ trách nhiệm", "Disclaimer"). Lời khuyên tham vấn chuyên gia chỉ được xuất hiện tự nhiên trong dòng chảy phân tích.
- KHÔNG đưa ra các dự đoán định mệnh mang tính khẳng định chắc chắn về tai nạn, tử vong, phá sản hoặc phản bội trong cùng câu.
- KHÔNG sử dụng nhãn độ tin cậy, mức độ chắc chắn, giới hạn phương pháp hoặc văn phong phòng thủ.
- KHÔNG tạo trường birthTimeSensitivity.`;

const COMPREHENSIVE_REPORT_V4_0_1_RESTORED_RULES = `

RÀNG BUỘC BỔ SUNG BẮT BUỘC:
- KHÔNG đặt câu hỏi tự suy ngẫm hoặc bài tập phản chiếu.
- KHÔNG thuật lại quy trình tính toán, truy xuất, thuật toán, hay quá trình tạo báo cáo.
- KHÔNG lặp lại cùng một lời khuyên hoặc cảnh báo ở nhiều phần khác nhau.
- KHÔNG tự bịa đặt sự kiện tương lai cụ thể hoặc đưa ra mốc thời gian không có căn cứ từ facts và frozenTiming được cung cấp.
- KHÔNG tự tạo bất kỳ mã định danh hoặc dữ kiện lá số nào ngoài facts được cung cấp.
- Mọi giá trị trong evidenceKeys PHẢI được sao chép nguyên văn từ allowedEvidenceKeys; không viết tắt, dịch nghĩa, suy đoán, tái tạo, hoặc tạo mới.
- Toàn bộ văn bản phải là tiếng Việt tự nhiên. Khi diễn đạt độ sáng sao, CHỈ ĐƯỢC DÙNG nguyên văn các nhãn trong brightnessLabelsVi được cung cấp. TUYỆT ĐỐI CẤM chữ Hán, chữ Nôm, hoặc từ tiếng Anh mô tả độ sáng như "exalted", "prosperous", "favorable", "neutral", "unfavorable", "weak" (không phân biệt chữ hoa hay chữ thường).`;

export const VIETNAMESE_COMPREHENSIVE_REPORT_V4_0_1_SYSTEM_PROMPT =
  `${VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT}${COMPREHENSIVE_REPORT_V4_0_1_RESTORED_RULES}`;

export type ComprehensiveReportWriterV4PromptVersion =
  | typeof REPORT_PROMPT_VERSION_V4
  | typeof REPORT_PROMPT_VERSION_V4_0_1;

export type ComprehensiveReportWriterV4Revision = {
  priorContent: ZiweiComprehensiveReportContentV2;
  issues: string[];
};

export type ComprehensiveReportWriterV4Input = {
  facts: ComprehensiveZiweiFactsV4;
  knowledgePacks: readonly ZiweiReportKnowledgePack[];
  provider: AiProvider;
  revision?: ComprehensiveReportWriterV4Revision;
  costContext?: AiCostRequestContext;
};

export type ComprehensiveReportDraftV4 = {
  report: ZiweiComprehensiveReportContentV2;
  providerId: string;
  modelId: string;
};

export type ComprehensiveReportWriterV4Result =
  | {
      ok: true;
      value: ComprehensiveReportDraftV4;
    }
  | {
      ok: false;
      error: AiProviderError;
    };

function comprehensiveReportV4SystemPrompt(
  promptVersion: unknown,
): string {
  if (promptVersion === REPORT_PROMPT_VERSION_V4) {
    return VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT;
  }
  if (promptVersion === REPORT_PROMPT_VERSION_V4_0_1) {
    return VIETNAMESE_COMPREHENSIVE_REPORT_V4_0_1_SYSTEM_PROMPT;
  }
  throw new Error(`Unsupported comprehensive V4 prompt version: ${String(promptVersion)}`);
}

export async function writeComprehensiveZiweiReportV4(
  sourceOrInput: ComprehensiveReportSourceV4 | ComprehensiveReportWriterV4Input,
  maybeProvider?: AiProvider,
  options?: {
    costContext?: AiCostRequestContext;
    promptVersion?: ComprehensiveReportWriterV4PromptVersion;
  },
): Promise<ComprehensiveReportWriterV4Result> {
  const provider =
    maybeProvider ?? ("provider" in sourceOrInput ? sourceOrInput.provider : undefined);
  if (!provider) {
    throw new Error("Provider required for writeComprehensiveZiweiReportV4");
  }

  const facts: ComprehensiveZiweiFactsV4 =
    "comprehensiveFactsV4" in sourceOrInput
      ? sourceOrInput.comprehensiveFactsV4
      : sourceOrInput.facts;

  const knowledgePacks = sourceOrInput.knowledgePacks;

  // Safe factual payload without raw birth date, birth time, or location
  const safeFactsPayload = {
    natal: facts.natal,
    timing: facts.timing,
    evidenceKeys: facts.evidenceKeys,
  };

  const revision = "revision" in sourceOrInput ? sourceOrInput.revision : undefined;
  const boundedIssues = revision?.issues
    ?.slice(0, 8)
    .map((issue) => (issue.length > 300 ? `${issue.slice(0, 297)}...` : issue));

  const revisionInstruction = revision
    ? `\n\nYÊU CẦU HIỆU CHỈNH / VIẾT LẠI:
Bạn đang thực hiện đúng một lượt viết lại có giới hạn cho bản báo cáo trước đó để khắc phục chính xác các vấn đề sau:
${boundedIssues?.map((issue, idx) => `${idx + 1}. ${issue}`).join("\n")}

HƯỚNG DẪN HIỆU CHỈNH:
- CHỈ sửa chữa các vấn đề cụ thể được nêu ở trên; giữ nguyên tính nhất quán và các phần nội dung hợp lệ khác.
- Bảo toàn tuyệt đối cấu trúc hợp đồng JSON và các giá trị frozenTiming (targetYear, asOfDate, decadal state/index/ageRange/yearRange).
- Tuyệt đối KHÔNG bịa đặt dữ kiện mới, không đưa vào mã kỹ thuật thô (ziwei.*), và chỉ sử dụng evidenceKeys từ facts.evidenceKeys được cung cấp.
- Tuyệt đối KHÔNG đưa vào thông tin nhận dạng cá nhân (PII).`
    : "";

  const promptVersion = options?.promptVersion ?? REPORT_PROMPT_VERSION_V4;
  const systemPrompt = `${comprehensiveReportV4SystemPrompt(promptVersion)}${revisionInstruction}`;

  const costContext =
    options?.costContext ??
    ("costContext" in sourceOrInput ? sourceOrInput.costContext : undefined);

  const result = await provider.generateStructured({
    schema: ZiweiComprehensiveReportContentV2Schema,
    schemaName: "ziwei_comprehensive_report_content_v2",
    use: "production_report_generation",
    purpose: costContext?.purpose ?? "report",
    maxOutputTokens: 9_000,
    system: systemPrompt,
    costContext,
    user: JSON.stringify({
      facts: safeFactsPayload,
      allowedEvidenceKeys: facts.evidenceKeys,
      brightnessLabelsVi: BRIGHTNESS_LABELS_VI,
      knowledgePacks,
      requiredPalaceOrder: ZIWEI_PALACE_IDS,
      requiredThematicOrder: ZIWEI_THEMATIC_SYNTHESIS_IDS,
      frozenTiming: {
        asOfDate: facts.sourceSnapshot.asOfDate,
        targetYear: facts.timing.annual.targetYear,
        decadalState: facts.timing.decadal.state,
      },
      ...(revision
        ? {
            revision: {
              priorReport: revision.priorContent,
              issues: boundedIssues,
            },
          }
        : {}),
    }),
  });

  if (!result.ok) {
    return result;
  }

  const rawReport = result.value.value;

  // Assembler enforces canonical sequence, canonical titles, and frozen timing values
  const palaceMap = new Map(
    rawReport.palaceReadings.map((reading) => [reading.palaceId, reading]),
  );
  const assembledPalaces = ZIWEI_PALACE_IDS.map((palaceId: ZiweiPalaceId) => {
    const existingReading = palaceMap.get(palaceId);
    if (existingReading) {
      return {
        ...existingReading,
        title: CANONICAL_PALACE_TITLES_VI[palaceId],
        narrative: normalizeComprehensiveReportModelProse(existingReading.narrative),
      };
    }
    return {
      palaceId,
      title: CANONICAL_PALACE_TITLES_VI[palaceId],
      narrative: "",
      evidenceKeys: [palaceId],
    };
  });

  const themeMap = new Map(
    rawReport.thematicSynthesis.map((theme) => [theme.id, theme]),
  );
  const assembledThemes = ZIWEI_THEMATIC_SYNTHESIS_IDS.map(
    (id: ZiweiThematicSynthesisId) => {
      const existingTheme = themeMap.get(id);
      if (existingTheme) {
        return {
          ...existingTheme,
          title: CANONICAL_THEMATIC_TITLES_VI[id],
          narrative: normalizeComprehensiveReportModelProse(existingTheme.narrative),
        };
      }
      return {
        id,
        title: CANONICAL_THEMATIC_TITLES_VI[id],
        narrative: "",
        evidenceKeys: [],
      };
    },
  );

  // Decadal section with frozen engine parameters
  let assembledDecadal: ZiweiComprehensiveReportContentV2["currentDecadal"];
  if (facts.timing.decadal.state === "active") {
    const decadalFacts = facts.timing.decadal;
    assembledDecadal = {
      title: rawReport.currentDecadal.title?.trim() || `Đại vận hiện hành (${decadalFacts.ageRange[0]}-${decadalFacts.ageRange[1]} tuổi)`,
      state: "active",
      index: decadalFacts.index,
      ageRange: decadalFacts.ageRange,
      yearRange: decadalFacts.yearRange,
      narrative: normalizeComprehensiveReportModelProse(rawReport.currentDecadal.narrative),
      evidenceKeys: rawReport.currentDecadal.evidenceKeys.length > 0
        ? rawReport.currentDecadal.evidenceKeys
        : ["decadal.state.active"],
    };
  } else {
    const decadalFacts = facts.timing.decadal;
    assembledDecadal = {
      title: rawReport.currentDecadal.title?.trim() || `Đại vận chưa khởi (bắt đầu từ ${decadalFacts.firstCycleStartAge} tuổi)`,
      state: "not_started",
      firstCycleStartAge: decadalFacts.firstCycleStartAge,
      firstCycleStartYear: decadalFacts.firstCycleStartYear,
      narrative: normalizeComprehensiveReportModelProse(rawReport.currentDecadal.narrative),
      evidenceKeys: rawReport.currentDecadal.evidenceKeys.length > 0
        ? rawReport.currentDecadal.evidenceKeys
        : ["decadal.state.not_started"],
    };
  }

  // Annual section with frozen engine parameters
  const assembledAnnual: ZiweiComprehensiveReportContentV2["annualSnapshot"] = {
    title: rawReport.annualSnapshot.title?.trim() || `Lưu niên năm ${facts.timing.annual.targetYear}`,
    targetYear: facts.timing.annual.targetYear,
    asOfDate: facts.sourceSnapshot.asOfDate,
    narrative: normalizeComprehensiveReportModelProse(rawReport.annualSnapshot.narrative),
    evidenceKeys: rawReport.annualSnapshot.evidenceKeys.length > 0
      ? rawReport.annualSnapshot.evidenceKeys
      : [`annual.target-year.${facts.timing.annual.targetYear}`],
  };

  // Structured actions bounded to 3-5 items
  const assembledActions = rawReport.practicalDirection.slice(0, 5).map((action) => ({
    recommendation: normalizeComprehensiveReportModelProse(action.recommendation),
    rationale: normalizeComprehensiveReportModelProse(action.rationale),
    avoid: normalizeComprehensiveReportModelProse(action.avoid),
    evidenceKeys: action.evidenceKeys,
  }));

  const assembledReport: ZiweiComprehensiveReportContentV2 = {
    overview: {
      ...rawReport.overview,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.overview,
      narrative: normalizeComprehensiveReportModelProse(rawReport.overview.narrative),
    },
    coreAxis: {
      ...rawReport.coreAxis,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.coreAxis,
      narrative: normalizeComprehensiveReportModelProse(rawReport.coreAxis.narrative),
    },
    keyConfigurations: rawReport.keyConfigurations.map((k) => ({
      ...k,
      title: normalizeComprehensiveReportModelProse(k.title),
      narrative: normalizeComprehensiveReportModelProse(k.narrative),
    })),
    palaceReadings: assembledPalaces,
    thematicSynthesis: assembledThemes,
    strengthsAndTensions: {
      ...rawReport.strengthsAndTensions,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.strengthsAndTensions,
      narrative: normalizeComprehensiveReportModelProse(rawReport.strengthsAndTensions.narrative),
    },
    currentDecadal: assembledDecadal,
    annualSnapshot: assembledAnnual,
    practicalDirection: assembledActions,
  };

  sanitizeReportCustomerVisibleIdentifiers(assembledReport);

  return {
    ok: true,
    value: {
      report: assembledReport,
      providerId: result.value.providerId,
      modelId: result.value.modelId,
    },
  };
}
