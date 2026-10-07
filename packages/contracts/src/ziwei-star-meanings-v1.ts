// Versioned product meaning catalog, extracted unchanged from the existing free insight helper.
export const ZIWEI_MAJOR_STAR_MEANING_VERSION = "free-insight-major-star-meanings-v1";
const meanings: Readonly<Record<string, {
    vi: string;
    en: string;
}>> = {
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
export function ziweiMajorStarMeaning(locale: "vi" | "en", starId: string): string | null {
    return meanings[starId.replace(/^ziwei\.star\./u, "")]?.[locale] ?? null;
}
