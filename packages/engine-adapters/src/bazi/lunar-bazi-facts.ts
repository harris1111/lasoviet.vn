import { createHash } from "node:crypto";
import { Solar, type EightChar } from "lunar-typescript";
import { BAZI_BRANCH_IDS, BAZI_STEM_IDS, BaziFactsInputV1Schema, BaziFactsV1Schema,
  type BaziFactsInputV1, type BaziFactsV1 } from "@lasoviet/contracts";
const GAN = "甲乙丙丁戊己庚辛壬癸", ZHI = "子丑寅卯辰巳午未申酉戌亥";
function stem(name: string) { const id = name.length === 1 ? BAZI_STEM_IDS[GAN.indexOf(name)] : undefined; if (!id) throw new Error("BAZI_VENDOR_STEM_UNMAPPED"); return id; }
function branch(name: string) { const id = name.length === 1 ? BAZI_BRANCH_IDS[ZHI.indexOf(name)] : undefined; if (!id) throw new Error("BAZI_VENDOR_BRANCH_UNMAPPED"); return id; }
type Pillar = Exclude<BaziFactsV1["pillars"]["hour"], null>;
function read(eight: EightChar, kind: "year" | "month" | "day" | "hour"): Pillar {
  const raw = kind === "year" ? [eight.getYearGan(), eight.getYearZhi(), eight.getYearHideGan()] as const
    : kind === "month" ? [eight.getMonthGan(), eight.getMonthZhi(), eight.getMonthHideGan()] as const
    : kind === "day" ? [eight.getDayGan(), eight.getDayZhi(), eight.getDayHideGan()] as const
    : [eight.getTimeGan(), eight.getTimeZhi(), eight.getTimeHideGan()] as const;
  return { stemId: stem(raw[0]), branchId: branch(raw[1]), hiddenStemIds: raw[2].map(stem) };
}
function charts(input: BaziFactsInputV1, h: number, m: number, sec = 0) {
  const [y, month, day] = input.localSolarDate.split("-").map(Number) as [number, number, number];
  const local = Solar.fromYmdHms(y, month, day, h, m, sec).getLunar().getEightChar(); local.setSect(2);
  // Installed solar-term astronomy adds 1/3 day (UTC+8). Convert only year/month
  // comparisons to that clock; day/hour keep the normalized local civil clock.
  const at = new Date(Date.UTC(y, month-1, day, h, m + 480 - input.offsetMinutes, sec));
  const terms = Solar.fromYmdHms(at.getUTCFullYear(), at.getUTCMonth()+1, at.getUTCDate(), at.getUTCHours(), at.getUTCMinutes(), at.getUTCSeconds()).getLunar().getEightChar(); terms.setSect(2);
  return { year: read(terms,"year"), month: read(terms,"month"), day: read(local,"day"), hour: read(local,"hour") };
}
/** Private pure factual projection; no arbitrary missing hour or personality/compatibility claim. */
export function calculateBaziFacts(input: BaziFactsInputV1): BaziFactsV1 {
  const checked = BaziFactsInputV1Schema.safeParse(input);
  if (!checked.success) throw new Error("BAZI_INPUT_INVALID");
  const value = checked.data;
  const candidates = value.localTime === null ? [charts(value,0,0), charts(value,23,59,59)]
    : [charts(value,...value.localTime.split(":").map(Number) as [number, number])];
  const unique = (kind: "year" | "month" | "day") => [...new Map(candidates.map(c => [JSON.stringify(c[kind]), c[kind]])).values()];
  const pillars = { year: unique("year"), month: unique("month"), day: unique("day"), hour: value.localTime === null ? null : candidates[0]!.hour };
  const limitations: BaziFactsV1["limitations"] = ["BAZI_NO_TRUE_SOLAR_TIME_CORRECTION"];
  if (value.localTime === null) limitations.push("BAZI_HOUR_UNKNOWN");
  if (pillars.year.length > 1 || pillars.month.length > 1) limitations.push("BAZI_SOLAR_TERM_TIME_UNCERTAIN");
  const evidence: BaziFactsV1["evidence"] = [];
  for (const kind of ["year","month","day","hour"] as const) {
    const values = kind === "hour" ? (pillars.hour ? [pillars.hour] : []) : pillars[kind];
    values.forEach((p, variant) => evidence.push({ key: `bazi.${kind}.${variant}.${p.stemId}.${p.branchId}`, pillar: kind, variant, stemId: p.stemId, branchId: p.branchId }));
  }
  return BaziFactsV1Schema.parse({ version:1, systemId:"bazi", engineVersion:"lunar-typescript1.8.6", ruleVersion:"bazi.vendor-civil-midnight.v1",
    inputHash: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
    timing: { solarTermsOffsetMinutes:480, localOffsetMinutes:value.offsetMinutes, yearBoundary:"li-chun", monthBoundary:"solar-terms", dayBoundary:"local-midnight", trueSolarCorrection:false }, pillars, limitations, evidence });
}
