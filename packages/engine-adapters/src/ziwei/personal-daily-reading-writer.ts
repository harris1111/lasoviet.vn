import { astro } from "iztro";

import type {
  NormalizedBirthProfileV1,
  PersonalDailyReadingAspect,
  PersonalDailyReadingV1,
  ZiweiHoroscopeResultV1,
  ZiweiPalaceId,
} from "@lasoviet/contracts";
import { PersonalDailyReadingV1Schema } from "@lasoviet/contracts";

import { iztroGender, iztroTimeIndex } from "./iztro-adapter.js";
import { calculateZiweiHoroscope } from "./iztro-horoscope.js";
import { branchIds, palaceIds } from "./iztro-mapping.js";

const MAJOR_STAR_NAMES_VI: Record<string, string> = {
  emperor: "Tử Vi",
  advisor: "Thiên Cơ",
  sun: "Thái Dương",
  general: "Vũ Khúc",
  fortunate: "Thiên Đồng",
  judge: "Liêm Trinh",
  empress: "Thiên Phủ",
  moon: "Thái Âm",
  wolf: "Tham Lang",
  advocator: "Cự Môn",
  minister: "Thiên Tướng",
  sage: "Thiên Lương",
  marshal: "Thất Sát",
  rebel: "Phá Quân",
  紫微: "Tử Vi",
  天机: "Thiên Cơ",
  太阳: "Thái Dương",
  武曲: "Vũ Khúc",
  天同: "Thiên Đồng",
  廉贞: "Liêm Trinh",
  天府: "Thiên Phủ",
  太阴: "Thái Âm",
  贪狼: "Tham Lang",
  巨门: "Cự Môn",
  天相: "Thiên Tướng",
  天梁: "Thiên Lương",
  七杀: "Thất Sát",
  破军: "Phá Quân",
};

const MINOR_STAR_NAMES_VI: Record<string, string> = {
  officer: "Tả Phù",
  helper: "Hữu Bật",
  scholar: "Văn Xương",
  artist: "Văn Khúc",
  money: "Lộc Tồn",
  horse: "Thiên Mã",
  driven: "Kình Dương",
  tangled: "Đà La",
  impulsive: "Hỏa Tinh",
  spark: "Linh Tinh",
  assistant: "Thiên Khôi",
  aide: "Thiên Việt",
  ideologue: "Địa Không",
  fickle: "Địa Kiếp",
  cheerful: "Hỷ Thần",
  "assistant(d)": "Lưu Khôi",
  "aide(d)": "Lưu Việt",
  "horse(d)": "Lưu Mã",
  "money(d)": "Lưu Lộc",
  "driven(d)": "Lưu Kình",
  "tangled(d)": "Lưu Đà",
  "cheerful(d)": "Lưu Hỷ",
  左辅: "Tả Phù",
  右弼: "Hữu Bật",
  文昌: "Văn Xương",
  文曲: "Văn Khúc",
  禄存: "Lộc Tồn",
  天马: "Thiên Mã",
  擎羊: "Kình Dương",
  陀罗: "Đà La",
  火星: "Hỏa Tinh",
  铃星: "Linh Tinh",
  天魁: "Thiên Khôi",
  天钺: "Thiên Việt",
  地空: "Địa Không",
  地劫: "Địa Kiếp",
  红鸾: "Hồng Loan",
  天喜: "Thiên Hỷ",
};

const PALACE_DESCRIPTIONS_VI: Record<
  ZiweiPalaceId,
  {
    theme: string;
    workFocus: string;
    financeFocus: string;
    relationshipFocus: string;
    wellbeingFocus: string;
    recommendation: string;
    caution: string;
  }
> = {
  "ziwei.palace.life": {
    theme: "chủ động khẳng định định hướng bản thân",
    workFocus:
      "Tập trung vào các quyết định mang tính chiến lược cá nhân. Rà soát lại mục tiêu ngắn hạn và giữ vững nhịp độ làm việc.",
    financeFocus:
      "Cân nhắc các khoản chi tiêu trực tiếp cho kế hoạch nâng cao kỹ năng hoặc cải thiện công cụ làm việc.",
    relationshipFocus:
      "Giao tiếp thẳng thắn, rõ ràng với người xung quanh nhưng giữ thái độ ôn hòa và cởi mở.",
    wellbeingFocus:
      "Chú ý điều hòa năng lượng, không để áp lực mục tiêu cá nhân gây căng thẳng thần kinh.",
    recommendation: "Xác định rõ việc trọng tâm trong ngày và giải quyết dứt điểm.",
    caution: "Tránh bảo thủ hoặc tranh cãi áp đặt quan điểm cá nhân.",
  },
  "ziwei.palace.siblings": {
    theme: "tương tác đồng nghiệp và các mối quan hệ hỗ trợ",
    workFocus:
      "Thuận lợi cho các buổi thảo luận nhóm, phân chia nhiệm vụ và phối hợp ăn ý giữa các cộng sự.",
    financeFocus:
      "Rõ ràng trong việc chia sẻ chi phí chung hoặc các thỏa thuận hùn hạp tài chính nhỏ.",
    relationshipFocus:
      "Hỏi thăm, gắn kết tình cảm với anh chị em hoặc bạn bè thân thiết có cùng chí hướng.",
    wellbeingFocus:
      "Giữ không gian trò chuyện thoải mái, tránh ôm đồm việc của người khác.",
    recommendation: "Chủ động kết nối và lắng nghe góc nhìn từ đồng nghiệp thân tín.",
    caution: "Không nên can thiệp quá sâu vào việc riêng tư của cộng sự.",
  },
  "ziwei.palace.spouse": {
    theme: "hợp tác đôi bên và giữ hòa khí trong gia đình",
    workFocus:
      "Thích hợp để rà soát các hợp đồng hợp tác song phương hoặc đàm phán thỏa thuận đối tác.",
    financeFocus:
      "Minh bạch trong các khoản chi chung của gia đình hoặc kế hoạch tài chính cùng người đồng hành.",
    relationshipFocus:
      "Dành thời gian lắng nghe tâm tư của bạn đời hoặc đối phương, chủ động nhường nhịn khi có khác biệt.",
    wellbeingFocus:
      "Duy trì cảm xúc tích cực, tạo không khí ấm áp trong các buổi trò chuyện cuối ngày.",
    recommendation: "Lắng nghe kỹ trước khi đưa ra nhận định hoặc phản hồi.",
    caution: "Tránh nhắc lại mâu thuẫn cũ hoặc so đo lời nói khi mệt mỏi.",
  },
  "ziwei.palace.children": {
    theme: "sáng tạo, thế hệ kế cận và các dự án ấp ủ",
    workFocus:
      "Thời điểm thích hợp để triển khai ý tưởng sáng tạo mới hoặc hướng dẫn, hỗ trợ nhân sự cấp dưới.",
    financeFocus:
      "Kiểm soát chi phí phát sinh cho các dự án mới hoặc các khoản mua sắm giải trí.",
    relationshipFocus:
      "Gần gũi, lắng nghe con cái hoặc chia sẻ kinh nghiệm bổ ích cho người đi sau.",
    wellbeingFocus:
      "Tìm kiếm niềm vui qua các hoạt động thể thao nhẹ hoặc sở thích cá nhân bổ ích.",
    recommendation: "Ghi chép lại các ý tưởng mới nảy sinh trong ngày để đánh giá chi tiết.",
    caution: "Tránh áp đặt kỳ vọng quá khắt khe lên người trẻ hoặc cấp dưới.",
  },
  "ziwei.palace.wealth": {
    theme: "dòng tiền, thu chi và kiểm soát ngân sách",
    workFocus:
      "Ưu tiên rà soát hiệu quả doanh thu, giải quyết các khoản công nợ hoặc kiểm tra sổ sách kế toán.",
    financeFocus:
      "Tập trung giữ an toàn dòng vốn. Hạn chế chi tiêu theo cảm xúc hoặc các quyết định đầu tư lướt sóng.",
    relationshipFocus:
      "Minh bạch và sòng phẳng trong mọi giao dịch tài chính với người quen để tránh khúc mắc.",
    wellbeingFocus:
      "Tránh để những bận tâm tiền bạc làm ảnh hưởng đến bữa ăn và giấc ngủ ngon.",
    recommendation: "Lập danh sách các khoản cần chi và đối chiếu lại trước khi chuyển khoản.",
    caution: "Tuyệt đối kiêng cho vay mượn thiếu cam kết rõ ràng hoặc xuất tiền vội vàng.",
  },
  "ziwei.palace.health": {
    theme: "chăm sóc thân thể, phục hồi thể lực và nhịp sinh hoạt",
    workFocus:
      "Sắp xếp công việc theo thứ tự ưu tiên, tránh làm việc dồn dập quá sức vào buổi chiều.",
    financeFocus:
      "Ưu tiên ngân sách cho thực phẩm dinh dưỡng lành mạnh và các nhu cầu chăm sóc sức khỏe định kỳ.",
    relationshipFocus:
      "Hạn chế những cuộc tranh luận gây căng thẳng thần kinh; ưu tiên môi trường yên tĩnh.",
    wellbeingFocus:
      "Uống đủ nước, vận động nhẹ giữa các giờ làm việc và đi ngủ đúng giờ.",
    recommendation: "Dành 20-30 phút nghỉ ngơi tĩnh tâm hoặc đi bộ thư giãn sau giờ làm.",
    caution: "Tránh thức khuya hoặc sử dụng chất kích thích khi cơ thể đang báo mệt.",
  },
  "ziwei.palace.travel": {
    theme: "gặp gỡ bên ngoài, đi lại và mở rộng không gian sống",
    workFocus:
      "Thuận lợi cho việc di chuyển gặp gỡ khách hàng, mở rộng mạng lưới giao thiệp bên ngoài.",
    financeFocus:
      "Chuẩn bị kỹ chi phí phát sinh khi di chuyển hoặc tham gia các sự kiện giao lưu bên ngoài.",
    relationshipFocus:
      "Tạo ấn tượng lịch thiệp, chu đáo với những người mới quen trong công việc.",
    wellbeingFocus:
      "Chú ý an toàn khi tham gia giao thông, chuẩn bị đồ đạc cẩn thận trước khi xuất hành.",
    recommendation: "Kiểm tra kỹ lịch trình, phương tiện và hồ sơ cần mang theo trước khi ra ngoài.",
    caution: "Hạn chế vội vã khi đi lại trên đường vào giờ cao điểm.",
  },
  "ziwei.palace.friends": {
    theme: "mạng lưới bạn bè, đối tác xã hội và sự hỗ trợ cộng đồng",
    workFocus:
      "Tham khảo ý kiến chuyên môn từ những người có kinh nghiệm trong mạng lưới quan hệ.",
    financeFocus:
      "Cảnh giác trước những lời mời hợp tác tài chính hấp dẫn từ người chưa đủ độ tin cậy.",
    relationshipFocus:
      "Duy trì tương tác tích cực với bạn bè chân thành; tránh các hội nhóm bàn luận chuyện người khác.",
    wellbeingFocus:
      "Chọn lọc môi trường tiếp xúc để giữ cho tâm trí luôn nhẹ nhàng, tích cực.",
    recommendation: "Gặp gỡ hoặc trò chuyện cùng người bạn có tư duy tích cực, xây dựng.",
    caution: "Tránh chia sẻ các thông tin bảo mật công việc cho người ngoài cuộc.",
  },
  "ziwei.palace.career": {
    theme: "tiến độ công việc, uy tín nghề nghiệp và trách nhiệm",
    workFocus:
      "Tập trung hoàn thành các mục tiêu quan trọng đúng hạn. Rà soát chất lượng hồ sơ báo cáo chuyên môn.",
    financeFocus:
      "Định giá đúng công sức và năng lực của bản thân trong các đề xuất thù lao hoặc hợp đồng.",
    relationshipFocus:
      "Giữ thái độ chuyên nghiệp, tôn trọng kỷ luật chung và tôn trọng cấp trên lẫn cộng sự.",
    wellbeingFocus:
      "Cân bằng giữa giờ làm việc và thời gian nghỉ để duy trì độ sắc bén trong tư duy.",
    recommendation: "Lập kế hoạch công việc chi tiết từ đầu ngày và thực hiện theo từng nấc.",
    caution: "Tránh trì hoãn các việc trọng tâm hoặc nhận thêm việc khi chưa xong việc cũ.",
  },
  "ziwei.palace.property": {
    theme: "không gian sống, tích lũy tài sản và sự ổn định của gia đình",
    workFocus:
      "Thích hợp để sắp xếp lại không gian làm việc gọn gàng, tạo cảm hứng sáng tạo và tập trung.",
    financeFocus:
      "Xem xét các kế hoạch tích lũy dài hạn, bảo dưỡng tài sản vật chất và nhà ở.",
    relationshipFocus:
      "Quan tâm chăm sóc các thành viên trong gia đình, xây dựng không khí ấm cúng tại tổ ấm.",
    wellbeingFocus:
      "Dọn dẹp môi trường sống thoáng đãng, mang lại năng lượng trong lành cho cả nhà.",
    recommendation: "Sắp xếp lại bàn làm việc hoặc sửa sang một góc sinh hoạt trong nhà.",
    caution: "Tránh mua sắm các vật dụng gia đình đắt đỏ mà chưa thực sự cần thiết.",
  },
  "ziwei.palace.fortune": {
    theme: "tâm an, chiều sâu tinh thần và sự thanh thản nội tâm",
    workFocus:
      "Giữ cái nhìn bao dung và bình tĩnh trước mọi biến động hoặc áp lực trong công việc.",
    financeFocus:
      "Xem nhẹ những tính toán vụn vặt; ưu tiên hành động hướng tới giá trị bền vững lâu dài.",
    relationshipFocus:
      "Thấu hiểu và chia sẻ với người thân; giữ tâm thế dĩ hòa vi quý trong ứng xử.",
    wellbeingFocus:
      "Dành thời gian đọc sách, thiền định hoặc nghe nhạc thư giãn để nuôi dưỡng tinh thần.",
    recommendation: "Lắng đọng tâm trí 15 phút đầu ngày để xác lập năng lượng an yên.",
    caution: "Tránh suy nghĩ luẩn quẩn về những việc ngoài tầm kiểm soát của bản thân.",
  },
  "ziwei.palace.parents": {
    theme: "quan hệ với cha mẹ, người lớn tuổi và thủ tục giấy tờ",
    workFocus:
      "Cần rà soát kỹ văn bản pháp lý, giấy tờ hành chính và tuân thủ chặt chẽ quy định tổ chức.",
    financeFocus:
      "Chú ý các khoản chi phí liên quan đến hóa đơn, thuế hoặc phụng dưỡng đấng sinh thành.",
    relationshipFocus:
      "Gọi điện thăm hỏi cha mẹ, người lớn tuổi hoặc thầy cô đã dẫn dắt mình.",
    wellbeingFocus:
      "Học hỏi sự điềm đạm từ thế hệ đi trước để rèn luyện đức tính kiên nhẫn.",
    recommendation: "Hoàn tất các thủ tục giấy tờ tồn đọng và thăm hỏi bậc sinh thành.",
    caution: "Không ký tá bất kỳ văn bản nào khi chưa đọc kỹ toàn bộ điều khoản.",
  },
};

// Patterns strictly banned under FD-089
const FD089_DEATH_PATTERN =
  /(?<![\p{L}\p{N}])(?:chết|chet|tử\s+vong|tu\s+vong|mất\s+mạng|mat\s+mang|qua\s+đời|qua\s+doi|yểu\s+mệnh|yeu\s+menh|đoản\s+thọ|doan\s+tho|chết\s+non|chet\s+non|tuổi\s+thọ|tuoi\s+tho|sống\s+được\s+bao\s+lâu|song\s+duoc\s+bao\s+lau|bao\s+nhiêu\s+tuổi\s+thì\s+mất|bao\s+nhieu\s+tuoi\s+thi\s+mat|khắc\s+chết|khac\s+chet|sát\s+phu|sat\s+phu|sát\s+thê|sat\s+the)(?![\p{L}\p{N}])/iu;

const FD089_RITUAL_PATTERN =
  /(?<![\p{L}\p{N}])(?:cúng\s+bái|cúng\s+sao|giải\s+hạn|hoá\s+giải\s+bằng|bùa\s+chú|bùa\s+ngải|vật\s+phẩm\s+phong\s+thuỷ|mua\s+vật\s+phẩm|thỉnh\s+bùa|lập\s+bàn\s+thờ)(?![\p{L}\p{N}])/iu;

const FD089_LOTTERY_PATTERN =
  /(?<![\p{L}\p{N}])(?:lô\s+đề|số\s+đề|đánh\s+đề|con\s+số\s+may\s+mắn\s+để\s+đánh|vé\s+số|cá\s+độ)(?![\p{L}\p{N}])/iu;

export type PersonalDailyReadingWriterOptions = {
  chartId?: string;
  chartVersionId?: string;
  asOfDate?: string; // YYYY-MM-DD
  now?: () => Date;
};

/**
 * Validates a personal daily reading against the strict FD-089 content line and evidence anchoring rules.
 */
export function validatePersonalDailyReadingQuality(
  reading: PersonalDailyReadingV1,
  engineHoroscope: ZiweiHoroscopeResultV1,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  const textToScan = [
    reading.reading.headline,
    reading.reading.overview,
    ...reading.reading.aspects.map((a) => `${a.title} ${a.guidance}`),
    ...reading.reading.actionPlan.recommendations,
    ...reading.reading.actionPlan.cautions,
  ].join(" ");

  // Rule 1: No death or lifespan predictions
  if (FD089_DEATH_PATTERN.test(textToScan)) {
    errors.push(
      "FD-089 Violation: Content contains forbidden death, lifespan, or 'khắc chết' statements",
    );
  }

  // Rule 2: No rituals, amulets, cúng bái, giải hạn
  if (FD089_RITUAL_PATTERN.test(textToScan)) {
    errors.push(
      "FD-089 Violation: Content contains forbidden rituals, amulets, or superstition remedies",
    );
  }

  // Rule 3: No lottery or gambling numbers
  if (FD089_LOTTERY_PATTERN.test(textToScan)) {
    errors.push(
      "FD-089 Violation: Content contains forbidden lottery or gambling suggestions",
    );
  }

  // Rule 4: Grounded evidence consistency
  if (
    reading.chartGrounding.touchedPalaceId !==
    engineHoroscope.daily.touchedPalaceId
  ) {
    errors.push(
      `FD-089 Evidence Mismatch: Touched palace '${reading.chartGrounding.touchedPalaceId}' does not match engine result '${engineHoroscope.daily.touchedPalaceId}'`,
    );
  }

  if (reading.calendar.solarDate !== engineHoroscope.daily.solarDate) {
    errors.push(
      `FD-089 Evidence Mismatch: Solar date '${reading.calendar.solarDate}' does not match engine date '${engineHoroscope.daily.solarDate}'`,
    );
  }

  // Ensure evidence keys are present and cite engine
  if (
    !reading.evidenceKeys.includes(`daily.palace.${engineHoroscope.daily.touchedPalaceId}`)
  ) {
    errors.push(
      `FD-089 Evidence Missing: Missing daily palace evidence key for '${engineHoroscope.daily.touchedPalaceId}'`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Deterministic writer for Personal Daily Reading from a specific Zi Wei chart.
 * Uses iztro-horoscope engine computation to derive rich, personalized,
 * palace-specific daily insights and enforces FD-089 evidence-only quality gates.
 */
export function writePersonalDailyReading(
  birthProfile: NormalizedBirthProfileV1,
  options: PersonalDailyReadingWriterOptions = {},
): PersonalDailyReadingV1 {
  const generatedAt = (options.now ?? (() => new Date()))();
  const asOfDate = options.asOfDate || generatedAt.toISOString().slice(0, 10);
  const chartId = options.chartId || "transient-chart";
  const chartVersionId = options.chartVersionId || "transient-version";

  // 1. Calculate deterministic horoscope using iztro engine
  const horoscope = calculateZiweiHoroscope(birthProfile, {
    chartId,
    chartVersionId,
    asOfDate,
    isUnlocked: true,
  });

  const dailyEngine = horoscope.daily;
  const touchedPalaceId = dailyEngine.touchedPalaceId as ZiweiPalaceId;
  const touchedPalaceName = dailyEngine.touchedPalaceName;

  // 2. Extract detailed palace and star configuration via iztro astrolabe
  const resolvedGender = iztroGender(birthProfile);
  const selectedTimeIndex = iztroTimeIndex(birthProfile);

  if (resolvedGender === undefined || selectedTimeIndex === undefined) {
    throw new Error(
      "Invalid birth profile gender or time index for personal daily reading",
    );
  }

  const astrolabe = astro.withOptions({
    type: birthProfile.normalizedCalendar.kind,
    dateStr: birthProfile.normalizedCalendar.date,
    timeIndex: selectedTimeIndex,
    gender: resolvedGender,
    isLeapMonth:
      birthProfile.normalizedCalendar.kind === "lunar"
        ? birthProfile.normalizedCalendar.isLeapMonth
        : undefined,
    language: "en-US",
  });

  const hs = astrolabe.horoscope(asOfDate, selectedTimeIndex);
  const dailyScope = hs.daily;

  // Find the exact touched palace in astrolabe
  const touchedPalaceObj =
    astrolabe.palaces.find((p) => p.earthlyBranch === dailyScope.earthlyBranch) ||
    astrolabe.palaces[dailyScope.index];

  const majorStars: string[] = (touchedPalaceObj?.majorStars ?? []).map(
    (s) => MAJOR_STAR_NAMES_VI[s.name] || s.name,
  );

  const minorStars: string[] = (touchedPalaceObj?.minorStars ?? []).map(
    (s) => MINOR_STAR_NAMES_VI[s.name] || s.name,
  );

  // Daily stars from horoscope daily scope
  const rawPalaceStars = Array.isArray(dailyScope.stars)
    ? dailyScope.stars[dailyScope.index]
    : undefined;
  const starsList: Array<{ name: string }> = Array.isArray(rawPalaceStars)
    ? (rawPalaceStars as unknown as Array<{ name: string }>)
    : Array.isArray(dailyScope.stars)
      ? (dailyScope.stars as unknown as Array<{ name: string }>)
      : [];

  const dailyStars: string[] = starsList.map(
    (s) => MINOR_STAR_NAMES_VI[s.name] || s.name,
  );

  // Daily mutagens: dailyScope.mutagen is [loc, quyen, khoa, ky]
  const mutagenTypes = ["loc", "quyen", "khoa", "ky"] as const;
  const dailyMutagens: Array<{
    mutagen: "loc" | "quyen" | "khoa" | "ky";
    starName: string;
  }> = [];

  if (Array.isArray(dailyScope.mutagen)) {
    for (let i = 0; i < dailyScope.mutagen.length; i++) {
      const rawStar = dailyScope.mutagen[i];
      if (typeof rawStar === "string" && rawStar) {
        const starName = MAJOR_STAR_NAMES_VI[rawStar] || rawStar;
        const mutagen = mutagenTypes[i];
        if (mutagen) {
          dailyMutagens.push({ mutagen, starName });
        }
      }
    }
  }

  // 3. Synthesize rich personalized narrative anchored in touched palace & stars
  const palaceConfig =
    PALACE_DESCRIPTIONS_VI[touchedPalaceId] ||
    PALACE_DESCRIPTIONS_VI["ziwei.palace.career"];

  const headline = `Ngày ${dailyEngine.dayStemBranch}: ${palaceConfig.theme}`;

  const overview =
    `Ngày ${dailyEngine.dayStemBranch} trên lá số của bạn ứng với cung ${touchedPalaceName}, phần nói về ${palaceConfig.theme}. ` +
    `Bạn có thể dựa vào chủ đề này để sắp xếp việc trong ngày, đồng thời đối chiếu với hoàn cảnh thực tế của mình.`;

  const aspects: PersonalDailyReadingAspect[] = [
    {
      key: "work",
      title: "Công việc & Trách nhiệm",
      guidance: palaceConfig.workFocus,
      evidenceKeys: [
        `daily.palace.${touchedPalaceId}`,
        "daily.aspect.work",
        `daily.branch.${branchIds[dailyScope.earthlyBranch] || dailyScope.earthlyBranch}`,
      ],
    },
    {
      key: "finances",
      title: "Tài chính & Dòng tiền",
      guidance: palaceConfig.financeFocus,
      evidenceKeys: [
        `daily.palace.${touchedPalaceId}`,
        "daily.aspect.finances",
      ],
    },
    {
      key: "relationships",
      title: "Tình cảm & Hòa khí",
      guidance: palaceConfig.relationshipFocus,
      evidenceKeys: [
        `daily.palace.${touchedPalaceId}`,
        "daily.aspect.relationships",
      ],
    },
    {
      key: "wellbeing",
      title: "Sức khỏe & Sinh hoạt",
      guidance: palaceConfig.wellbeingFocus,
      evidenceKeys: [
        `daily.palace.${touchedPalaceId}`,
        "daily.aspect.wellbeing",
      ],
    },
  ];

  const actionPlan = {
    recommendations: [
      palaceConfig.recommendation,
      "Ghi nhận diễn biến các việc trong ngày để tự đối chiếu với cấu trúc lá số.",
    ],
    cautions: [
      palaceConfig.caution,
      "Tránh nóng vội đưa ra kết luận khi chưa nắm đầy đủ thông tin thực tế.",
    ],
    evidenceKeys: [
      `daily.palace.${touchedPalaceId}`,
      "daily.action.recommendations",
      "daily.action.cautions",
    ],
  };

  const topEvidenceKeys = [
    `daily.date.${asOfDate}`,
    `daily.branch.${branchIds[dailyScope.earthlyBranch] || dailyScope.earthlyBranch}`,
    `daily.palace.${touchedPalaceId}`,
    ...aspects.flatMap((a) => a.evidenceKeys),
    ...actionPlan.evidenceKeys,
  ];

  const uniqueEvidenceKeys = Array.from(new Set(topEvidenceKeys));

  const candidateReading: PersonalDailyReadingV1 = {
    version: 1,
    chartId,
    chartVersionId,
    asOfDate,
    calendar: {
      solarDate: dailyEngine.solarDate,
      solarDateFormatted: dailyEngine.solarDateFormatted,
      lunarDateFormatted: dailyEngine.lunarDateFormatted,
      dayStemBranch: dailyEngine.dayStemBranch,
      solarTerm: dailyEngine.solarTerm,
    },
    chartGrounding: {
      touchedPalaceId,
      touchedPalaceName,
      earthlyBranch: branchIds[dailyScope.earthlyBranch] || dailyScope.earthlyBranch,
      majorStars,
      dailyStars,
      dailyMutagens,
    },
    reading: {
      headline,
      overview,
      aspects,
      actionPlan,
    },
    evidenceKeys: uniqueEvidenceKeys,
    qualityGate: {
      passed: true,
      checkedAt: generatedAt.toISOString(),
      rulesChecked: [
        "FD089_NO_DEATH_LIFESPAN",
        "FD089_NO_RITUALS_AMULETS",
        "FD089_NO_LOTTERY_GAMBLING",
        "FD089_ENGINE_EVIDENCE_ANCHORED",
      ],
    },
  };

  // 4. Validate through FD-089 quality gate
  const gateResult = validatePersonalDailyReadingQuality(
    candidateReading,
    horoscope,
  );

  if (!gateResult.ok) {
    throw new Error(
      `Personal daily reading failed FD-089 quality gates: ${gateResult.errors.join("; ")}`,
    );
  }

  // 5. Final schema validation
  const parsed = PersonalDailyReadingV1Schema.safeParse(candidateReading);
  if (!parsed.success) {
    throw new Error(
      `Personal daily reading schema validation failed: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
