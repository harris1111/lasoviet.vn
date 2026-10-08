import { astro } from "iztro";
import { Solar } from "lunar-typescript";

import type {
  NormalizedBirthProfileV1,
  ZiweiBranchId,
  ZiweiDailyHoroscopeV1,
  ZiweiHoroscopeResultV1,
  ZiweiMonthMarker,
  ZiweiMonthlyHanV1,
  ZiweiPalaceId,
  ZiweiYearlyHanV1,
} from "@lasoviet/contracts";

import { iztroGender, iztroTimeIndex } from "./iztro-adapter.js";
import { branchIds, palaceIds } from "./iztro-mapping.js";
import { computedMonthlyAttention } from "./monthly-attention.js";

const STEM_NAMES_VI: Record<string, string> = {
  jia: "Giáp",
  yi: "Ất",
  bing: "Bính",
  ding: "Đinh",
  wu: "Mậu",
  ji: "Kỷ",
  geng: "Canh",
  xin: "Tân",
  ren: "Nhâm",
  gui: "Quý",
  甲: "Giáp",
  乙: "Ất",
  丙: "Bính",
  丁: "Đinh",
  戊: "Mậu",
  己: "Kỷ",
  庚: "Canh",
  辛: "Tân",
  壬: "Nhâm",
  癸: "Quý",
};

const BRANCH_NAMES_VI: Record<string, string> = {
  zi: "Tý",
  chou: "Sửu",
  yin: "Dần",
  mao: "Mão",
  chen: "Thìn",
  si: "Tỵ",
  woo: "Ngọ",
  wu: "Ngọ",
  wei: "Mùi",
  shen: "Thân",
  you: "Dậu",
  xu: "Tuất",
  hai: "Hợi",
  子: "Tý",
  丑: "Sửu",
  寅: "Dần",
  卯: "Mão",
  辰: "Thìn",
  巳: "Tỵ",
  午: "Ngọ",
  未: "Mùi",
  申: "Thân",
  酉: "Dậu",
  戌: "Tuất",
  亥: "Hợi",
};

const PALACE_NAMES_VI: Record<string, string> = {
  soul: "Mệnh",
  siblings: "Huynh Đệ",
  spouse: "Phu Thê",
  children: "Tử Tức",
  wealth: "Tài Bạch",
  health: "Tật Ách",
  surface: "Thiên Di",
  travel: "Thiên Di",
  friends: "Nô Bộc",
  career: "Quan Lộc",
  property: "Điền Trạch",
  spirit: "Phúc Đức",
  fortune: "Phúc Đức",
  parents: "Phụ Mẫu",
  命宫: "Mệnh",
  兄弟: "Huynh Đệ",
  夫妻: "Phu Thê",
  子女: "Tử Tức",
  财帛: "Tài Bạch",
  疾厄: "Tật Ách",
  迁移: "Thiên Di",
  仆役: "Nô Bộc",
  官禄: "Quan Lộc",
  田宅: "Điền Trạch",
  福德: "Phúc Đức",
  父母: "Phụ Mẫu",
};

const JIEQI_NAMES_VI: Record<string, string> = {
  立春: "Lập Xuân",
  雨水: "Vũ Thủy",
  惊蛰: "Kinh Trập",
  春分: "Xuân Phân",
  清明: "Thanh Minh",
  谷雨: "Cốc Vũ",
  立夏: "Lập Hạ",
  小满: "Tiểu Mãn",
  芒种: "Mang Chủng",
  夏至: "Hạ Chí",
  小暑: "Tiểu Thử",
  大暑: "Đại Thử",
  立秋: "Lập Thu",
  处暑: "Xử Thử",
  白露: "Bạch Lộ",
  秋分: "Thu Phân",
  寒露: "Hàn Lộ",
  霜降: "Sương Giáng",
  立冬: "Lập Đông",
  小雪: "Tiểu Tuyết",
  大雪: "Đại Tuyết",
  冬至: "Đông Chí",
  小寒: "Tiểu Hàn",
  大寒: "Đại Hàn",
};

const WEEKDAY_NAMES_VI = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export type CalculateHoroscopeOptions = {
  chartId?: string;
  chartVersionId?: string;
  asOfDate?: string; // YYYY-MM-DD
  targetYear?: number;
  isUnlocked?: boolean;
};

export function calculateZiweiHoroscope(
  birthProfile: NormalizedBirthProfileV1,
  options: CalculateHoroscopeOptions = {},
): ZiweiHoroscopeResultV1 {
  const asOfDate = options.asOfDate || new Date().toISOString().slice(0, 10);
  const asOfDateParts = asOfDate.split("-").map((v) => parseInt(v, 10));
  const asOfYear = asOfDateParts[0]!;
  const asOfMonth = asOfDateParts[1]!;
  const asOfDay = asOfDateParts[2]!;

  const targetYear = options.targetYear ?? Solar.fromYmd(asOfYear, asOfMonth, asOfDay).getLunar().getYear();
  const isUnlocked = Boolean(options.isUnlocked);
  const chartId = options.chartId || "transient-chart";
  const chartVersionId = options.chartVersionId || "transient-version";

  const resolvedGender = iztroGender(birthProfile);
  const selectedTimeIndex = iztroTimeIndex(birthProfile);

  if (resolvedGender === undefined || selectedTimeIndex === undefined) {
    throw new Error("Invalid birth profile gender or time index for horoscope calculation");
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
    config: {
      algorithm: "default",
      yearDivide: "normal",
      horoscopeDivide: "normal",
      ageDivide: "normal",
      dayDivide: "current",
    },
  });

  const hs = astrolabe.horoscope(asOfDate, selectedTimeIndex);
  const yearly = astrolabe.horoscope(`${targetYear}-07-01`, selectedTimeIndex).yearly;

  // 1. Annual (Lưu Niên) layer
  const annualStemVi = STEM_NAMES_VI[yearly.heavenlyStem] || yearly.heavenlyStem;
  const annualBranchVi = BRANCH_NAMES_VI[yearly.earthlyBranch] || yearly.earthlyBranch;
  const annualLunarYear = `${annualStemVi} ${annualBranchVi}`;

  const annualPalaceObj = astrolabe.palaces[yearly.index];
  const annualPalaceId = annualPalaceObj ? palaceIds[annualPalaceObj.name] : undefined;
  const annualPalaceName = annualPalaceObj ? PALACE_NAMES_VI[annualPalaceObj.name] : undefined;
  if (!annualPalaceId || !annualPalaceName) throw new Error("HOROSCOPE_ANNUAL_MAPPING_INVALID");
  const monthlyList = astrolabe.monthlyList(targetYear).filter(period => !period.isLeapMonth);

  // Lunar age (Tuổi âm)
  const birthYear = astrolabe.rawDates.lunarDate.lunarYear;
  const lunarAge = Math.max(1, targetYear - birthYear + 1);

  // 2. Monthly Hạn analysis
  const months: ZiweiMonthlyHanV1[] = [];
  const focusSet = new Set<string>();

  for (let i = 0; i < monthlyList.length; i++) {
    const m = monthlyList[i]!;
    const monthIndex = m.month;
    const palaceObj = astrolabe.palaces[m.index];
    const palaceId = palaceObj ? palaceIds[palaceObj.name] : "ziwei.palace.life";
    const palaceName = palaceObj ? PALACE_NAMES_VI[palaceObj.name] : "Mệnh";
    const branchVi = BRANCH_NAMES_VI[m.earthlyBranch] || m.earthlyBranch;
    const stemVi = STEM_NAMES_VI[m.heavenlyStem] || m.heavenlyStem;

    const evidenceKeys: string[] = [
      `annual.month.${monthIndex}.palace.${palaceId}`,
      `annual.month.${monthIndex}.branch.${branchIds[m.earthlyBranch] || m.earthlyBranch}`,
    ];

    if (!palaceObj || !palaceId || !palaceName) throw new Error("HOROSCOPE_MONTHLY_MAPPING_INVALID");
    const attention = computedMonthlyAttention({
      stars: [...palaceObj.majorStars, ...palaceObj.minorStars], monthlyMutagen: m.mutagen, annualMutagen: yearly.mutagen,
    });
    const natalMinorSát = palaceObj.minorStars.some(star =>
      ["driven", "tangled", "impulsive", "spark", "ideologue", "fickle"].includes(star.name));
    const monthlyStarsInPalace = m.stars?.[m.index] ?? [];

    // Auspicious stars
    const monthlyLộcStar = m.mutagen[0];
    const isMonthlyLộcInPalace = palaceObj?.majorStars.some((s) => s.name === monthlyLộcStar);
    const hasMonthlyCát = monthlyStarsInPalace.some((s) =>
      ["money(M)", "horse(M)", "assistant(M)", "aide(M)", "cheerful(M)", "月禄", "月马", "月魁", "月钺", "月喜"].includes(s.name)
    );

    let marker: ZiweiMonthMarker = "neutral";
    let primaryFocus = "công việc";
    let prepText = "Vận trình ổn định, duy trì nhịp độ công việc và cân đối sinh hoạt hàng ngày.";

    // Determine primary focus from palace
    if (palaceId === "ziwei.palace.wealth") {
      primaryFocus = "tiền bạc";
    } else if (palaceId === "ziwei.palace.career" || palaceId === "ziwei.palace.parents") {
      primaryFocus = "giấy tờ";
    } else if (palaceId === "ziwei.palace.spouse" || palaceId === "ziwei.palace.children") {
      primaryFocus = "tình cảm";
    } else if (palaceId === "ziwei.palace.health") {
      primaryFocus = "sức khoẻ";
    } else if (palaceId === "ziwei.palace.travel") {
      primaryFocus = "đi lại";
    } else {
      primaryFocus = "công việc";
    }

    if (attention.warn) {
      marker = "warn";
      focusSet.add(primaryFocus);
      evidenceKeys.push(`annual.month.${monthIndex}.marker.warn`);
      for (const reason of attention.reasons) {
        evidenceKeys.push(`annual.month.${monthIndex}.obstacle.${reason.scope}.${reason.starId}`);
      }

      if (primaryFocus === "tiền bạc") {
        prepText = "Tháng cần đặc biệt chú ý chi tiêu và bảo toàn tài chính, tránh cho vay mượn hoặc đầu tư mạo hiểm.";
      } else if (primaryFocus === "giấy tờ") {
        prepText = "Cần rà soát kỹ lưỡng các điều khoản văn bản, hợp đồng và thủ tục hành chính trước khi ký kết.";
      } else if (primaryFocus === "sức khoẻ") {
        prepText = "Nên chú ý nghỉ ngơi, giữ gìn sức khoẻ, hạn chế làm việc quá sức và khám định kỳ khi có dấu hiệu mệt mỏi.";
      } else if (primaryFocus === "tình cảm") {
        prepText = "Cần bình tĩnh trong các trao đổi gia đạo, lắng nghe và tránh nóng vội dẫn tới bất hòa không đáng có.";
      } else {
        prepText = "Công việc có áp lực phát sinh, nên ưu tiên hoàn thành việc hiện tại thay vì mở rộng kế hoạch mới.";
      }
    } else if ((isMonthlyLộcInPalace || hasMonthlyCát) && !natalMinorSát) {
      marker = "good";
      evidenceKeys.push(`annual.month.${monthIndex}.marker.good`);
      prepText = "Thời điểm thuận lợi đón nhận cơ hội mới, thích hợp để triển khai các dự định đã ấp ủ.";
    } else {
      evidenceKeys.push(`annual.month.${monthIndex}.marker.neutral`);
    }

    const isLockedMonth = !isUnlocked && marker === "warn";

    months.push({
      monthIndex,
      marker,
      isLocked: isLockedMonth,
      monthNumberDisplay: isLockedMonth ? "?" : String(monthIndex),
      label: isLockedMonth ? "Tháng hạn, mở để xem" : `Tháng ${monthIndex}`,
      palaceId,
      palaceName,
      earthlyBranch: branchVi,
      heavenlyStem: stemVi,
      primaryFocus,
      preparationText: isLockedMonth ? undefined : prepText,
      evidenceKeys,
    });
  }

  const finalWarnCount = months.filter((m) => m.marker === "warn").length;
  const favorableCount = months.filter((m) => m.marker === "good").length;
  const neutralCount = 12 - finalWarnCount - favorableCount;

  const focusAreas = Array.from(focusSet);
  const summary = `Năm nay có ${finalWarnCount} tháng cần chú ý và ${favorableCount} tháng thuận.` +
    (focusAreas.length ? ` Các tháng cần chú ý liên quan tới ${focusAreas.join(" và ")}.` : "");

  const yearlyHan: ZiweiYearlyHanV1 = {
    targetYear,
    lunarYear: annualLunarYear,
    lunarAge,
    annualPalaceId,
    annualPalaceName,
    annualBranch: annualBranchVi,
    annualStem: annualStemVi,
    hanMonthCount: finalWarnCount,
    favorableMonthCount: favorableCount,
    neutralMonthCount: neutralCount,
    focusAreas,
    summary,
    months,
    evidenceKeys: [
      `annual.year.${targetYear}.palace.${annualPalaceId}`,
      `annual.year.${targetYear}.lunar-age.${lunarAge}`,
      `annual.year.${targetYear}.han-count.${finalWarnCount}`,
    ],
  };

  // 3. Daily ("Hôm nay của bạn") layer
  const solar = Solar.fromYmd(asOfYear, asOfMonth, asOfDay);
  const lunar = solar.getLunar();
  const weekdayName = WEEKDAY_NAMES_VI[solar.getWeek()] || "Hôm nay";
  const solarDateFormatted = `${weekdayName}, ${asOfDay}/${asOfMonth}/${asOfYear}`;

  const lunarMonthStr = lunar.getMonth();
  const lunarDayStr = lunar.getDay();
  const lunarYearGanZhi = `${STEM_NAMES_VI[lunar.getYearGan()] || lunar.getYearGan()} ${BRANCH_NAMES_VI[lunar.getYearZhi()] || lunar.getYearZhi()}`;
  const lunarDateFormatted = `${lunarDayStr}/${lunarMonthStr} ${lunarYearGanZhi}`;

  const dayStem = STEM_NAMES_VI[lunar.getDayGan()] || lunar.getDayGan();
  const dayBranch = BRANCH_NAMES_VI[lunar.getDayZhi()] || lunar.getDayZhi();
  const dayStemBranch = `${dayStem} ${dayBranch}`;

  const jieQiNameRaw = lunar.getPrevJieQi().getName();
  const solarTerm = JIEQI_NAMES_VI[jieQiNameRaw] || jieQiNameRaw;

  // Which natal palace has today's earthly branch?
  const touchedPalaceObj = astrolabe.palaces.find((p) => p.earthlyBranch === hs.daily.earthlyBranch) || astrolabe.palaces[hs.daily.index];
  const touchedPalaceId = (touchedPalaceObj ? palaceIds[touchedPalaceObj.name] : undefined) || "ziwei.palace.children";
  const touchedPalaceName = (touchedPalaceObj ? PALACE_NAMES_VI[touchedPalaceObj.name] : undefined) || "Tử Tức";

  const headline = `Ngày ${dayStemBranch} chạm cung ${touchedPalaceName} của bạn.`;

  const dailyHoroscope: ZiweiDailyHoroscopeV1 = {
    solarDate: asOfDate,
    solarDateFormatted,
    lunarDateFormatted,
    dayStemBranch,
    solarTerm,
    touchedPalaceId,
    touchedPalaceName,
    headline,
    evidenceKeys: [
      `daily.date.${asOfDate}`,
      `daily.branch.${branchIds[hs.daily.earthlyBranch] || hs.daily.earthlyBranch}`,
      `daily.palace.${touchedPalaceId}`,
    ],
  };

  // Exact local iztro 2.6.0 API, shared with the established report-snapshot adapter.
  const decadal = astrolabe.decadalList().find(item => targetYear >= item.yearRange[0] && targetYear <= item.yearRange[1]);
  const decadalPalaceId = decadal ? palaceIds[decadal.palaceName] : undefined;
  return {
    version: 1,
    chartId,
    chartVersionId,
    asOfDate,
    isUnlocked,
    yearly: yearlyHan,
    daily: dailyHoroscope,
    ...(decadal && decadalPalaceId ? { decadal: { palaceId: decadalPalaceId, startAge: decadal.ageRange[0], endAge: decadal.ageRange[1], startYear: decadal.yearRange[0], endYear: decadal.yearRange[1] } } : {}),
  };
}
