export const CANONICAL_BRANCH_SEQUENCE = [
  "ziwei.branch.rat",     // 0: Tý
  "ziwei.branch.ox",      // 1: Sửu
  "ziwei.branch.tiger",   // 2: Dần
  "ziwei.branch.rabbit",  // 3: Mão
  "ziwei.branch.dragon",  // 4: Thìn
  "ziwei.branch.snake",   // 5: Tỵ
  "ziwei.branch.horse",   // 6: Ngọ
  "ziwei.branch.goat",    // 7: Mùi
  "ziwei.branch.monkey",  // 8: Thân
  "ziwei.branch.rooster", // 9: Dậu
  "ziwei.branch.dog",     // 10: Tuất
  "ziwei.branch.pig",     // 11: Hợi
] as const;

export type CanonicalBranch = (typeof CANONICAL_BRANCH_SEQUENCE)[number];

export const BRANCH_GRID_POSITIONS: Record<
  string,
  { row: number; col: number; gridArea: string }
> = {
  "ziwei.branch.snake":   { row: 1, col: 1, gridArea: "1 / 1 / 2 / 2" },
  "ziwei.branch.horse":   { row: 1, col: 2, gridArea: "1 / 2 / 2 / 3" },
  "ziwei.branch.goat":    { row: 1, col: 3, gridArea: "1 / 3 / 2 / 4" },
  "ziwei.branch.monkey":  { row: 1, col: 4, gridArea: "1 / 4 / 2 / 5" },
  "ziwei.branch.rooster": { row: 2, col: 4, gridArea: "2 / 4 / 3 / 5" },
  "ziwei.branch.dog":     { row: 3, col: 4, gridArea: "3 / 4 / 4 / 5" },
  "ziwei.branch.pig":     { row: 4, col: 4, gridArea: "4 / 4 / 5 / 5" },
  "ziwei.branch.rat":     { row: 4, col: 3, gridArea: "4 / 3 / 5 / 4" },
  "ziwei.branch.ox":      { row: 4, col: 2, gridArea: "4 / 2 / 5 / 3" },
  "ziwei.branch.tiger":   { row: 4, col: 1, gridArea: "4 / 1 / 5 / 2" },
  "ziwei.branch.rabbit":  { row: 3, col: 1, gridArea: "3 / 1 / 4 / 2" },
  "ziwei.branch.dragon":  { row: 2, col: 1, gridArea: "2 / 1 / 3 / 2" },
};

export type PalaceRelationType = "selected" | "opposite" | "trine" | "none";

export type PalaceRelations = {
  selectedId: string;
  selectedBranchId: string;
  oppositeId?: string;
  oppositeBranchId?: string;
  trineIds: string[];
  trineBranchIds: string[];
  relatedPalaceIds: Set<string>;
  getRelation(palaceId: string): PalaceRelationType;
};

export function getBranchIndex(branchId: string): number {
  const norm = branchId.startsWith("ziwei.branch.") ? branchId : `ziwei.branch.${branchId}`;
  return CANONICAL_BRANCH_SEQUENCE.indexOf(norm as CanonicalBranch);
}

export function getOppositeBranchId(branchId: string): string {
  const idx = getBranchIndex(branchId);
  if (idx === -1) return "";
  return CANONICAL_BRANCH_SEQUENCE[(idx + 6) % 12] ?? "";
}

export function getTrineBranchIds(branchId: string): [string, string] {
  const idx = getBranchIndex(branchId);
  if (idx === -1) return ["", ""];
  return [
    CANONICAL_BRANCH_SEQUENCE[(idx + 4) % 12] ?? "",
    CANONICAL_BRANCH_SEQUENCE[(idx + 8) % 12] ?? "",
  ];
}

export function getPalaceGridPosition(earthlyBranchId: string) {
  const norm = earthlyBranchId.startsWith("ziwei.branch.")
    ? earthlyBranchId
    : `ziwei.branch.${earthlyBranchId}`;
  return (
    BRANCH_GRID_POSITIONS[norm] ?? {
      row: 1,
      col: 1,
      gridArea: "1 / 1 / 2 / 2",
    }
  );
}

export function getPalaceRelations(
  selectedPalaceId: string,
  palaces: Array<{ id: string; earthlyBranchId: string }>,
): PalaceRelations {
  const selectedPalace = palaces.find((p) => p.id === selectedPalaceId);
  if (!selectedPalace) {
    return {
      selectedId: selectedPalaceId,
      selectedBranchId: "",
      trineIds: [],
      trineBranchIds: [],
      relatedPalaceIds: new Set([selectedPalaceId]),
      getRelation: (id: string) => (id === selectedPalaceId ? "selected" : "none"),
    };
  }

  const selectedBranchId = selectedPalace.earthlyBranchId;
  const oppositeBranchId = getOppositeBranchId(selectedBranchId);
  const [trine1BranchId, trine2BranchId] = getTrineBranchIds(selectedBranchId);

  const oppositePalace = palaces.find((p) => p.earthlyBranchId === oppositeBranchId);
  const trine1Palace = palaces.find((p) => p.earthlyBranchId === trine1BranchId);
  const trine2Palace = palaces.find((p) => p.earthlyBranchId === trine2BranchId);

  const trineIds = [trine1Palace?.id, trine2Palace?.id].filter(
    (id): id is string => Boolean(id),
  );
  const trineBranchIds = [trine1BranchId, trine2BranchId].filter(Boolean);

  const relatedPalaceIds = new Set<string>([
    selectedPalaceId,
    ...(oppositePalace ? [oppositePalace.id] : []),
    ...trineIds,
  ]);

  return {
    selectedId: selectedPalaceId,
    selectedBranchId,
    oppositeId: oppositePalace?.id,
    oppositeBranchId,
    trineIds,
    trineBranchIds,
    relatedPalaceIds,
    getRelation(palaceId: string): PalaceRelationType {
      if (palaceId === selectedPalaceId) return "selected";
      if (palaceId === oppositePalace?.id) return "opposite";
      if (trineIds.includes(palaceId)) return "trine";
      return "none";
    },
  };
}

export const PALACE_LIFE_AREAS: Record<
  string,
  { vi: { name: string; domain: string }; en: { name: string; domain: string } }
> = {
  "ziwei.palace.life": {
    vi: {
      name: "Cung Mệnh",
      domain: "Bản mệnh, tính cách nền tảng, phong thái, tiềm năng bẩm sinh và định hướng cuộc đời.",
    },
    en: {
      name: "Life Palace",
      domain: "Core self, natural disposition, fundamental character, innate potential, and life orientation.",
    },
  },
  "ziwei.palace.siblings": {
    vi: {
      name: "Cung Huynh Đệ",
      domain: "Mối quan hệ với anh chị em, bạn hữu thân thiết, sự hòa hợp và mức độ hỗ trợ trong đời sống.",
    },
    en: {
      name: "Siblings Palace",
      domain: "Relationships with siblings and close peers, mutual harmony, and everyday collaborative support.",
    },
  },
  "ziwei.palace.spouse": {
    vi: {
      name: "Cung Phu Thê",
      domain: "Quan điểm tình cảm, đặc điểm người phối ngẫu, xu hướng tương tác và sự gắn kết trong hôn nhân.",
    },
    en: {
      name: "Spouse Palace",
      domain: "Relational values, spouse disposition, emotional dynamics, and partnership synergy.",
    },
  },
  "ziwei.palace.children": {
    vi: {
      name: "Cung Tử Tức",
      domain: "Mối duyên với con cái, thế hệ kế cận, thiên hướng giáo dục và sự gắn kết gia đình.",
    },
    en: {
      name: "Children Palace",
      domain: "Connection with children, younger generations, nurturing orientation, and domestic legacy.",
    },
  },
  "ziwei.palace.wealth": {
    vi: {
      name: "Cung Tài Bạch",
      domain: "Dòng tiền, phương thức tạo lập và quản lý tài chính, thái độ đối với của cải vật chất.",
    },
    en: {
      name: "Wealth Palace",
      domain: "Cash flow, wealth generation and stewardship, financial patterns, and material values.",
    },
  },
  "ziwei.palace.health": {
    vi: {
      name: "Cung Tật Ách",
      domain: "Thể chất nền tảng, các điểm cần lưu tâm chăm sóc sức khỏe và phản ứng của cơ thể trước áp lực.",
    },
    en: {
      name: "Health Palace",
      domain: "Physical constitution, health awareness, bodily resilience, and natural stress responses.",
    },
  },
  "ziwei.palace.travel": {
    vi: {
      name: "Cung Thiên Di",
      domain: "Môi trường bên ngoài, khả năng thích ứng khi xa nhà, giao tế xã hội và cơ hội đối ngoại.",
    },
    en: {
      name: "Travel Palace",
      domain: "External environment, adaptability away from home, outward interactions, and public presence.",
    },
  },
  "ziwei.palace.friends": {
    vi: {
      name: "Cung Nô Bộc",
      domain: "Mạng lưới bạn bè, đồng sự, cấp dưới và các mối quan hệ xã hội mở rộng.",
    },
    en: {
      name: "Friends Palace",
      domain: "Peer network, colleagues, associates, collaborative dynamics, and wider social circles.",
    },
  },
  "ziwei.palace.career": {
    vi: {
      name: "Cung Quan Lộc",
      domain: "Sự nghiệp, phong cách làm việc, môi trường phát triển chuyên môn và vị thế xã hội.",
    },
    en: {
      name: "Career Palace",
      domain: "Vocation, professional approach, career momentum, and contribution in the public realm.",
    },
  },
  "ziwei.palace.property": {
    vi: {
      name: "Cung Điền Trạch",
      domain: "Không gian sống, nhà đất, tài sản tích lũy lâu dài và sự an cư của gia đạo.",
    },
    en: {
      name: "Property Palace",
      domain: "Living environment, real estate, domestic stability, and long-term asset accumulation.",
    },
  },
  "ziwei.palace.fortune": {
    vi: {
      name: "Cung Phúc Đức",
      domain: "Đời sống nội tâm, phước ấm tổ tiên, năng lực tự tìm thấy bình an và niềm vui tinh thần.",
    },
    en: {
      name: "Fortune Palace",
      domain: "Spiritual mindset, inner peace, psychological balance, and ancestral blessings.",
    },
  },
  "ziwei.palace.parents": {
    vi: {
      name: "Cung Phụ Mẫu",
      domain: "Gắn kết với cha mẹ, sự thừa hưởng từ gia đình, ân nghĩa và sự chỉ dạy từ thế hệ trước.",
    },
    en: {
      name: "Parents Palace",
      domain: "Bond with parents, family heritage, respect for elders, and foundational early guidance.",
    },
  },
};

export function getPalaceLifeArea(palaceId: string, locale: "vi" | "en") {
  const norm = palaceId.startsWith("ziwei.palace.")
    ? palaceId
    : `ziwei.palace.${palaceId}`;
  const info = PALACE_LIFE_AREAS[norm] ?? {
    vi: { name: "Cung Tử Vi", domain: "Lĩnh vực đời sống trên lá số Tử Vi." },
    en: { name: "Zi Wei Palace", domain: "Life dimension in the Zi Wei chart." },
  };
  return info[locale];
}
