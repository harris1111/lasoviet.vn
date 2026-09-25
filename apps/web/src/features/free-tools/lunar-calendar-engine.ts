import { Solar, Lunar } from "lunar-typescript";

export type LunarDayInfo = {
  dayOfMonth: number; // 1-31
  solarDateString: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Chủ nhật, 1 = T2, ..., 6 = T7
  dayOfWeekName: string; // Thứ Hai, ...
  lunarDay: number; // 1-30
  lunarMonth: number; // 1-12
  isLeapMonth: boolean;
  lunarYearName: string; // Bính Ngọ
  lunarMonthName: string; // Đinh Dậu
  lunarDayName: string; // Canh Tý
  isHoangDao: boolean; // Hoàng Đạo vs Hắc Đạo
  starName: string; // Tư Mệnh, Thanh Long, v.v.
  solarTerm: string; // Bạch Lộ, Thu Phân, v.v.
  goodHours: string[]; // ['Tý', 'Sửu', ...]
};

const DAY_OF_WEEK_NAMES_VI = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

const DAY_OF_WEEK_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const STEM_NAMES_VI: Record<string, string> = {
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

const STAR_NAMES_VI: Record<string, string> = {
  青龙: "Thanh Long",
  明堂: "Minh Đường",
  天刑: "Thiên Hình",
  朱雀: "Chu Tước",
  金匮: "Kim Quỹ",
  天德: "Thiên Đức",
  白虎: "Bạch Hổ",
  玉堂: "Ngọc Đường",
  天牢: "Thiên Lao",
  玄武: "Huyền Vũ",
  司命: "Tư Mệnh",
  勾陈: "Câu Trận",
};

const JIE_QI_VI: Record<string, string> = {
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

export function translateGanZhi(cnGanZhi: string): string {
  if (!cnGanZhi || cnGanZhi.length < 2) return cnGanZhi;
  const c0 = cnGanZhi.charAt(0);
  const c1 = cnGanZhi.charAt(1);
  const stem = STEM_NAMES_VI[c0] ?? c0;
  const branch = BRANCH_NAMES_VI[c1] ?? c1;
  return `${stem} ${branch}`;
}

export function translateStar(cnStar: string): string {
  return STAR_NAMES_VI[cnStar] || cnStar;
}

export function translateJieQi(cnJieQi: string): string {
  return JIE_QI_VI[cnJieQi] || cnJieQi;
}

export function getMonthLunarDays(year: number, month: number, locale: "vi" | "en" = "vi"): {
  year: number;
  month: number;
  lunarYearName: string;
  lunarMonthSpan: string;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  days: LunarDayInfo[];
} {
  // Days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstSolar = Solar.fromYmd(year, month, 1);
  const firstDayOfWeek = firstSolar.getWeek(); // 0 is Sunday

  const days: LunarDayInfo[] = [];
  let lunarYearName = "";
  const lunarMonthsSeen = new Set<string>();

  for (let d = 1; d <= daysInMonth; d++) {
    const solar = Solar.fromYmd(year, month, d);
    const lunar = solar.getLunar();

    const dow = solar.getWeek();
    const dayOfWeekName =
      (locale === "en" ? DAY_OF_WEEK_NAMES_EN[dow] : DAY_OF_WEEK_NAMES_VI[dow]) ?? "";

    if (!lunarYearName) {
      lunarYearName = translateGanZhi(lunar.getYearInGanZhi());
    }

    const rawMonth = lunar.getMonth();
    const isLeapMonth = rawMonth < 0;
    const lunarMonth = Math.abs(rawMonth);
    const mName = translateGanZhi(lunar.getMonthInGanZhi());
    lunarMonthsSeen.add(`tháng ${lunarMonth} ${mName}`);

    const isHoangDao = lunar.getDayTianShenType() === "黄道";
    const starName = translateStar(lunar.getDayTianShen());
    const rawJq = lunar.getJieQi();
    const solarTerm = rawJq ? translateJieQi(rawJq) : "";

    const goodHours = lunar
      .getTimes()
      .filter((t) => t.getTianShenType() === "黄道")
      .map((t) => BRANCH_NAMES_VI[t.getZhi()] || t.getZhi());

    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");

    days.push({
      dayOfMonth: d,
      solarDateString: `${year}-${mm}-${dd}`,
      dayOfWeek: dow,
      dayOfWeekName,
      lunarDay: lunar.getDay(),
      lunarMonth,
      isLeapMonth,
      lunarYearName,
      lunarMonthName: mName,
      lunarDayName: translateGanZhi(lunar.getDayInGanZhi()),
      isHoangDao,
      starName,
      solarTerm,
      goodHours,
    });
  }

  const lunarMonthSpan = Array.from(lunarMonthsSeen).join(" đến ");

  return {
    year,
    month,
    lunarYearName,
    lunarMonthSpan,
    firstDayOfWeek,
    days,
  };
}

export type GoodDayActivity =
  | "wedding" // Cưới hỏi
  | "opening" // Khai trương
  | "travel" // Xuất hành
  | "groundbreaking" // Động thổ
  | "signing" // Ký kết
  | "moving"; // Chuyển nhà

export type GoodDayItem = {
  dayOfMonth: number;
  solarDateString: string;
  dayOfWeekName: string;
  lunarDateFormatted: string; // 12/8 Bính Ngọ
  dayCanChi: string;
  starName: string;
  isHoangDao: boolean;
  solarTerm: string;
  reasons: string[];
  goodHours: string[];
};

export const GOOD_DAY_ACTIVITIES: {
  id: GoodDayActivity;
  nameVi: string;
  nameEn: string;
  descVi: string;
}[] = [
  {
    id: "wedding",
    nameVi: "Cưới hỏi",
    nameEn: "Wedding",
    descVi: "Chọn ngày hoàng đạo, có sao tốt cho việc hôn nhân gắn kết",
  },
  {
    id: "opening",
    nameVi: "Khai trương",
    nameEn: "Grand Opening",
    descVi: "Chọn ngày có khí vượng cho khởi sự buôn bán, kinh doanh",
  },
  {
    id: "travel",
    nameVi: "Xuất hành",
    nameEn: "Travel / Departure",
    descVi: "Chọn ngày bình an, thuận đường đi lại và công việc",
  },
  {
    id: "groundbreaking",
    nameVi: "Động thổ",
    nameEn: "Groundbreaking",
    descVi: "Chọn ngày hoàng đạo, tránh ngày xung sát để khởi công",
  },
  {
    id: "signing",
    nameVi: "Ký kết",
    nameEn: "Contract Signing",
    descVi: "Chọn ngày thuận lợi cho giao dịch, hợp tác lâu dài",
  },
  {
    id: "moving",
    nameVi: "Chuyển nhà",
    nameEn: "House Moving",
    descVi: "Chọn ngày cát lợi cho nhập trạch và an cư",
  },
];

export function getGoodDaysForActivity(
  year: number,
  month: number,
  activity: GoodDayActivity,
  locale: "vi" | "en" = "vi",
): GoodDayItem[] {
  const { days } = getMonthLunarDays(year, month, locale);

  const results: GoodDayItem[] = [];

  for (const d of days) {
    const reasons: string[] = [];

    // 1. Ngày hoàng đạo là điều kiện cốt lõi cho ngày tốt
    if (d.isHoangDao) {
      reasons.push(`Ngày hoàng đạo (Sao ${d.starName})`);
    }

    // 2. Xét theo tính chất từng loại việc
    switch (activity) {
      case "wedding":
        if (["Thanh Long", "Kim Quỹ", "Ngọc Đường", "Thiên Đức"].includes(d.starName)) {
          reasons.push("Khí cát lành cho hỷ sự, gắn kết");
        }
        break;
      case "opening":
      case "signing":
        if (["Minh Đường", "Tư Mệnh", "Kim Quỹ", "Thanh Long"].includes(d.starName)) {
          reasons.push("Thuận cho khởi sự, giao dịch tài lộc");
        }
        break;
      case "travel":
        if (["Thanh Long", "Tư Mệnh", "Ngọc Đường"].includes(d.starName)) {
          reasons.push("Đường đi hanh thông, xuất hành bình an");
        }
        break;
      case "groundbreaking":
      case "moving":
        if (["Thiên Đức", "Ngọc Đường", "Minh Đường"].includes(d.starName)) {
          reasons.push("Đất đai yên tĩnh, khí tốt cho gia trạch");
        }
        break;
    }

    if (d.solarTerm) {
      reasons.push(`Tiết khí ${d.solarTerm}`);
    }

    // Only include if day is Hoang Dao and has rationale
    if (d.isHoangDao && reasons.length > 0) {
      results.push({
        dayOfMonth: d.dayOfMonth,
        solarDateString: d.solarDateString,
        dayOfWeekName: d.dayOfWeekName,
        lunarDateFormatted: `${d.lunarDay}/${d.lunarMonth} ${d.lunarYearName}`,
        dayCanChi: d.lunarDayName,
        starName: d.starName,
        isHoangDao: d.isHoangDao,
        solarTerm: d.solarTerm,
        reasons,
        goodHours: d.goodHours,
      });
    }
  }

  return results;
}
