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
