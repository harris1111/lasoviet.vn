import { describe, expect, it } from "vitest";
import { hasProhibitedReadingAdvice } from "./reading-content-line.js";
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
    expect(topic.qualityVersion).toBe("ziwei.topic-deep-dive.quality.v4");
    expect(period.qualityVersion).toBe("ziwei.period-reading.quality.v3");
    expect(REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1).toBe("ziwei.topic-deep-dive.quality.v1");
    expect(PERIOD_READING_QUALITY_VERSION_V1).toBe("ziwei.period-reading.quality.v1");
    expect(isTopicReportTuple({ ...topic, sku: "ZIWEI-RELATIONSHIP-P0", locale: "vi", knowledgeVersionId: topic.knowledgeVersion })).toBe(true);
    expect(isPeriodReportTuple({ ...period, sku: "ZIWEI-MONTHLY-P0", locale: "vi", knowledgeVersionId: period.knowledgeVersion })).toBe(true);
    expect(topic.promptVersion).toBe("ziwei.topic-deep-dive.prompt.v1");
    expect(period.promptVersion).toBe("ziwei.period-reading.prompt.v1");
  });
});
