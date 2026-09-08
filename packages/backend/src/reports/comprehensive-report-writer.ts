import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV1Schema,
  type ZiweiComprehensiveReportContentV1,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
} from "@lasoviet/contracts";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import {
  CANONICAL_COMPREHENSIVE_SECTION_TITLES,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
} from "./identity-report-config.js";
import type { ComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import type { ComprehensiveReportSource } from "./report-source.js";

export const COMPREHENSIVE_REPORT_JSON_CONTRACT_INSTRUCTION = `QUY CÁCH CẤU TRÚC JSON ĐẦU RA BẮT BUỘC (V3 COMPREHENSIVE REPORT CONTRACT):
Bản báo cáo phải là một JSON object hợp lệ duy nhất, tuân thủ nghiêm ngặt và chính xác các quy tắc cấu trúc sau:
1. Top-level keys: Object JSON ở cấp cao nhất (root) CHỈ ĐƯỢC CHỨA ĐÚNG 7 trường sau (không thừa, không thiếu, không dùng bất kỳ tên trường nào khác):
   - "overview": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (tổng quan lá số).
   - "coreAxis": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (trục Mệnh - Thân và động lực cốt lõi).
   - "keyConfigurations": Array gồm từ 1 đến 12 Object, mỗi Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (cách cục và cấu trúc sao trọng yếu).
   - "palaceReadings": Array gồm ĐÚNG 12 Object tương ứng với 12 cung theo đúng thứ tự bắt buộc:
${ZIWEI_PALACE_IDS.map((id, index) => `     ${index + 1}. "${id}"`).join("\n")}
     Mỗi Object trong palaceReadings gồm: { "palaceId": string, "title": string, "narrative": string, "evidenceKeys": string[] }. Trường "palaceId" phải là một trong 12 mã định danh cung trên, không được thiếu và không được trùng lặp cung nào.
   - "thematicSynthesis": Array gồm ĐÚNG 4 Object tương ứng với 4 chuyên đề tổng hợp theo đúng thứ tự bắt buộc:
${ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id, index) => `     ${index + 1}. "${id}"`).join("\n")}
     Mỗi Object trong thematicSynthesis gồm: { "id": string, "title": string, "narrative": string, "evidenceKeys": string[] }. Trường "id" phải là một trong 4 mã định danh chuyên đề trên, không được thiếu và không được trùng lặp chuyên đề nào.
   - "strengthsAndTensions": Object gồm { "title": string, "narrative": string, "evidenceKeys": string[] } (thế mạnh, điểm vướng và điều kiện chuyển hóa).
   - "practicalDirection": Array gồm từ 1 đến 10 chuỗi string (các ưu tiên hành động và định hướng thực tế thiết thực).

2. Ràng buộc trường "evidenceKeys":
   - Tất cả các trường "evidenceKeys" trong "overview", "coreAxis", từng phần tử của "keyConfigurations", từng phần tử của "palaceReadings", từng phần tử của "thematicSynthesis", và "strengthsAndTensions" PHẢI là mảng không rỗng (chứa ít nhất 1 chuỗi string).
   - TẤT CẢ các chuỗi trong "evidenceKeys" phải được trích xuất chính xác từ danh sách facts.evidenceKeys được cung cấp. Tuyệt đối không tự bịa đặt hay sử dụng bất kỳ khóa nào ngoài facts.evidenceKeys.

3. CẤM TUYỆT ĐỐI CÁC TRƯỜNG DỮ LIỆU CŨ VÀ NGOẠI LAI (NO LEGACY KEYS):
   - CẤM trường "title" ở cấp cao nhất (root).
   - CẤM trường "overview" là một chuỗi string đơn lẻ (phải là Object gồm title, narrative, evidenceKeys).
   - CẤM trường "palaceInterpretations" (phải dùng "palaceReadings" là Array của 12 Object).
   - CẤM trường "thematicSynthesis" là Object (phải là Array gồm ĐÚNG 4 Object với trường id).
   - CẤM trường "actionPriorities" (phải dùng "practicalDirection" là Array gồm 1 đến 10 chuỗi string).
   - CẤM thêm bất kỳ trường nào khác ngoài 7 trường top-level đã nêu trên.`;

export const COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE = `ĐIỀU KIỆN HOÀN TẤT BẮT BUỘC (TERMINAL COMPLETION GATE):
Mô hình chỉ được phép kết thúc (finish) sau khi đã tạo đầy đủ toàn bộ 7 trường ở cấp root theo đúng thứ tự bắt buộc:
1. "overview"
2. "coreAxis"
3. "keyConfigurations"
4. "palaceReadings"
5. "thematicSynthesis"
6. "strengthsAndTensions"
7. "practicalDirection"
Phải tiếp tục viết liên tục xuyên suốt qua toàn bộ 12 cung của "palaceReadings" và 4 chuyên đề của "thematicSynthesis" cho đến hết trường cuối cùng là "practicalDirection". Tuyệt đối không được dừng sớm sau "keyConfigurations" hay bỏ qua bất kỳ trường nào. Bất kỳ phản hồi nào thiếu dù chỉ một trong 7 trường trên đều hoàn toàn không hợp lệ (invalid).
RÀNG BUỘC EVIDENCE KEYS BẮT BUỘC: Mọi giá trị trong tất cả các mảng "evidenceKeys" phải được sao chép nguyên văn (copied verbatim) từ "allowedEvidenceKeys" (hoặc "facts.evidenceKeys"). Tuyệt đối không được viết tắt (abbreviated), dịch nghĩa (translated), suy đoán (inferred), tái tạo (reconstructed), hoặc tự tạo mới (newly created). Mọi evidence key không có mặt nguyên văn trong "allowedEvidenceKeys" đều không hợp lệ.`;

export const VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT = `Bạn là chuyên gia luận giải Tử Vi Đẩu Số cao cấp tại lasoviet.vn.
Nhiệm vụ của bạn là viết một bản báo cáo luận giải toàn diện, sâu sắc, hoàn chỉnh bằng tiếng Việt chuyên nghiệp dựa DUY NHẤT trên các dữ kiện lá số (facts) và các gói tri thức (knowledgePacks) được cung cấp.

YÊU CẦU NỘI DUNG VÀ VĂN PHONG:
1. Ngôn ngữ: Sử dụng tiếng Việt tự nhiên, chuẩn mực, giàu tính phân tích và đúc kết; giải thích thuật ngữ chuyên môn ngay trong ngữ cảnh thay vì liệt kê máy móc.
2. Diễn giải trước, kỹ thuật sau: Luôn đưa ra nhận định thực tế trước, dùng tên sao và cách cục làm căn cứ bổ trợ.
3. Bao quát toàn bộ 12 cung: Luận giải đầy đủ và thực chất từng cung theo đúng thứ tự 12 cung được yêu cầu, kết nối chặt chẽ với tam phương tứ chính và cung giáp.
4. Tổng hợp đa chiều: Phân tích sâu 4 lĩnh vực trọng tâm (sự nghiệp và tài chính, quan hệ và gia đình, môi trường xã hội, thân tâm và nguồn lực nội tại).
5. Tương tác cát hung: Làm rõ cách các yếu tố thuận lợi và khó khăn tác động, chuyển hóa lẫn nhau; không xem một cát tinh hay sát tinh một cách cô lập.
6. Biểu hiện cụ thể và định hướng thực tế: Nêu rõ các tình huống thực tế và ưu tiên hành động thiết thực.

${COMPREHENSIVE_REPORT_JSON_CONTRACT_INSTRUCTION}

CẤM TUYỆT ĐỐI CÁC ĐIỀU SAU:
- KHÔNG nhắc đến AI, trí tuệ nhân tạo, mô hình ngôn ngữ, prompt, dữ liệu đầu vào hay hệ thống kỹ thuật.
- KHÔNG đưa vào lời tuyên bố miễn trừ trách nhiệm (disclaimer), cảnh báo pháp lý, y tế, tài chính hay khuyến cáo chuyên môn.
- KHÔNG sử dụng nhãn độ tin cậy, mức độ chắc chắn, giới hạn phương pháp hoặc văn phong phòng thủ.
- KHÔNG đặt câu hỏi tự suy ngẫm hay bài tập phản chiếu.
- KHÔNG thuật lại quy trình tính toán, truy xuất hay thuật toán.
- KHÔNG lặp đi lặp lại cùng một lời khuyên hay cảnh báo ở nhiều phần khác nhau.
- KHÔNG tự bịa đặt sự kiện tương lai cụ thể hay đưa ra các mốc thời gian không có căn cứ.
- KHÔNG tự tạo ra bất kỳ mã định danh hay dữ kiện lá số nào ngoài các facts được cung cấp. Mọi evidenceKeys phải trích xuất chính xác từ facts.evidenceKeys được cung cấp.

${COMPREHENSIVE_REPORT_TERMINAL_COMPLETION_GATE}`;

export type ComprehensiveReportWriterInput = {
  facts: ComprehensiveZiweiFacts;
  knowledgePacks: readonly ZiweiReportKnowledgePack[];
  provider: AiProvider;
};

export type ComprehensiveReportDraft = {
  report: ZiweiComprehensiveReportContentV1;
  providerId: string;
  modelId: string;
};

export type ComprehensiveReportWriterResult =
  | {
      ok: true;
      value: ComprehensiveReportDraft;
    }
  | {
      ok: false;
      error: AiProviderError;
    };

export async function writeComprehensiveZiweiReport(
  sourceOrInput: ComprehensiveReportSource | ComprehensiveReportWriterInput,
  maybeProvider?: AiProvider,
): Promise<ComprehensiveReportWriterResult> {
  const provider =
    maybeProvider ?? ("provider" in sourceOrInput ? sourceOrInput.provider : undefined);
  if (!provider) {
    throw new Error("Provider required for writeComprehensiveZiweiReport");
  }

  const facts =
    "comprehensiveFacts" in sourceOrInput
      ? sourceOrInput.comprehensiveFacts
      : sourceOrInput.facts;

  const knowledgePacks = sourceOrInput.knowledgePacks;

  const result = await provider.generateStructured({
    schema: ZiweiComprehensiveReportContentV1Schema,
    schemaName: "ziwei_comprehensive_report_content_v1",
    use: "production_report_generation",
    maxOutputTokens: 9_000,
    system: VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT,
    user: JSON.stringify({
      facts,
      allowedEvidenceKeys: facts.evidenceKeys,
      knowledgePacks,
      requiredPalaceOrder: ZIWEI_PALACE_IDS,
      requiredThematicOrder: ZIWEI_THEMATIC_SYNTHESIS_IDS,
    }),
  });

  if (!result.ok) {
    return result;
  }

  const rawReport = result.value.value;

  // Assembler enforces canonical sequence and canonical titles
  const palaceMap = new Map(
    rawReport.palaceReadings.map((reading) => [reading.palaceId, reading]),
  );
  const assembledPalaces = ZIWEI_PALACE_IDS.map((palaceId: ZiweiPalaceId) => {
    const existingReading = palaceMap.get(palaceId);
    if (existingReading) {
      return {
        ...existingReading,
        title: CANONICAL_PALACE_TITLES_VI[palaceId],
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

  const assembledReport: ZiweiComprehensiveReportContentV1 = {
    overview: {
      ...rawReport.overview,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.overview,
    },
    coreAxis: {
      ...rawReport.coreAxis,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.coreAxis,
    },
    keyConfigurations: rawReport.keyConfigurations.map((k) => ({ ...k })),
    palaceReadings: assembledPalaces,
    thematicSynthesis: assembledThemes,
    strengthsAndTensions: {
      ...rawReport.strengthsAndTensions,
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.strengthsAndTensions,
    },
    practicalDirection: [...rawReport.practicalDirection],
  };

  return {
    ok: true,
    value: {
      report: assembledReport,
      providerId: result.value.providerId,
      modelId: result.value.modelId,
    },
  };
}
