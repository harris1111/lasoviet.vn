import { describe, expect, it } from "vitest";
import { hasProhibitedReadingAdvice, hasProhibitedReadingLifespan } from "./reading-content-line.js";
import { isTopicReportTuple, topicReportVersions, REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1 } from "./topic-report-config.js";
import { isPeriodReportTuple, periodReportVersions } from "./period-report-config.js";
import { PERIOD_READING_QUALITY_VERSION_V1 } from "./period-reading-writer.js";

describe("FD089 advice boundary and FD120 version compatibility", () => {
  it.each(["Nên mua bùa để giải hạn.", "Hãy cúng giải hạn.", "Dùng vật phẩm phong thủy để cải vận.", "Số xổ số của bạn là 12.", "Không nên mua bùa nhưng hãy cúng giải hạn.", "Không chỉ mua bùa mà còn cúng giải hạn.", "Giải hạn bằng cách mua lễ dâng sao.", "Hóa giải vận hạn bằng lễ dâng sao.", "Hãy mua vòng phong thủy để cải vận.", "Hãy hóa giải vận hạn.", "Không nên lo lắng, hãy mua bùa chú."])("rejects recommendations/sales: %s", text => {
    expect(hasProhibitedReadingAdvice(text)).toBe(true);
  });
  it.each(["Hóa giải bất đồng bằng trao đổi rõ ràng.", "Mua sổ để ghi kế hoạch.", "Không nên mua bùa để giải hạn.", "Đừng đánh số đề.", "Không cần cúng giải hạn."])("allows ordinary activity and explicit refusals: %s", text => {
    expect(hasProhibitedReadingAdvice(text)).toBe(false);
  });
  it("versions future quality while keeping frozen v1 source identities usable", () => {
    const topic = topicReportVersions(), period = periodReportVersions();
    expect(topic.qualityVersion).toBe("ziwei.topic-deep-dive.quality.v5");
    expect(period.qualityVersion).toBe("ziwei.period-reading.quality.v4");
    expect(REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1).toBe("ziwei.topic-deep-dive.quality.v1");
    expect(PERIOD_READING_QUALITY_VERSION_V1).toBe("ziwei.period-reading.quality.v1");
    expect(isTopicReportTuple({ ...topic, sku: "ZIWEI-RELATIONSHIP-P0", locale: "vi", knowledgeVersionId: topic.knowledgeVersion })).toBe(true);
    expect(isPeriodReportTuple({ ...period, sku: "ZIWEI-MONTHLY-P0", locale: "vi", knowledgeVersionId: period.knowledgeVersion })).toBe(true);
    expect(topic.promptVersion).toBe("ziwei.topic-deep-dive.prompt.v1");
    expect(period.promptVersion).toBe("ziwei.period-reading.prompt.v1");
  });
  it.each(["Ngôi nhà trở nên ấm cúng.", "Bạn nên giữ không gian ấm cúng.", "Cần sắp xếp nhà cửa để trở nên ấm cúng."])("allows actual cozy-house wording: %s", text => {
    expect(hasProhibitedReadingAdvice(text)).toBe(false);
    expect(hasProhibitedReadingAdvice(text.normalize("NFD"))).toBe(false);
  });
  it.each([
    "Ngôi nhà trở nên ấm cúng, hãy cúng giải hạn.",
    "Bạn nên giữ nhà ấm cúng và mua bùa chú.",
    "Cần sắp xếp nhà ấm cúng; hãy thực hiện nghi lễ.",
  ])("keeps actual rituals hard after cozy language: %s", text => {
    expect(hasProhibitedReadingAdvice(text)).toBe(true);
  });
  it("rejects lifespan glosses without banning distinct canonical star names", () => {
    expect(hasProhibitedReadingLifespan("Thiên Lương tượng trưng cho sự chở che, trường thọ và sự dẫn dắt đạo đức.")).toBe(true);
    expect(hasProhibitedReadingLifespan("TRƯỜNG THỌ".normalize("NFD"))).toBe(true);
    expect(hasProhibitedReadingLifespan("Thiên Thọ và Trường Sinh là tên sao trong dữ kiện.")).toBe(false);
    expect(hasProhibitedReadingLifespan("Không luận trường thọ.")).toBe(false);
    expect(hasProhibitedReadingLifespan("Không nên luận trường thọ.")).toBe(false);
    expect(hasProhibitedReadingLifespan("Không luận trường thọ. Thiên Lương biểu thị trường thọ.")).toBe(true);
    expect(hasProhibitedReadingLifespan("Không phải không luận trường thọ.")).toBe(true);
  });
});
