import type { NormalizedZiweiChartV1, ReportSourceSnapshotV1, ZiweiPalaceId, ZiweiTopicDeepDiveContentV1 } from "@lasoviet/contracts";
import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
const palaceIds: ZiweiPalaceId[] = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
];

const branches = [
  "ziwei.branch.tiger", "ziwei.branch.rabbit", "ziwei.branch.dragon", "ziwei.branch.snake",
  "ziwei.branch.horse", "ziwei.branch.goat", "ziwei.branch.monkey", "ziwei.branch.rooster",
  "ziwei.branch.dog", "ziwei.branch.pig", "ziwei.branch.rat", "ziwei.branch.ox",
] as const;

export function buildFrozenChartFixture() {
  const chart: NormalizedZiweiChartV1 = {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars: (
        id === "ziwei.palace.spouse"
          ? [
              { id: "ziwei.star.tianfu", category: "major" },
              { id: "ziwei.star.wenchang", category: "minor" },
            ]
          : id === "ziwei.palace.career"
            ? [
                { id: "ziwei.star.ziwei", category: "major" },
                { id: "ziwei.star.tianxiang", category: "major" },
              ]
            : id === "ziwei.palace.wealth"
              ? [
                  { id: "ziwei.star.wuqu", category: "major" },
                  { id: "ziwei.star.taiyin", category: "major" },
                ]
              : id === "ziwei.palace.life"
                ? [
                    { id: "ziwei.star.taiyang", category: "major" },
                    { id: "ziwei.star.tianliang", category: "major" },
                  ]
                : [{ id: "ziwei.star.wenqu", category: "minor" }]
      ).map((star) => ({
        ...star,
        brightness: "ziwei.brightness.prosperous",
      })) as NormalizedZiweiChartV1["palaces"][number]["stars"],
    })),
    transformations: [{ starId: "ziwei.star.tianfu", id: "ziwei.transformation.power" }],
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
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };

  const snapshot: ReportSourceSnapshotV1 = {
    version: 1,
    reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    chartVersionId: "chart-v1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: "c".repeat(64),
    snapshot: {
      version: 1,
      chartVersionId: "chart-v1",
      asOfDate: "2026-09-12",
      timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal: {
          state: "active",
          index: 2,
          ageRange: [24, 33],
          yearRange: [2024, 2033],
          palaceId: "ziwei.palace.fortune",
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace ?? false,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
            transformations: [],
          })),
        },
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.career",
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace ?? false,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
            transformations: [],
          })),
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
        selectedFrame: { position: "selected", vendorTimeIndex: 6, civilDateOffset: 0, frameId: "ziwei.time-frame.horse" },
        previousFrame: { position: "previous", vendorTimeIndex: 5, civilDateOffset: 0, frameId: "ziwei.time-frame.snake" },
        nextFrame: { position: "next", vendorTimeIndex: 7, civilDateOffset: 0, frameId: "ziwei.time-frame.goat" },
        stableFactKeys: ["ziwei.fact.soul-palace"],
        sensitiveFacts: [],
      },
      provenance: {
        chartVersionId: "chart-v1",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: "c".repeat(64),
      },
    },
  };

  return {chart, snapshot};
}

export function buildFactsFixture() {
  const {chart, snapshot} = buildFrozenChartFixture();
  return buildComprehensiveZiweiFactsV4(chart, snapshot);
}

export function makeValidRelationshipContent(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const pSpouseKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.spouse"))?.key ?? facts.evidenceKeys[0]!;
  const pLifeKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.life"))?.key ?? facts.evidenceKeys[1]!;
  const sTianfuKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.tianfu"))?.key ?? facts.evidenceKeys[0]!;
  const sTaiyangKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.taiyang"))?.key ?? facts.evidenceKeys[1]!;
  const sWenchangKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.wenchang"))?.key ?? facts.evidenceKeys[0]!;
  const decadalKey = facts.evidence.items.find((item) => item.dimension === "decadal")?.key ?? facts.evidenceKeys[0]!;

  return {
    topicId: "relationship_marriage",
    title: "Luận giải chuyên sâu Tình duyên & Hôn nhân",
    overview: {
      title: "Tổng quan bình diện tình cảm và duyên phối",
      narrative: `Trong cấu trúc lá số tổng thể, cung Mệnh và cung Phu Thê tạo lập trục tương tác nền tảng cho đời sống lứa đôi. Sự hiện diện của sao Thái Dương và sao Thiên Phủ mang lại xu hướng xây dựng mối quan hệ trên nền tảng tôn trọng và bình đẳng. Đương số coi trọng sự chân thành, tìm kiếm người bạn đời có cùng chí hướng phát triển và có khả năng sẻ chia sâu sắc trong mọi hoàn cảnh thực tế. Đây là nền tảng cốt lõi giúp tạo dựng đời sống hôn nhân vững vàng dài lâu. Khi đương số biết dung hòa cái tôi cá nhân, mối liên kết tình cảm sẽ càng trở nên thấu hiểu và gắn bó bền chặt hơn qua từng giai đoạn thời gian.`,
      evidenceKeys: [pSpouseKey, pLifeKey, sTaiyangKey, sTianfuKey],
    },
    palaceAnchors: [
      {
        palaceId: "ziwei.palace.spouse",
        title: "Cung Phu Thê: Khảo sát cấu trúc phối ngẫu",
        narrative: `Tại cung Phu Thê, tọa thủ của sao Thiên Phủ hội cùng sao Văn Xương tạo nên một kết cấu hài hòa và chỉn chu. Người bạn đời có thiên hướng đĩnh đạc, chu toàn, có tư duy quản lý tài chính và gia đạo mực thước. Sự hỗ trợ từ Văn Xương mang lại nét mềm mại trong ứng xử và năng lực giao tiếp tinh tế. Hai bên biết lắng nghe, tôn trọng không gian riêng và luôn đồng lòng trong các kế hoạch chung của cuộc sống gia đình dài hạn. Đây là vị trí cung mang lại sự an tâm và chở che lẫn nhau qua những thăng trầm của đời sống thường nhật.`,
        evidenceKeys: [pSpouseKey, sTianfuKey, sWenchangKey],
      },
    ],
    thematicDimensions: [
      {
        key: "emotional_needs",
        title: "Nhu cầu cảm xúc và phong cách gắn kết",
        narrative: `Bản chất của đương số khi bước vào quan hệ gắn bó là sự tín nhiệm và thẳng thắn. Ảnh hưởng từ sao Thái Dương chiếu cùng sao Thiên Phủ về trục phối ngẫu thôi thúc nhu cầu được ghi nhận và đồng hành. Trong đời sống thường nhật, đương số không đòi hỏi sự lãng mạn phô trương mà trân trọng những hành động quan tâm thực chất, sự chu đáo và minh bạch trong mọi suy nghĩ. Khi sự an tâm được thiết lập, đương số sẵn sàng cống hiến hết mình vì sự bình yên của mái ấm gia đình.`,
        evidenceKeys: [pLifeKey, sTaiyangKey, sTianfuKey],
      },
      {
        key: "relational_tensions",
        title: "Điểm nhạy cảm và cơ chế hóa giải bất đồng",
        narrative: `Điểm cần lưu tâm trong quan hệ lứa đôi là sự khác biệt về quan điểm thực tế và cái tôi cá nhân. Khi gặp áp lực công việc bên ngoài, đương số đôi khi có xu hướng tự giải quyết thay vì chia sẻ sớm, dễ tạo ra khoảng cách giao tiếp vô hình. Nhận diện rõ đặc tính này và thiết lập nguyên tắc trò chuyện cởi mở sẽ giúp loại bỏ mọi mầm mống hiểu lầm, biến thử thách thành cơ hội gắn kết sâu sắc hơn. Cung Mệnh có Thái Dương luôn hướng tới sự minh bạch.`,
        evidenceKeys: [pSpouseKey, pLifeKey, sTaiyangKey],
      },
    ],
    decadalTiming: {
      title: "Nhịp vận 10 năm hiện hành đối với hôn nhân",
      state: "active",
      index: 2,
      ageRange: [24, 33],
      yearRange: [2024, 2033],
      palaceId: "ziwei.palace.fortune",
      narrative: `Đại vận 24-33 tuổi tương ứng giai đoạn 2024-2033 tại cung Phúc Đức là thời kỳ trọng yếu cho việc kiện toàn đời sống nội tâm và các quyết định hôn nhân. Năng lượng đại vận hướng đương số đến sự chín chắn, thấu hiểu quy luật gắn kết và biết trân trọng giá trị gia đình. Mọi chuyển biến tình cảm trong chặng đường 10 năm này đều mang tính bản lề, đòi hỏi sự kiên nhẫn và cam kết trách nhiệm vững vàng từ cả hai phía.`,
      evidenceKeys: [decadalKey, pSpouseKey, sTianfuKey],
    },
    actions: [
      {
        recommendation: "Xây dựng thói quen đối thoại định kỳ hàng tuần một cách cởi mở và chân thành.",
        rationale: "Giúp giải tỏa kịp thời những áp lực vô hình và củng cố sự đồng điệu giữa hai bên.",
        avoid: "Tránh im lặng hoặc dồn nén cảm xúc tiêu cực kéo dài khi có bất đồng nảy sinh.",
        evidenceKeys: [pSpouseKey, sTianfuKey],
      },
      {
        recommendation: "Thống nhất rõ ràng các nguyên tắc quản lý tài chính và trách nhiệm gia đình.",
        rationale: "Sao Thiên Phủ chuộng sự minh bạch và có trật tự trong đời sống vật chất chung.",
        avoid: "Tránh các quyết định chi tiêu lớn bất ngờ mà chưa có sự đồng thuận từ bạn đời.",
        evidenceKeys: [pSpouseKey, sTianfuKey],
      },
      {
        recommendation: "Dành thời gian nuôi dưỡng sở thích chung và các hoạt động thư giãn cùng nhau.",
        rationale: "Tạo không gian tái tạo năng lượng tích cực cho mối quan hệ dài hạn.",
        avoid: "Tránh để guồng quay công việc lấn át toàn bộ thời gian chất lượng dành cho gia đình.",
        evidenceKeys: [pLifeKey, sTaiyangKey],
      },
    ],
  };
}

export function makeValidCareerContent(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const pCareerKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.career"))?.key ?? facts.evidenceKeys[0]!;
  const pWealthKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.wealth"))?.key ?? facts.evidenceKeys[1]!;
  const pLifeKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.palace.life"))?.key ?? facts.evidenceKeys[2]!;
  const sZiweiKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.ziwei"))?.key ?? facts.evidenceKeys[0]!;
  const sTianxiangKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.tianxiang"))?.key ?? facts.evidenceKeys[1]!;
  const sWuquKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.wuqu"))?.key ?? facts.evidenceKeys[0]!;
  const sTaiyinKey = facts.evidence.items.find((item) => item.sourceKeys.includes("ziwei.star.taiyin"))?.key ?? facts.evidenceKeys[1]!;
  const decadalKey = facts.evidence.items.find((item) => item.dimension === "decadal")?.key ?? facts.evidenceKeys[0]!;

  return {
    topicId: "career_wealth",
    title: "Luận giải chuyên sâu Công việc & Tài lộc",
    overview: {
      title: "Tổng quan bình diện sự nghiệp và năng lực tích lũy",
      narrative: `Khảo sát trục Mệnh, Quan Lộc và Tài Bạch cho thấy đương số sở hữu nền tảng nghề nghiệp có tính tổ chức và định hướng rõ ràng. Sự phối hợp giữa sao Tử Vi và sao Vũ Khúc mang lại khả năng nắm bắt cơ hội, tư duy chiến lược và ý chí tự lập cao. Trong phương diện kinh tế, đương số có xu hướng gây dựng tài chính từ thực lực chuyên môn, chú trọng tính bền vững hơn là các cuộc phiêu lưu ngắn hạn. Đây là nền móng thuận lợi để xác lập uy tín cá nhân và củng cố vị thế vững chắc trong môi trường công việc.`,
      evidenceKeys: [pCareerKey, pWealthKey, sZiweiKey, sWuquKey],
    },
    palaceAnchors: [
      {
        palaceId: "ziwei.palace.career",
        title: "Cung Quan Lộc: Khảo sát quỹ đạo chức nghiệp",
        narrative: `Tọa thủ tại cung Quan Lộc là sao Tử Vi hội tụ cùng sao Thiên Tướng tạo nên thế đứng vững chãi của người điều hành và hoạch định. Đương số thích hợp với vai trò dẫn dắt, có năng lực quản lý dự án và duy trì kỷ luật nội bộ. Khả năng bao quát vấn đề và nguyên tắc làm việc chỉn chu giúp đương số tạo được sự tin cậy từ cấp trên cũng như đồng nghiệp. Quỹ đạo nghề nghiệp có chiều hướng phát triển ổn định, thăng tiến qua từng nấc thang tích lũy kinh nghiệm thực tiễn.`,
        evidenceKeys: [pCareerKey, sZiweiKey, sTianxiangKey],
      },
      {
        palaceId: "ziwei.palace.wealth",
        title: "Cung Tài Bạch: Cơ cấu quản trị dòng tiền",
        narrative: `Cung Tài Bạch chịu sự chi phối tích cực từ sao Vũ Khúc hội cùng sao Thái Âm, biểu thị tính kỷ luật cao trong chi tiêu và phân bổ dòng tiền. Đương số hiểu rõ giá trị của đồng vốn, có khả năng tích lũy có hệ thống và hạn chế tối đa các rủi ro không cần thiết. Sự thận trọng kết hợp với tư duy tài chính sắc bén từ Vũ Khúc và Thái Âm giúp duy trì sự an toàn kinh tế cá nhân, tạo tiền đề vững chắc cho việc tái đầu tư sinh lời bền vững theo thời gian.`,
        evidenceKeys: [pWealthKey, sWuquKey, sTaiyinKey],
      },
    ],
    thematicDimensions: [
      {
        key: "vocational_drivers",
        title: "Động lực chuyên môn và môi trường tối ưu",
        narrative: `Động lực thúc đẩy sự nghiệp của đương số bắt nguồn từ mong muốn kiến tạo giá trị thực tế và được khẳng định năng lực chuyên môn. Sao Tử Vi kết hợp với sao Thiên Tướng đòi hỏi môi trường làm việc có lộ trình minh bạch, nơi đương số được trao quyền tự chủ và có không gian sáng tạo. Việc chủ động rèn luyện kỹ năng lãnh đạo sẽ mở rộng dư địa phát triển trong tương lai.`,
        evidenceKeys: [pCareerKey, sZiweiKey, sTianxiangKey],
      },
      {
        key: "wealth_mechanisms",
        title: "Chiến lược tài chính và bảo toàn nguồn vốn",
        narrative: `Phương thức tài chính hiệu quả nhất cho đương số là tích lũy song song với đầu tư có chọn lọc. Nhờ sao Vũ Khúc hội chiếu cùng sao Thái Âm, đương số nên ưu tiên các kênh tài sản có giá trị thực, kiểm soát chặt chẽ tỷ lệ đòn bẩy và duy trì quỹ dự phòng an toàn trước khi mở rộng quy mô kinh doanh.`,
        evidenceKeys: [pWealthKey, sWuquKey, sTaiyinKey],
      },
    ],
    decadalTiming: {
      title: "Nhịp vận 10 năm hiện hành đối với sự nghiệp và tài chính",
      state: "active",
      index: 2,
      ageRange: [24, 33],
      yearRange: [2024, 2033],
      palaceId: "ziwei.palace.fortune",
      narrative: `Đại vận 24-33 tuổi trong giai đoạn 2024-2033 tại cung Phúc Đức mở ra chu kỳ tích lũy nội lực then chốt cho công việc. Đây là thời đoạn đương số cần kiên định xây dựng nền tảng chuyên môn sâu, thiết lập các mối quan hệ đồng nghiệp tin cậy và chuẩn bị nguồn lực cho những bước nhảy vọt ở giai đoạn tiếp theo.`,
      evidenceKeys: [decadalKey, pCareerKey, sZiweiKey],
    },
    actions: [
      {
        recommendation: "Xây dựng kế hoạch tài chính cá nhân chi tiết theo quý và theo năm.",
        rationale: "Tối ưu hóa khả năng tích lũy của sao Vũ Khúc và bảo vệ dòng tiền ổn định.",
        avoid: "Tránh tham gia vào các hoạt động đầu cơ rủi ro cao khi chưa thẩm định kỹ lưỡng.",
        evidenceKeys: [pWealthKey, sWuquKey],
      },
      {
        recommendation: "Chủ động đề xuất và đảm nhận các dự án có tính thử thách chuyên môn cao.",
        rationale: "Khai mở trọn vẹn năng lực điều phối của sao Tử Vi và sao Thiên Tướng.",
        avoid: "Tránh thụ động chờ đợi cơ hội hoặc ngần ngại trước những trách nhiệm mới.",
        evidenceKeys: [pCareerKey, sZiweiKey],
      },
      {
        recommendation: "Mở rộng mạng lưới quan hệ chuyên ngành với các chuyên gia có uy tín.",
        rationale: "Tạo dựng nguồn hỗ trợ thông tin và cơ hội hợp tác dài hạn.",
        avoid: "Tránh làm việc đơn độc hoặc tự cô lập trong các quyết định nghề nghiệp quan trọng.",
        evidenceKeys: [pLifeKey, pCareerKey],
      },
    ],
  };
}

/** Synthetic mechanics fixture; does not certify a generated business reading. */
export function makeBusinessContentFixture(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const content = makeValidCareerContent(facts);
  content.topicId = "business_enterprise";
  content.title = "Luận giải chuyên sâu Kinh doanh và làm ăn";
  content.overview.title = "Cách tổ chức việc làm ăn và nguồn lực";
  content.overview.narrative = `Tài Bạch có Vũ Khúc cùng Thái Âm, còn Quan Lộc có Tử Vi và Thiên Tướng. Hai cung này đặt cách giữ nguồn lực cạnh cách tổ chức việc làm ăn. Khi thử một hướng kinh doanh, bạn có thể tách phần vốn cần duy trì với phần dùng để kiểm tra nhu cầu thực tế. Cách đọc này giúp nhìn lại thói quen quản lý và hợp tác, không đưa ra doanh thu hay một kết quả đầu tư được bảo đảm. Một dự định nhỏ nên có người chịu trách nhiệm, tiêu chí đánh giá và cách dừng khi điều kiện không phù hợp.`;
  content.thematicDimensions[0] = {...content.thematicDimensions[0]!, key: "enterprise_initiative", title: "Quyền tự chủ và trách nhiệm trong kinh doanh",
    narrative: `Tử Vi và Thiên Tướng tại Quan Lộc là căn cứ để đọc cách tổ chức và chịu trách nhiệm. Với một việc làm ăn độc lập, bạn có thể tự quyết phạm vi công việc nhưng vẫn cần phân vai với người cộng tác. Hãy nhìn lại việc nào bạn muốn trực tiếp kiểm soát và việc nào cần một cách kiểm tra chung. Căn cứ này gợi cách đặt câu hỏi cho một dự định, không xác nhận rằng dự định sẽ thành công.`};
  content.thematicDimensions[1] = {...content.thematicDimensions[1]!, key: "capital_discipline", title: "Giữ nguồn lực trước khi mở rộng",
    narrative: `Vũ Khúc và Thái Âm ở Tài Bạch đặt việc giữ nguồn lực cạnh cách điều hành ở Quan Lộc. Khi xem một phương án kinh doanh, bạn thử phân biệt khoản phải duy trì với khoản có thể dùng để học từ một thử nghiệm nhỏ. Ghi lại điều kiện dừng và trách nhiệm của từng bên giúp tránh mở rộng vì áp lực từ người khác. Đây là cách cân nhắc hành động dựa trên cấu trúc cung, không phải một mức lời hay khoản thu nhập được tính từ lá số.`};
  return content;
}

/** Synthetic transition mechanics, not native or manual interpretation acceptance. */
export function makeCareerTransitionContentFixture(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const content=makeValidCareerContent(facts);
  const travelKey=facts.evidence.items.find(item=>item.dimension==="natal" && item.sourceKeys.includes("ziwei.palace.travel"))?.key;
  if(!travelKey) throw new Error("Missing actual Travel evidence");
  content.topicId="career_transition";
  content.title="Luận giải chuyên sâu Đổi việc và bước ngoặt sự nghiệp";
  content.overview.title="Cân nhắc thay đổi vai trò và môi trường làm việc";
  content.overview.narrative=`Tử Vi và Thiên Tướng tại Quan Lộc là căn cứ để nhìn cách tổ chức công việc và trách nhiệm trong một vai trò. Khi đặt cạnh cung Thiên Di, câu hỏi đổi việc cần xét cả phần việc mình muốn giữ và cách thích nghi với môi trường bên ngoài. Bạn có thể ghi lại điều kiện cần cho một vị trí mới, thử trao đổi với người trong nghề và so sánh trách nhiệm thực tế trước khi quyết định. Cách đọc này giúp chuẩn bị cho thay đổi, không xác nhận một lời mời việc hay ngày chuyển việc sẽ xảy ra. Việc ở lại, thay đổi vai trò trong cùng tổ chức hay chuyển môi trường đều cần đối chiếu với hoàn cảnh hiện tại.`;
  content.overview.evidenceKeys=[...content.overview.evidenceKeys,travelKey];
  content.palaceAnchors[1]={palaceId:"ziwei.palace.travel",title:"Cung Thiên Di: thích nghi với môi trường bên ngoài",
    narrative:`Thiên Di không có chính tinh và có Văn Khúc trong bộ dữ kiện đang đọc, còn Quan Lộc có Tử Vi cùng Thiên Tướng. Khi cân nhắc một môi trường mới, hãy chuẩn bị cách trình bày năng lực, hỏi rõ trách nhiệm và quan sát cách đội ngũ phối hợp. Bạn có thể thử một cuộc trao đổi nghề nghiệp hoặc một nhiệm vụ nhỏ để biết điều gì phù hợp với mình. Căn cứ cung này gợi việc kiểm tra môi trường bên ngoài, không bảo đảm rằng thay đổi công việc sẽ có kết quả tốt hơn. Quyết định cần đi cùng nguồn lực và trách nhiệm thực tế.`,evidenceKeys:[travelKey]};
  content.thematicDimensions[0]={...content.thematicDimensions[0]!,key:"role_transition",title:"Giữ năng lực cốt lõi khi đổi vai trò"};
  content.thematicDimensions[1]={...content.thematicDimensions[1]!,key:"transition_resources",title:"Chuẩn bị nguồn lực cho thay đổi"};
  return content;
}

/** Synthetic family mechanics with literal scoped facts, not interpretation acceptance. */
export function makeFamilyChildrenContentFixture(facts: ReturnType<typeof buildFactsFixture>): ZiweiTopicDeepDiveContentV1 {
  const keyFor = (palace: string) => {
    const key = facts.evidence.items.find(item => item.dimension === "natal" && item.sourceKeys.includes(palace))?.key;
    if (!key) throw new Error("Missing actual family palace evidence"); return key;
  };
  const children = keyFor("ziwei.palace.children"), property = keyFor("ziwei.palace.property"), fortune = keyFor("ziwei.palace.fortune");
  const decadal = facts.evidence.items.find(item => item.dimension === "decadal")?.key;
  const wenqu = facts.evidence.items.find(item => item.dimension === "natal" && item.sourceKeys.includes("ziwei.star.wenqu"))?.key;
  if (!decadal || !wenqu) throw new Error("Missing actual family star/decadal evidence");
  const childText = "cung Tử Tức không có chính tinh và có Văn Khúc trong bộ dữ kiện này. Khi suy nghĩ về trách nhiệm chăm sóc, bạn có thể bắt đầu bằng cách trao đổi rõ điều mình có thể hỗ trợ và điều cần thêm thời gian chuẩn bị. Hãy lắng nghe nhu cầu của người thân, tách mong đợi của mình khỏi điều người khác muốn và thống nhất cách hỏi lại khi chưa hiểu. Cung này là một điểm nhìn để cân nhắc sự phối hợp, không xác định hoàn cảnh gia đình thực tế của bạn.";
  const propertyText = "cung Điền Trạch không có chính tinh và có Văn Khúc trong phần dữ kiện được cung cấp. Không gian sống có thể được xem như nơi cần sự rõ ràng về cách dùng đồ chung, giữ riêng tư và chia sẻ việc thường ngày. Nếu bạn đang cân nhắc ở cùng người thân, hãy ghi ra các điều kiện về thời gian, trách nhiệm và chỗ nghỉ ngơi trước khi bàn phương án. Những câu hỏi này giúp việc trao đổi có điểm tựa thực tế; cung Điền Trạch không cung cấp một lịch chuyển nhà hay dự báo giá nhà.";
  const shared = "cung Phúc Đức có Văn Khúc trong dữ kiện hiện có, còn cung Tử Tức và cung Điền Trạch gợi hai điểm nhìn khác nhau về việc chăm sóc và không gian sống. Bạn có thể chọn một việc chung cần làm rõ, hỏi người liên quan xem điều gì đang thuận và điều gì cần điều chỉnh. Sau đó ghi lại cách phân chia trách nhiệm phù hợp với nguồn lực thực tế. Đây là đề nghị để trao đổi khi tình huống phù hợp, không khẳng định rằng gia đình bạn đã trải qua một sự kiện cụ thể.";
  return { topicId: "family_children", title: "Luận giải chuyên sâu Gia đạo và con cái",
    overview: {title: "Chăm sóc và không gian sống chung", narrative: `${childText} ${propertyText}`, evidenceKeys: [children, property, wenqu]},
    palaceAnchors: [
      {palaceId: "ziwei.palace.children", title: "Cung Tử Tức: phối hợp trách nhiệm chăm sóc", narrative: childText, evidenceKeys: [children]},
      {palaceId: "ziwei.palace.property", title: "Cung Điền Trạch: không gian và việc chung", narrative: propertyText, evidenceKeys: [property]},
    ],
    thematicDimensions: [
      {key: "caregiving_communication", title: "Trao đổi về cách hỗ trợ", narrative: shared, evidenceKeys: [children, property, fortune]},
      {key: "household_boundaries", title: "Thống nhất ranh giới trong không gian chung", narrative: `${propertyText} ${shared}`, evidenceKeys: [children, property, fortune]},
    ],
    decadalTiming: {title: "Chặng hiện hành và cách chuẩn bị", state: "active", index: 2, ageRange: [24, 33], yearRange: [2024, 2033],
      palaceId: "ziwei.palace.fortune", narrative: `Đại vận 24–33 tuổi, từ năm 2024 đến năm 2033, đang ở cung Phúc Đức trong bộ dữ kiện. Khoảng thời gian này là mốc của chặng được tính, không phải lịch của một sự kiện gia đình. ${shared}`, evidenceKeys: [decadal, fortune, children, property]},
    actions: [
      {recommendation: "Chọn một việc chăm sóc cần trao đổi và hỏi rõ người liên quan đang cần hỗ trợ thế nào.", rationale: "Đặt câu hỏi cụ thể giúp tách mong đợi cá nhân khỏi trách nhiệm có thể thực hiện.", avoid: "Tránh tự xác định nhu cầu của người khác khi chưa hỏi lại.", evidenceKeys: [children]},
      {recommendation: "Ghi lại cách dùng không gian và đồ chung trước khi thống nhất một phương án ở cùng.", rationale: "cung Điền Trạch là điểm nhìn về không gian sống; điều kiện thực tế cần được kiểm tra riêng.", avoid: "Tránh nhận trách nhiệm vượt thời gian hoặc nguồn lực mình có.", evidenceKeys: [property]},
      {recommendation: "Dành một buổi trao đổi ngắn để hỏi điều nào trong việc chung cần điều chỉnh.", rationale: "Thỏa thuận có thể được cập nhật theo nhu cầu thực tế, thay vì suy đoán hoàn cảnh của nhau.", avoid: "Tránh dùng một nhận định từ lá số thay cho cuộc trao đổi trực tiếp.", evidenceKeys: [fortune]},
    ] };
}

/** Literal synthetic learning/housing mechanics; not semantic product acceptance. */
export function makeStudyHousingContentFixture(facts: ReturnType<typeof buildFactsFixture>, topicId: "education_career" | "property_home"): ZiweiTopicDeepDiveContentV1 {
  const education = topicId === "education_career";
  const keyFor = (source: string) => {
    const key = facts.evidence.items.find(item => item.dimension === "natal" && item.sourceKeys.includes(source))?.key;
    if (!key) throw new Error("Missing actual study/housing evidence"); return key;
  };
  const primary = education ? ["ziwei.palace.career", "ziwei.palace.parents"] as const : ["ziwei.palace.property"] as const;
  const supporting = education ? "ziwei.palace.fortune" : "ziwei.palace.wealth";
  const decadal = facts.evidence.items.find(item => item.dimension === "decadal")?.key;
  if (!decadal) throw new Error("Missing actual decadal evidence");
  const learning = "cung Quan Lộc có Tử Vi và Thiên Tướng trong dữ kiện hiện có. Khi chọn một điều muốn học thêm, bạn có thể bắt đầu từ nhiệm vụ thực tế mình muốn làm tốt hơn, thử một bài tập nhỏ rồi hỏi người có kinh nghiệm điều cần chỉnh. Cách này giúp tách điều mình thích khỏi yêu cầu của công việc đang cân nhắc. Hãy ghi lại phản hồi và điều kiện thời gian trước khi chọn bước tiếp theo; lá số không xác định một kết quả thi hay cơ hội tuyển dụng cụ thể.";
  const mentoring = "cung Phụ Mẫu không có chính tinh và có Văn Khúc trong bộ dữ kiện này. Khi cần lời khuyên về học tập, bạn có thể hỏi rõ người hướng dẫn dựa trên kinh nghiệm nào và đề nghị một ví dụ để tự thử. Nếu ý kiến khác nhau, hãy so sánh theo mục tiêu và nguồn lực thực tế, thay vì chọn chỉ vì vị trí của người nói. Những câu hỏi này phù hợp nhiều hoàn cảnh học tập khác nhau; dữ kiện không cung cấp một tiểu sử học hành của riêng bạn.";
  const housing = "cung Điền Trạch không có chính tinh và có Văn Khúc trong phần dữ kiện được cung cấp. Khi cân nhắc một không gian sống, bạn có thể ghi lại nhu cầu về nghỉ ngơi, riêng tư và việc chung rồi kiểm tra điều kiện thực tế trước khi thống nhất phương án. Hãy hỏi người liên quan điều gì cần làm rõ và tách mong muốn cá nhân khỏi trách nhiệm có thể đảm nhận. Điểm nhìn này không xác định tình trạng sở hữu hay một lịch giao dịch bất động sản.";
  const household = "cung Tài Bạch có Vũ Khúc và Thái Âm trong dữ kiện hiện có. Trước một thay đổi nơi ở, bạn có thể tự kiểm tra nguồn lực thực tế, điều kiện sử dụng và trách nhiệm của người cùng tham gia. Sau đó ghi lại các câu hỏi còn thiếu để kiểm tra độc lập, thay vì lấy một nhận định từ lá số thay cho việc xem hồ sơ và trao đổi trực tiếp. Những điều cần kiểm tra phụ thuộc hoàn cảnh thực tế; cung Điền Trạch không cung cấp giá hay quy mô của một căn nhà.";
  const narratives = education ? [learning, mentoring] : [housing];
  const shared = education ? `${learning} ${mentoring}` : `${housing} ${household}`;
  const name = education ? "Học hành và con đường nghề" : "Nhà đất và an cư";
  const starKeys = education ? [keyFor("ziwei.star.ziwei"), keyFor("ziwei.star.tianxiang"), keyFor("ziwei.star.wenqu")] : [keyFor("ziwei.star.wenqu"), keyFor("ziwei.star.wuqu"), keyFor("ziwei.star.taiyin")];
  const keys = [...primary.map(keyFor), keyFor(supporting), ...starKeys];
  return {topicId, title: `Luận giải chuyên sâu ${name}`,
    overview: {title: education ? "Bước học nhỏ và sự hướng dẫn" : "Điều kiện sống và nguồn lực thực tế", narrative: shared, evidenceKeys: keys},
    palaceAnchors: primary.map((palaceId, i) => ({palaceId, title: education ? (i === 0 ? "Cung Quan Lộc: chọn bước học" : "Cung Phụ Mẫu: hỏi cách hướng dẫn") : "Cung Điền Trạch: kiểm tra điều kiện sống", narrative: narratives[i]!, evidenceKeys: [keyFor(palaceId)]})),
    thematicDimensions: [
      {key: education ? "learning_experiments" : "housing_conditions", title: "Kiểm tra điều kiện trước khi chọn", narrative: shared, evidenceKeys: keys},
      {key: education ? "mentoring_questions" : "shared_responsibilities", title: "Hỏi rõ trách nhiệm và bước tiếp theo", narrative: shared, evidenceKeys: keys},
    ],
    decadalTiming: {title: "Chặng hiện hành và cách chuẩn bị", state: "active", index: 2, ageRange: [24, 33], yearRange: [2024, 2033], palaceId: "ziwei.palace.fortune",
      narrative: `Đại vận 24–33 tuổi, từ năm 2024 đến năm 2033, đang ở cung Phúc Đức trong bộ dữ kiện. Đây là mốc chặng được tính, không phải lịch của một kết quả học tập hay giao dịch nhà đất. ${shared}`, evidenceKeys: [decadal, ...keys]},
    actions: [
      {recommendation: education ? "Chọn một kỹ năng cần thử, làm bài tập nhỏ và ghi lại điều muốn hỏi người hướng dẫn." : "Ghi lại các điều kiện về không gian sống và kiểm tra thực tế trước khi chọn phương án.", rationale: "Điều kiện cụ thể giúp tách mong muốn cá nhân khỏi những việc cần xác minh độc lập.", avoid: "Tránh dùng một nhận định từ lá số thay cho kiểm tra thực tế.", evidenceKeys: [keyFor(primary[0])]},
      {recommendation: "Hỏi người liên quan về kinh nghiệm, trách nhiệm và điều kiện cần làm rõ trước bước tiếp theo.", rationale: "Trao đổi có câu hỏi cụ thể giúp kiểm tra thông tin còn thiếu và điều chỉnh theo nguồn lực hiện có.", avoid: "Tránh tự giả định hoàn cảnh hoặc kỳ vọng của người khác.", evidenceKeys: keys},
      {recommendation: "Ghi lại các câu hỏi còn thiếu rồi kiểm tra độc lập trước khi nhận một trách nhiệm mới.", rationale: "Phương án cần phù hợp điều kiện thực tế; các dữ kiện lá số chỉ là điểm nhìn để cân nhắc.", avoid: "Tránh nhận trách nhiệm vượt thời gian và nguồn lực mình có.", evidenceKeys: keys},
    ]};
}
