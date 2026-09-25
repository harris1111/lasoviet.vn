/**
 * Numerology Engine (Thần Số Học Pythagoras)
 * 
 * Computes:
 * - Số chủ đạo (Life Path Number): Reduced sum of birth date digits, preserving Master Numbers 11, 22, 33.
 * - Số sứ mệnh (Destiny Number): Reduced sum of all letters in full name.
 * - Số linh hồn (Soul Urge / Heart's Desire): Reduced sum of vowels (A, E, I, O, U, Y).
 * - Số nhân cách (Personality Number): Reduced sum of consonants.
 * - Biểu đồ ngày sinh (3x3 Birth Chart Grid): counts of digits 1-9 in layout [3,6,9], [2,5,8], [1,4,7].
 */

export type NumerologyResult = {
  lifePathNumber: number;
  isMasterLifePath: boolean;
  lifePathBaseSum: number;
  lifePathDisplay: string;
  lifePathTitle: string;
  lifePathMeaning: string;
  destinyNumber: number;
  destinyMeaning: string;
  soulNumber: number;
  soulMeaning: string;
  personalityNumber: number;
  personalityMeaning: string;
  gridCounts: Record<number, number>;
  gridOrder: number[];
  emptyNumbers: number[];
};

export const NUMEROLOGY_MEANINGS_VI: Record<number, { title: string; meaning: string }> = {
  1: {
    title: "Số chủ đạo 1",
    meaning: "Người mở đường: tính cách độc lập, quyết đoán, có xu hướng dẫn đầu và tự chủ trong mọi việc.",
  },
  2: {
    title: "Số chủ đạo 2",
    meaning: "Người kết nối: giàu trực giác, nhạy cảm, hòa nhã và phát huy tối đa khi hợp tác đồng hành.",
  },
  3: {
    title: "Số chủ đạo 3",
    meaning: "Người biểu đạt: tư duy sáng tạo, hoạt ngôn, năng động, mang niềm vui và nguồn cảm hứng tích cực.",
  },
  4: {
    title: "Số chủ đạo 4",
    meaning: "Người xây nền: thực tế, chắc chắn, kỷ luật, coi trọng trật tự và sự an toàn bền vững.",
  },
  5: {
    title: "Số chủ đạo 5",
    meaning: "Người tự do: yêu thích khám phá, linh hoạt thích ứng, không thích bị gò bó hay áp đặt khuôn mẫu.",
  },
  6: {
    title: "Số chủ đạo 6",
    meaning: "Người chăm lo: có tinh thần trách nhiệm cao, giàu tình yêu thương gia đình và cộng đồng.",
  },
  7: {
    title: "Số chủ đạo 7",
    meaning: "Người chiêm nghiệm: thích đào sâu bản chất, cần không gian riêng, học hỏi sâu sắc qua trải nghiệm thực tế.",
  },
  8: {
    title: "Số chủ đạo 8",
    meaning: "Người làm chủ: nhạy bén với cơ hội và tài chính, năng lực tổ chức cao, khao khát khẳng định bản thân.",
  },
  9: {
    title: "Số chủ đạo 9",
    meaning: "Người cống hiến: lý tưởng cao cả, bao dung, hướng tới cộng đồng và các giá trị nhân văn.",
  },
  11: {
    title: "Số bậc thầy 11",
    meaning: "Số bậc thầy 11: trực giác tâm linh nhạy bén, khả năng truyền cảm hứng mạnh mẽ, dễ nhạy cảm thần kinh.",
  },
  22: {
    title: "Số bậc thầy 22",
    meaning: "Số bậc thầy 22: kiến tạo việc lớn, kết hợp tầm nhìn rộng mở với khả năng thực thi kiên nhẫn và kỷ luật.",
  },
  33: {
    title: "Số bậc thầy 33",
    meaning: "Số bậc thầy 33: người thầy và người chăm lo tinh thần; hướng tới nâng đỡ và chữa lành cho xung quanh.",
  },
};

export const NUMEROLOGY_MEANINGS_EN: Record<number, { title: string; meaning: string }> = {
  1: {
    title: "Life Path 1",
    meaning: "The Pioneer: independent, decisive, innate leadership drive and proactive initiative.",
  },
  2: {
    title: "Life Path 2",
    meaning: "The Diplomat: intuitive, sensitive, cooperative, excelling in partnerships and mediation.",
  },
  3: {
    title: "Life Path 3",
    meaning: "The Communicator: expressive, creative, witty, bringing joy and inspiration.",
  },
  4: {
    title: "Life Path 4",
    meaning: "The Builder: pragmatic, disciplined, trustworthy, grounded in solid structures.",
  },
  5: {
    title: "Life Path 5",
    meaning: "The Free Spirit: adaptable, adventurous, thriving on versatility and change.",
  },
  6: {
    title: "Life Path 6",
    meaning: "The Nurturer: deeply responsible, supportive, centered around family and community harmony.",
  },
  7: {
    title: "Life Path 7",
    meaning: "The Seeker: analytical, philosophical, introspective, learning through direct experience.",
  },
  8: {
    title: "Life Path 8",
    meaning: "The Executive: authoritative, goal-oriented, mastering organization and material abundance.",
  },
  9: {
    title: "Life Path 9",
    meaning: "The Humanitarian: compassionate, idealistic, driven by global awareness and service.",
  },
  11: {
    title: "Master Number 11",
    meaning: "Master 11: heightened intuition, spiritual insight, charismatic inspirational potential.",
  },
  22: {
    title: "Master Number 22",
    meaning: "Master 22: Master Builder, translating visionary ideas into enduring practical realities.",
  },
  33: {
    title: "Master Number 33",
    meaning: "Master 33: Master Teacher, dedicated to universal compassion, guidance, and upliftment.",
  },
};

/**
 * Reduce a number to 1-9 or Master Numbers 11, 22, 33.
 */
export function reduceToSingleOrMaster(n: number): number {
  let cur = Math.abs(Math.floor(n));
  while (cur > 9 && cur !== 11 && cur !== 22 && cur !== 33) {
    cur = String(cur)
      .split("")
      .reduce((acc, digit) => acc + Number(digit), 0);
  }
  return cur;
}

/**
 * Convert Vietnamese name to uppercase Latin letters without accents.
 */
export function normalizeNameLetters(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Pythagorean letter value (A=1, B=2, ..., I=9, J=1, ...)
 */
export function getPythagoreanLetterValue(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code < 65 || code > 90) return 0;
  return ((code - 65) % 9) + 1;
}

const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

/**
 * Calculate full numerology profile from birth date (YYYY-MM-DD or YYYY/MM/DD) and full name.
 */
export function calculateNumerology(
  birthDateString: string,
  fullName: string,
  locale: "vi" | "en" = "vi",
): NumerologyResult {
  const meanings = locale === "en" ? NUMEROLOGY_MEANINGS_EN : NUMEROLOGY_MEANINGS_VI;

  // Extract digits from birth date
  const cleanDate = birthDateString.replace(/[^0-9]/g, "");
  const digits = cleanDate.split("").map(Number);
  const baseSum = digits.reduce((a, b) => a + b, 0);
  const lifePathNumber = reduceToSingleOrMaster(baseSum);
  const isMaster = lifePathNumber === 11 || lifePathNumber === 22 || lifePathNumber === 33;

  const reducedBase = isMaster
    ? String(lifePathNumber)
        .split("")
        .reduce((a, c) => a + Number(c), 0)
    : lifePathNumber;

  const lifePathDisplay = isMaster
    ? `${lifePathNumber}/${reducedBase}`
    : String(lifePathNumber);

  const lpMeta = meanings[lifePathNumber] ?? {
    title: `${locale === "en" ? "Life Path" : "Số chủ đạo"} ${lifePathNumber}`,
    meaning: "",
  };

  // Name calculation
  const letters = normalizeNameLetters(fullName);
  const letterArray = letters.split("");

  const allSum = letterArray.reduce((acc, ch) => acc + getPythagoreanLetterValue(ch), 0);
  const destinyNumber = reduceToSingleOrMaster(allSum);

  const vowelSum = letterArray
    .filter((ch) => VOWELS.has(ch))
    .reduce((acc, ch) => acc + getPythagoreanLetterValue(ch), 0);
  const soulNumber = reduceToSingleOrMaster(vowelSum);

  const consonantSum = letterArray
    .filter((ch) => !VOWELS.has(ch))
    .reduce((acc, ch) => acc + getPythagoreanLetterValue(ch), 0);
  const personalityNumber = reduceToSingleOrMaster(consonantSum);

  // 3x3 birth chart grid
  // Standard Pythagorean grid layout:
  // [3, 6, 9] (Mind plane)
  // [2, 5, 8] (Soul / Emotional plane)
  // [1, 4, 7] (Physical plane)
  const gridCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };

  for (const d of digits) {
    if (d >= 1 && d <= 9) {
      gridCounts[d] = (gridCounts[d] ?? 0) + 1;
    }
  }

  const gridOrder = [3, 6, 9, 2, 5, 8, 1, 4, 7];
  const emptyNumbers = gridOrder.filter((n) => (gridCounts[n] ?? 0) === 0);

  return {
    lifePathNumber,
    isMasterLifePath: isMaster,
    lifePathBaseSum: baseSum,
    lifePathDisplay,
    lifePathTitle: lpMeta.title,
    lifePathMeaning: lpMeta.meaning,
    destinyNumber,
    destinyMeaning: meanings[destinyNumber]?.meaning ?? "",
    soulNumber,
    soulMeaning: meanings[soulNumber]?.meaning ?? "",
    personalityNumber,
    personalityMeaning: meanings[personalityNumber]?.meaning ?? "",
    gridCounts,
    gridOrder,
    emptyNumbers,
  };
}
