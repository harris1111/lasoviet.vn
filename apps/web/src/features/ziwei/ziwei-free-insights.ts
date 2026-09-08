import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import { getPalaceRelations } from "./ziwei-chart-relations";

export type FreeInsightItem = {
  id: "life-palace" | "body-palace" | "transformations";
  evidenceId: string;
  numeral: string;
  title: string;
  tagline: string;
  description: string;
  starsSummary: string;
  locationSummary: string;
};

export type FreeInsightsResult = {
  items: FreeInsightItem[];
  overallStrength: {
    title: string;
    description: string;
    evidenceId: string;
  };
  areaWorthObserving: {
    title: string;
    description: string;
    evidenceId: string;
  };
};

export type DetailedEvidenceExplanation = {
  title: string;
  eyebrow: string;
  evidenceId: string;
  sections: {
    location: { label: string; value: string };
    keyFactors: { label: string; value: string };
    plainMeaning: { label: string; value: string };
    supportingOrTension: { label: string; value: string };
    selfObservation: { label: string; value: string };
  };
};

function getMajorStarInsights(starId: string, locale: "vi" | "en"): string {
  const norm = starId.replace("ziwei.star.", "");
  const insights: Record<string, { vi: string; en: string }> = {
    ziwei: {
      vi: "tính tự chủ cao, phong thái đĩnh đạc và tinh thần tự chịu trách nhiệm",
      en: "natural autonomy, dignified poise, and strong personal accountability",
    },
    tianji: {
      vi: "tư duy linh hoạt, óc mưu lược và khả năng thích ứng với chuyển biến",
      en: "adaptive intellect, strategic agility, and keen responsiveness to change",
    },
    taiyang: {
      vi: "tính tình khẳng khái, giàu nhiệt huyết và hướng đến sự cống hiến",
      en: "magnanimous warmth, vibrant vitality, and dedication to public contribution",
    },
    wuqu: {
      vi: "tính quyết đoán, năng lực thực thi thực tế và sự nhạy bén về nguồn lực",
      en: "resolute decisiveness, practical execution, and acute resourcefulness",
    },
    tiantong: {
      vi: "tính hòa ái, khả năng dung hòa và xu hướng tìm kiếm sự an yên",
      en: "gentle affability, diplomatic ease, and a natural appreciation for harmony",
    },
    lianzhen: {
      vi: "tính nguyên tắc, lòng kiên định và ý chí vươn lên mạnh mẽ",
      en: "principled conviction, steadfast determination, and ambitious drive",
    },
    tianfu: {
      vi: "bản tính chu toàn, tầm nhìn bao quát và năng lực tích lũy ổn định",
      en: "circumspect prudence, broad perspective, and steady capacity for accumulation",
    },
    taiyin: {
      vi: "nội tâm sâu sắc, khả năng lắng nghe tinh tế và sự điềm đạm bền bỉ",
      en: "profound inner sensitivity, nuanced listening, and enduring composure",
    },
    tanlang: {
      vi: "năng lực giao tế rộng mở, ham học hỏi và khao khát trải nghiệm đa dạng",
      en: "wide social versatility, dynamic curiosity, and passion for diverse experiences",
    },
    jumen: {
      vi: "năng lực phân tích cặn kẽ, tư duy phản biện và khả năng diễn đạt khúc chiết",
      en: "probing analytical acumen, critical depth, and articulated expression",
    },
    tianxiang: {
      vi: "tác phong chuẩn mực, tinh thần trợ lực tin cậy và sự công tâm",
      en: "conscientious reliability, supportive stewardship, and measured fairness",
    },
    tianliang: {
      vi: "tấm lòng nhân hậu, tinh thần bảo trợ và xu hướng hành xử chững chạc",
      en: "generous benevolence, protective mentorship, and mature wisdom",
    },
    qisha: {
      vi: "bản lĩnh độc lập, tinh thần dám dấn thân và sự dứt khoát trước thử thách",
      en: "independent fortitude, adventurous courage, and decisive action under challenge",
    },
    pojun: {
      vi: "tinh thần tiên phong, sẵn sàng đổi mới và bản lĩnh khai phá con đường riêng",
      en: "pioneering drive, transformative boldness, and resilience to forge new paths",
    },
  };

  return (
    insights[norm]?.[locale] ??
    (locale === "vi"
      ? "sự kết hợp đa diện giữa các yếu tố cát diệu trên lá số"
      : "a multifaceted blend of positive chart influences")
  );
}

function getBodyPlacementDescription(bodyPalaceId: string, locale: "vi" | "en"): string {
  const norm = bodyPalaceId.replace("ziwei.palace.", "");
  const map: Record<string, { vi: string; en: string }> = {
    life: {
      vi: "Thân đồng cung Mệnh: suy nghĩ và hành động thường có tính nhất quán, xu hướng tự lực kiến tạo con đường riêng.",
      en: "Body conjoins Life: consistent alignment between values and actions, with a self-reliant orientation.",
    },
    career: {
      vi: "Thân cư Quan Lộc: dồn nhiều tâm huyết cho sự nghiệp, tìm thấy sự khẳng định bản thân rõ nét qua công việc.",
      en: "Body in Career: deep commitment to professional contribution, finding purpose through vocational excellence.",
    },
    wealth: {
      vi: "Thân cư Tài Bạch: chú trọng nền tảng kinh tế tự chủ, thực tế trong việc gây dựng và quản lý của cải.",
      en: "Body in Wealth: practical focus on financial independence, tangible stewardship, and long-term security.",
    },
    travel: {
      vi: "Thân cư Thiên Di: năng lực thường phát huy rõ rệt khi có cơ hội giao lưu, di chuyển và mở rộng môi trường sống.",
      en: "Body in Travel: potential flourishes outside familiar boundaries, through outward mobility and broader horizons.",
    },
    fortune: {
      vi: "Thân cư Phúc Đức: đề cao sự thanh thản nội tâm, quan tâm sâu sắc đến đời sống tinh thần và đạo lý gia đình.",
      en: "Body in Fortune: prioritizes inner peace, psychological balance, and thoughtful spiritual grounding.",
    },
    spouse: {
      vi: "Thân cư Phu Thê: coi trọng sự hòa hợp lứa đôi, gia đình và người phối ngẫu là điểm tựa cảm xúc quan trọng.",
      en: "Body in Spouse: places central value on partnership harmony, shared journey, and emotional companionship.",
    },
  };

  return (
    map[norm]?.[locale] ??
    (locale === "vi"
      ? "Điểm tựa hành động đặt tại cung vị tương ứng, tạo nên trọng tâm phấn đấu dài hạn."
      : "The action pivot aligns with the designated palace, anchoring long-term focus.")
  );
}

export function buildFreeInsights(
  chart: NormalizedZiweiChartV1,
  locale: ZiweiPresentationLocale,
  displayName?: string,
): FreeInsightsResult {
  const presentation = ziweiPresentation(locale);
  const lifePalace = chart.palaces.find((p) => p.id === chart.soulPalaceId);
  const bodyPalace = chart.palaces.find((p) => p.id === chart.bodyPalaceId);
  const lifeBranchName = presentation.branch(lifePalace?.earthlyBranchId ?? "");

  // 1. Life Palace (Cung Mệnh)
  const lifeMajorStars = (lifePalace?.stars ?? []).filter((s) => s.category === "major");
  const subjectName = displayName?.trim() ? displayName.trim() : (locale === "vi" ? "bạn" : "you");

  let lifeStarsText: string;
  let lifeDescription: string;

  if (lifeMajorStars.length === 0) {
    lifeStarsText =
      (lifePalace?.stars ?? []).length > 0
        ? (lifePalace?.stars ?? []).slice(0, 3).map((s) => presentation.star(s.id)).join(", ")
        : (locale === "vi" ? "Cung Mệnh vô chính diệu" : "No major stars (vô chính diệu)");

    lifeDescription =
      locale === "vi"
        ? `Cung Mệnh tại ${lifeBranchName} thuộc dạng vô chính diệu (không có chính tinh tọa thủ). Khi đó, phong thái của ${subjectName} thường thiên về tính linh hoạt, thích ứng nhạy bén với hoàn cảnh và chịu ảnh hưởng trực tiếp từ các cung chiếu hội.`
        : `The Life Palace at ${lifeBranchName} has no major stars (vô chính diệu). In this configuration, ${subjectName}'s disposition leans toward adaptability, responsiveness to environment, and alignment with aspects from surrounding houses.`;
  } else {
    lifeStarsText = lifeMajorStars
      .map((s) => `${presentation.star(s.id)} (${presentation.brightness(s.brightness)})`)
      .join(", ");

    const primaryStar = lifeMajorStars[0]!.id;
    const starInsight = getMajorStarInsights(primaryStar, locale);

    lifeDescription =
      locale === "vi"
        ? `Tọa thủ tại ${lifeBranchName} với ${lifeStarsText}, tạo nền tảng giúp ${subjectName} phát huy ${starInsight} khi có môi trường phù hợp.`
        : `Situated at ${lifeBranchName} with ${lifeStarsText}, offering ${subjectName} a foundational orientation toward ${starInsight} in supportive contexts.`;
  }

  const lifeItem: FreeInsightItem = {
    id: "life-palace",
    evidenceId: "ziwei.identity.life-palace",
    numeral: "01",
    title: locale === "vi" ? "Khí chất & Bản mệnh cốt lõi" : "Core Identity & Demeanor",
    tagline: locale === "vi" ? "Cung Mệnh" : "Life Palace",
    description: lifeDescription,
    starsSummary: lifeStarsText,
    locationSummary: `${presentation.palace(chart.soulPalaceId)} (${lifeBranchName})`,
  };

  // 2. Body Palace (Cung Thân)
  const bodyPalaceName = presentation.palace(chart.bodyPalaceId);
  const bodyBranchName = presentation.branch(bodyPalace?.earthlyBranchId ?? "");
  const bodyDescription =
    `${getBodyPlacementDescription(chart.bodyPalaceId, locale)} (${bodyPalaceName} tại ${bodyBranchName}).`;

  const bodyItem: FreeInsightItem = {
    id: "body-palace",
    evidenceId: "ziwei.identity.body-palace",
    numeral: "02",
    title: locale === "vi" ? "Điểm tựa & Xu hướng hành động" : "Action Focus & Anchor",
    tagline: locale === "vi" ? "Cung Thân" : "Body Palace",
    description: bodyDescription,
    starsSummary: bodyPalace?.stars?.slice(0, 3).map((s) => presentation.star(s.id)).join(", ") || presentation.chrome.noStars,
    locationSummary: `${bodyPalaceName} (${bodyBranchName})`,
  };

  // 3. Transformations (Tứ Hóa)
  const locStar = chart.transformations.find((t) => t.id === "ziwei.transformation.prosperity");
  const quyenStar = chart.transformations.find((t) => t.id === "ziwei.transformation.power");
  const khoaStar = chart.transformations.find((t) => t.id === "ziwei.transformation.fame");
  const kyStar = chart.transformations.find((t) => t.id === "ziwei.transformation.obstacle");

  const favorableList: string[] = [];
  if (locStar) favorableList.push(`${presentation.star(locStar.starId)} đi cùng ${presentation.transformation("ziwei.transformation.prosperity")}`);
  if (quyenStar) favorableList.push(`${presentation.star(quyenStar.starId)} đi cùng ${presentation.transformation("ziwei.transformation.power")}`);
  if (khoaStar) favorableList.push(`${presentation.star(khoaStar.starId)} đi cùng ${presentation.transformation("ziwei.transformation.fame")}`);

  let transDescription = "";
  if (locale === "vi") {
    const favorableProse = favorableList.length > 0 ? `Động lực tích cực hội tụ qua ${favorableList.join(", ")}. ` : "";
    const kyProse = kyStar
      ? `Sao ${presentation.star(kyStar.starId)} Hóa Kỵ nhắc nhở nên giữ tâm thế cẩn trọng, suy nghĩ thông suốt và kiên nhẫn trong các quyết định quan trọng.`
      : "Bốn luồng hóa khí phân bổ điều hòa giúp giữ thế cân bằng giữa chí hướng và hành động thực tế.";
    transDescription = `${favorableProse}${kyProse}`;
  } else {
    const favorableProse = favorableList.length > 0 ? `Positive momentum centers around ${favorableList.join(", ")}. ` : "";
    const kyProse = kyStar
      ? `Sao ${presentation.star(kyStar.starId)} Hóa Kỵ highlights areas benefiting from composed reflection, patience, and deliberate execution.`
      : "The four transformations maintain a balanced dynamic between aspiration and action.";
    transDescription = `${favorableProse}${kyProse}`;
  }

  const transItem: FreeInsightItem = {
    id: "transformations",
    evidenceId: "ziwei.identity.transformations",
    numeral: "03",
    title: locale === "vi" ? "Cơ hội phát triển & Điểm cần tiết chế" : "Growth Levers & Restraint",
    tagline: locale === "vi" ? "Tứ Hóa bản mệnh" : "Four Transformations",
    description: transDescription,
    starsSummary: chart.transformations.map((t) => `${presentation.star(t.starId)} · ${presentation.transformation(t.id)}`).join(", "),
    locationSummary: locale === "vi" ? "Phân bố trên 12 cung" : "Distributed across palaces",
  };

  // Signals (conditional, strictly fact-bound without presumptuous traits)
  const overallStrengthDescription =
    lifeMajorStars.length > 0
      ? (locale === "vi"
          ? `Trục Mệnh tại ${lifeBranchName} (${lifeMajorStars.map((s) => presentation.star(s.id)).join(", ")}) phối hợp cùng ${presentation.palace(chart.bodyPalaceId)} là căn cứ để quan sát và đối chiếu khuynh hướng tự nhiên trong hành vi và lựa chọn thực tế.`
          : `The Life axis at ${lifeBranchName} (${lifeMajorStars.map((s) => presentation.star(s.id)).join(", ")}) combined with ${presentation.palace(chart.bodyPalaceId)} serves as a factual basis to observe and cross-reference natural tendencies in practical choices.`)
      : (locale === "vi"
          ? `Trục Mệnh tại ${lifeBranchName} vô chính diệu (không có chính tinh) phối hợp cùng ${presentation.palace(chart.bodyPalaceId)}, cần đọc cùng các sao ở tam phương tứ chính như một căn cứ để đối chiếu khuynh hướng thích ứng.`
          : `The Life axis at ${lifeBranchName} without major stars (vô chính diệu) combined with ${presentation.palace(chart.bodyPalaceId)} should be read alongside trine and opposite houses as a factual basis to observe adaptive tendencies.`);

  const overallStrength = {
    title: locale === "vi" ? "Thế mạnh bản mệnh" : "Core Strength",
    description: overallStrengthDescription,
    evidenceId: "ziwei.identity.life-palace",
  };

  const areaWorthObservingDescription =
    locale === "vi"
      ? (kyStar
          ? `Lưu tâm sao ${presentation.star(kyStar.starId)} Hóa Kỵ: nên giữ sự bình tĩnh, cẩn trọng và linh hoạt khi gặp việc chưa như ý.`
          : "Chú ý duy trì nhịp độ làm việc điều độ, cân bằng giữa nỗ lực phát triển bên ngoài và sự thanh thản trong nội tâm.")
      : (kyStar
          ? `Observe ${presentation.star(kyStar.starId)} Hóa Kỵ: maintain composure, patience, and adaptability when facing unexpected turns.`
          : "Maintain a measured pace, balancing outward development with inner equilibrium.");

  const areaWorthObserving = {
    title: locale === "vi" ? "Điểm cần điềm tĩnh quan sát" : "Area to Observe Mindfully",
    description: areaWorthObservingDescription,
    evidenceId: kyStar ? "ziwei.identity.transformations" : "ziwei.identity.body-palace",
  };

  return {
    items: [lifeItem, bodyItem, transItem],
    overallStrength,
    areaWorthObserving,
  };
}

export function getDetailedEvidenceExplanation(
  evidenceId: string,
  chart: NormalizedZiweiChartV1,
  locale: ZiweiPresentationLocale,
): DetailedEvidenceExplanation {
  const presentation = ziweiPresentation(locale);
  const lifePalace = chart.palaces.find((p) => p.id === chart.soulPalaceId);
  const bodyPalace = chart.palaces.find((p) => p.id === chart.bodyPalaceId);

  if (evidenceId.includes("body-palace")) {
    const palaceName = presentation.palace(chart.bodyPalaceId);
    const branchName = presentation.branch(bodyPalace?.earthlyBranchId ?? "");
    const relations = getPalaceRelations(chart.bodyPalaceId, chart.palaces);
    const oppositeName = relations.oppositeId ? presentation.palace(relations.oppositeId) : "";
    const trineNames = relations.trineIds.map((id) => presentation.palace(id)).join(", ");

    return {
      title: locale === "vi" ? "Căn cứ Cung Thân" : "Body Palace Evidence",
      eyebrow: locale === "vi" ? "Căn cứ lá số" : "Interpretation evidence",
      evidenceId,
      sections: {
        location: {
          label: locale === "vi" ? "Vị trí trên lá số" : "Position on Chart",
          value: `${palaceName} tọa tại chi ${branchName} · Xung đối với ${oppositeName} · Tam hợp cùng ${trineNames}`,
        },
        keyFactors: {
          label: locale === "vi" ? "Yếu tố chính" : "Key Factors",
          value: bodyPalace?.stars.slice(0, 4).map((s) => presentation.star(s.id)).join(", ") || presentation.chrome.noStars,
        },
        plainMeaning: {
          label: locale === "vi" ? "Ý nghĩa dễ hiểu" : "Plain Meaning",
          value: getBodyPlacementDescription(chart.bodyPalaceId, locale),
        },
        supportingOrTension: {
          label: locale === "vi" ? "Yếu tố hỗ trợ hoặc tạo độ căng" : "Supporting or Tension Factors",
          value:
            locale === "vi"
              ? "Cung Thân phản ánh phương thức hành động thực tế và thói quen tích lũy qua thời gian, chịu sự tương tác từ các cung tam chiếu và xung chiếu."
              : "The Body Palace reflects practical action and accumulated habits, responding directly to trine and opposite influences.",
        },
        selfObservation: {
          label: locale === "vi" ? "Điều có thể tự quan sát" : "Points for Self-Reflection",
          value:
            locale === "vi"
              ? "Quan sát xem bạn có xu hướng tìm kiếm cảm giác an tâm và nỗ lực nhiều nhất khi tập trung vào lĩnh vực cuộc sống này hay không."
              : "Notice whether you feel most grounded and purposeful when focusing your sustained efforts in this life domain.",
        },
      },
    };
  }

  if (evidenceId.includes("transformations")) {
    const transText = chart.transformations
      .map((t) => `${presentation.star(t.starId)} (${presentation.transformation(t.id)})`)
      .join("; ");
    const ky = chart.transformations.find((t) => t.id === "ziwei.transformation.obstacle");

    return {
      title: locale === "vi" ? "Căn cứ Tứ Hóa Bản Mệnh" : "Four Transformations Evidence",
      eyebrow: locale === "vi" ? "Căn cứ lá số" : "Interpretation evidence",
      evidenceId,
      sections: {
        location: {
          label: locale === "vi" ? "Vị trí trên lá số" : "Position on Chart",
          value: locale === "vi" ? "Phân bổ theo thiên can năm sinh, gắn liền với các tinh đẩu trên 12 cung" : "Distributed across palaces according to birth stem",
        },
        keyFactors: {
          label: locale === "vi" ? "Yếu tố chính" : "Key Factors",
          value: transText,
        },
        plainMeaning: {
          label: locale === "vi" ? "Ý nghĩa dễ hiểu" : "Plain Meaning",
          value:
            locale === "vi"
              ? "Tứ Hóa gồm Hóa Lộc (cơ hội, sự thuận lợi), Hóa Quyền (động lực, quyền thế), Hóa Khoa (danh tiếng, sự thấu hiểu) và Hóa Kỵ (thử thách cần cẩn trọng và kiên tâm)."
              : "The Four Transformations represent Prosperity (flow), Power (initiative), Fame (reputation), and Obstacle (focus areas calling for patience).",
        },
        supportingOrTension: {
          label: locale === "vi" ? "Yếu tố hỗ trợ hoặc tạo độ căng" : "Supporting or Tension Factors",
          value:
            locale === "vi"
              ? (ky
                  ? `Hóa Lộc và Hóa Quyền tạo động lực tích cực; sao ${presentation.star(ky.starId)} Hóa Kỵ là điểm cần rèn luyện thêm tính kiên tâm và chu toàn.`
                  : "Bộ Tứ Hóa phối chiếu tạo thế tương hỗ nhịp nhàng giữa chí hướng và hành động thực tế.")
              : (ky
                  ? `Prosperity and Power provide constructive momentum; ${presentation.star(ky.starId)} with Hóa Kỵ highlights where mindful patience and thoroughness are most beneficial.`
                  : "The transformations interact harmoniously between ambition and execution."),
        },
        selfObservation: {
          label: locale === "vi" ? "Điều có thể tự quan sát" : "Points for Self-Reflection",
          value:
            locale === "vi"
              ? "Chiêm nghiệm xem khi đối diện với các trở ngại, nếu bình tĩnh phân tích và điều chỉnh từng bước thì thử thách có trở thành kinh nghiệm quý hay không."
              : "Reflect on how addressing friction with steady patience often turns challenges into valuable life competencies.",
        },
      },
    };
  }

  // Default: life-palace
  const branchName = presentation.branch(lifePalace?.earthlyBranchId ?? "");
  const lifeMajorStars = (lifePalace?.stars ?? []).filter((s) => s.category === "major");
  const starsList =
    lifeMajorStars.length > 0
      ? lifeMajorStars.map((s) => `${presentation.star(s.id)} (${presentation.brightness(s.brightness)})`).join(", ")
      : (lifePalace?.stars ?? []).length > 0
        ? (lifePalace?.stars ?? []).slice(0, 3).map((s) => presentation.star(s.id)).join(", ")
        : (locale === "vi" ? "Cung Mệnh vô chính diệu" : "No major stars");

  const primaryStar = lifeMajorStars[0]?.id;
  const relations = getPalaceRelations(chart.soulPalaceId, chart.palaces);
  const oppositeName = relations.oppositeId ? presentation.palace(relations.oppositeId) : "";
  const trineNames = relations.trineIds.map((id) => presentation.palace(id)).join(", ");

  const plainMeaningText = primaryStar
    ? (locale === "vi"
        ? `Cung Mệnh đại diện cho hạt nhân tính cách và khí chất nền tảng: ${getMajorStarInsights(primaryStar, "vi")}.`
        : `The Life Palace represents the core temperament and disposition: ${getMajorStarInsights(primaryStar, "en")}.`)
    : (locale === "vi"
        ? "Cung Mệnh vô chính diệu (không có chính tinh tọa thủ): tính cách thường có tính thích ứng cao, uyển chuyển và dễ cộng hưởng với môi trường xung quanh cũng như các cung chiếu hội."
        : "The Life Palace contains no major stars (vô chính diệu): temperament is characterized by high adaptability and responsiveness to external and trine influences.");

  return {
    title: locale === "vi" ? "Căn cứ Cung Mệnh" : "Life Palace Evidence",
    eyebrow: locale === "vi" ? "Căn cứ lá số" : "Interpretation evidence",
    evidenceId,
    sections: {
      location: {
        label: locale === "vi" ? "Vị trí trên lá số" : "Position on Chart",
        value: `Cung Mệnh tại ${branchName} · Đối cung là ${oppositeName} · Tam hợp hội chiếu cùng ${trineNames}`,
      },
      keyFactors: {
        label: locale === "vi" ? "Yếu tố chính" : "Key Factors",
        value: starsList,
      },
      plainMeaning: {
        label: locale === "vi" ? "Ý nghĩa dễ hiểu" : "Plain Meaning",
        value: plainMeaningText,
      },
      supportingOrTension: {
        label: locale === "vi" ? "Yếu tố hỗ trợ hoặc tạo độ căng" : "Supporting or Tension Factors",
        value:
          locale === "vi"
            ? "Các sao tại Cung Mệnh phối hợp cùng thế tam phương tứ chính (Quan Lộc, Tài Bạch, Thiên Di) định hình phong cách phản ứng và tiềm năng phát triển."
            : "Stars in the Life Palace, harmonized by trine and opposite houses, shape personal style and growth potential under pressure.",
      },
      selfObservation: {
        label: locale === "vi" ? "Điều có thể tự quan sát" : "Points for Self-Reflection",
        value:
          locale === "vi"
            ? "Tự nhìn nhận lại những phản ứng tự nhiên nhất của bản thân khi đứng trước một quyết định lớn trong đời sống."
            : "Reflect on your most instinctive responses when facing major crossroads in daily life.",
      },
    },
  };
}
