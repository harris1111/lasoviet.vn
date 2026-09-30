import { describe, expect, it } from "vitest";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import { buildVoiceBlockV4_2 } from "./comprehensive-report-voice-v4-2.js";

const config = resolveZiweiReportQualityConfig(
  "ziwei.comprehensive.report.v4.2-sectioned-beginner",
  "ziwei.comprehensive.quality.v2.4-beginner",
);

if (config.version !== "ziwei.comprehensive.quality.v2.4-beginner") throw new Error("Wrong version");
const beginnerConfig = config;

describe("buildVoiceBlockV4_2", () => {
  const block = buildVoiceBlockV4_2(config as never);

  it("states the voice, the no-sub-heading rule and translate-on-arrival", () => {
    expect(block).toContain("giọng tâm tình của người có nghề");
    expect(block).toContain("Không đặt tiêu đề nhỏ");
    expect(block).toContain("giải nghĩa ngay");
  });

  it("lists every banned phrase and opener from the config, so prompt and gate never drift", () => {
    for (const phrase of [...beginnerConfig.bannedPhrases, ...beginnerConfig.bannedOpeners]) expect(block).toContain(phrase);
  });

  it("carries the overview arc without printing beat names as headings", () => {
    expect(block).toContain("năm đoạn");
    expect(block).toContain("không có tiêu đề");
  });

  it("includes one good and one bad example from the spec", () => {
    expect(block).toContain("Ngôi lo kho là Thiên Phủ");
    expect(block).toContain("củng cố xu hướng hành động chặt chẽ");
  });

  it("does not contradict the old anchor rule", () => {
    expect(block).not.toContain("ít nhất hai sao thực có trong cung");
  });
});
